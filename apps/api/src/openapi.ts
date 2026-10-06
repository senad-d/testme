import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { applyDecorators } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  ApiProperty,
  DocumentBuilder,
  type OpenAPIObject,
  type SchemaObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

import {
  type ProblemCode,
  PROBLEMS,
  problemType,
  REQUEST_ID_PATTERN,
} from './common/http/problem-details.filter.js';

// Transport syntax only. Signed values accommodate ledger deltas; individual
// endpoints must constrain signs and apply the approved OQ-11 ceiling later.
export const DECIMAL_MONEY_PATTERN = '^(0|-?[1-9][0-9]*)$';
const decimalMoneySchema = {
  type: 'string',
  pattern: DECIMAL_MONEY_PATTERN,
  description:
    'Exact canonical base-10 integer string. No numeric JSON coercion. Technical ceiling awaits OQ-11.',
} as const satisfies SchemaObject;

export function DecimalMoney(): PropertyDecorator {
  return applyDecorators(
    ApiProperty(decimalMoneySchema),
    IsString(),
    Matches(new RegExp(DECIMAL_MONEY_PATTERN)),
  );
}

export function createOpenApiDocument(application: NestFastifyApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(
    application,
    new DocumentBuilder()
      .setTitle('Mobey API')
      .setVersion('1')
      .setDescription(
        'Platform contract. Domain policies remain subject to their approved OQ decisions.',
      )
      .build(),
  );
  // Class DTOs use the global whitelist/forbidNonWhitelisted validation policy.
  // Explicit dictionary schemas retain their declared additionalProperties.
  for (const schema of Object.values(document.components?.schemas ?? {})) {
    if (
      !('$ref' in schema) &&
      schema.type === 'object' &&
      schema.additionalProperties === undefined
    ) {
      schema.additionalProperties = false;
    }
  }
  const problemSchemas: Record<string, SchemaObject> = {};

  for (const code of Object.keys(PROBLEMS) as ProblemCode[]) {
    const [status, title, detail] = PROBLEMS[code];
    problemSchemas[code] = {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'title', 'status', 'code', 'detail', 'instance', 'requestId'],
      properties: {
        type: { type: 'string', enum: [problemType(code)] },
        title: { type: 'string', enum: [title] },
        status: { type: 'integer', enum: [status] },
        code: { type: 'string', enum: [code] },
        detail: { type: 'string', enum: [detail] },
        instance: { type: 'string', pattern: `^urn:mobey:request:${REQUEST_ID_PATTERN.slice(1)}` },
        requestId: { type: 'string', pattern: REQUEST_ID_PATTERN },
      },
    };
  }

  document.components ??= {};
  document.components.schemas = {
    ...document.components.schemas,
    ...problemSchemas,
    ProblemDetails: {
      oneOf: Object.keys(problemSchemas).map((code) => ({ $ref: `#/components/schemas/${code}` })),
    },
    DecimalMoney: decimalMoneySchema,
  };

  for (const path of Object.values(document.paths)) {
    for (const method of [
      'get',
      'put',
      'post',
      'delete',
      'options',
      'head',
      'patch',
      'trace',
    ] as const) {
      const operation = path[method];
      if (operation === undefined) continue;

      operation.parameters ??= [];
      operation.parameters.push({
        in: 'header',
        name: 'X-Request-Id',
        required: false,
        description: 'Canonical lowercase UUID v4. Missing or invalid values are replaced.',
        schema: { type: 'string', pattern: REQUEST_ID_PATTERN },
      });
      operation.responses.default = {
        description:
          'Redacted RFC 9457 error. Stable domain codes are declarations, not implemented domain behavior. Retry-After is supplied by approved rate-limit policy only.',
        content: {
          'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
        },
        headers: {
          'Retry-After': {
            description:
              'Positive delay in seconds for 429 responses when supplied by approved policy (OQ-04).',
            schema: { type: 'string', pattern: '^[1-9][0-9]*$' },
          },
        },
      };
      for (const response of Object.values(operation.responses)) {
        if (response === undefined || '$ref' in response) continue;
        response.headers ??= {};
        response.headers['X-Request-Id'] = {
          required: true,
          schema: { type: 'string', pattern: REQUEST_ID_PATTERN },
        };
      }
    }
  }

  return document;
}

export const CONTRACT_PATH = fileURLToPath(
  new URL('../../../packages/shared/src/generated/api.ts', import.meta.url),
);

export async function generateContract(): Promise<string> {
  // No listener, request, database query, dotenv loading, or Swagger UI route.
  const { createApplication } = await import('./main.js');
  const application = await createApplication();
  let document: OpenAPIObject;
  try {
    document = createOpenApiDocument(application);
  } finally {
    await application.close();
  }

  const { format, resolveConfig } = await import('prettier');
  const directory = await mkdtemp(fileURLToPath(new URL('../dist/contract-', import.meta.url)));
  try {
    const input = join(directory, 'openapi.json');
    const output = join(directory, 'output');
    await writeFile(input, JSON.stringify(document));
    // Use the tool's CLI seam, not its optional SDK/plugin declaration graph.
    const cli = fileURLToPath(new URL('../bin/run.js', import.meta.resolve('@hey-api/openapi-ts')));
    await promisify(execFile)(
      process.execPath,
      [
        cli,
        '--input',
        input,
        '--output',
        output,
        '--plugins',
        '@hey-api/typescript',
        '--silent',
        '--no-log-file',
      ],
      { timeout: 30_000 },
    );
    // Types alone cannot express patterns, headers, or every OpenAPI constraint.
    // Include the full schema digest so those changes also invalidate stale output.
    const digest = createHash('sha256').update(JSON.stringify(document)).digest('hex');
    const generated = await readFile(join(output, 'types.gen.ts'), 'utf8');
    return await format(`// OpenAPI SHA-256: ${digest}\n${generated}`, {
      ...(await resolveConfig(CONTRACT_PATH)),
      parser: 'typescript',
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function checkContract(path = CONTRACT_PATH): Promise<void> {
  const expected = await generateContract();
  if ((await readFile(path, 'utf8')) !== expected) {
    throw new Error(
      'Generated API contract is stale. Run pnpm --filter @mobey/api contract:generate.',
    );
  }
}

async function run(): Promise<void> {
  if (process.argv[2] === '--check' && process.argv.length === 3) {
    await checkContract();
  } else if (process.argv[2] === '--write' && process.argv.length === 3) {
    const output = await generateContract();
    await mkdir(dirname(CONTRACT_PATH), { recursive: true });
    await writeFile(CONTRACT_PATH, output);
  } else {
    throw new Error('Expected --check or --write.');
  }
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  void run().catch(() => {
    process.stderr.write(
      'API contract generation/check failed. Run pnpm --filter @mobey/api contract:generate and review the diff.\n',
    );
    process.exitCode = 1;
  });
}

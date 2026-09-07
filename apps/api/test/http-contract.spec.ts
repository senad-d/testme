import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { Body, Controller, Get, HttpException, Param, Post, Query } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { Ajv } from 'ajv';
import type { FastifyInstance } from 'fastify';
import ts from 'typescript';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  ProblemDetailsException,
  type ProblemCode,
  PROBLEMS,
  REQUEST_ID_PATTERN,
} from '../src/common/http/problem-details.filter.js';
import { configureHttp, createApplication } from '../src/main.js';
import {
  checkContract,
  CONTRACT_PATH,
  createOpenApiDocument,
  DecimalMoney,
  generateContract,
} from '../src/openapi.js';

const SYNTHETIC_MARKER = 'synthetic-private-input';
const REQUEST_ID = '00000000-0000-4000-8000-000000000001';
// Normative status expectations are independent of the implementation/schema map.
const PROBLEM_STATUSES = {
  VALIDATION_FAILED: 400,
  AUTHENTICATION_REQUIRED: 401,
  FORBIDDEN: 403,
  REGISTRATION_NOT_AVAILABLE: 403,
  NOT_FOUND: 404,
  STATE_CONFLICT: 409,
  CHILD_SESSION_ALREADY_ACTIVE: 409,
  DAILY_SESSION_LIMIT_REACHED: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  REQUEST_ALREADY_RESOLVED: 409,
  INSUFFICIENT_AVAILABLE_BALANCE: 409,
  BALANCE_LIMIT_EXCEEDED: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  AUTH_TEMPORARILY_LOCKED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const satisfies Record<ProblemCode, number>;
// OpenAPI's components is a reference container, not an instance keyword.
const ajv = new Ajv({ strict: true }).addKeyword('components');

class MoneyInput {
  amount!: string;
}

// These routes exist only in this test module; no domain route is shipped.
class ContractController {
  money(input: MoneyInput): MoneyInput {
    return input;
  }

  query(input: MoneyInput): MoneyInput {
    return input;
  }

  path(input: MoneyInput): MoneyInput {
    return input;
  }

  problem(code: ProblemCode): never {
    // A synthetic duration tests serialization, not an OQ-04 policy/default.
    throw new ProblemDetailsException(code, code === 'AUTH_TEMPORARILY_LOCKED' ? 17 : undefined);
  }

  http(status: string): never {
    const parsed: unknown = JSON.parse(status);
    if (typeof parsed !== 'number') throw new Error(SYNTHETIC_MARKER);
    throw new HttpException(
      { message: SYNTHETIC_MARKER, errors: [SYNTHETIC_MARKER], current: SYNTHETIC_MARKER },
      parsed,
    );
  }

  unexpected(): never {
    throw Object.assign(new Error(SYNTHETIC_MARKER), {
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  }
}

// Test files are outside the API's decorator-enabled tsconfig. Apply the public
// Nest decorators and tsc-equivalent DTO metadata without a separate test compiler.
Controller('contract')(ContractController);
DecimalMoney()(MoneyInput.prototype, 'amount');
Reflect.decorate(
  [Post('money'), ApiBody({ type: MoneyInput }), ApiOkResponse({ type: MoneyInput })],
  ContractController.prototype,
  'money',
  Object.getOwnPropertyDescriptor(ContractController.prototype, 'money'),
);
Body()(ContractController.prototype, 'money', 0);
Query()(ContractController.prototype, 'query', 0);
Param()(ContractController.prototype, 'path', 0);
Param('code')(ContractController.prototype, 'problem', 0);
Param('status')(ContractController.prototype, 'http', 0);
for (const [method, path] of [
  ['query', 'money'],
  ['path', 'money/:amount'],
  ['problem', 'problem/:code'],
  ['http', 'http/:status'],
  ['unexpected', 'unexpected'],
] as const) {
  Reflect.decorate(
    [Get(path)],
    ContractController.prototype,
    method,
    Object.getOwnPropertyDescriptor(ContractController.prototype, method),
  );
}
for (const method of ['money', 'query', 'path']) {
  Reflect.defineMetadata('design:paramtypes', [MoneyInput], ContractController.prototype, method);
}

let application: NestFastifyApplication;
let platform: NestFastifyApplication;
let http: FastifyInstance;
let platformHttp: FastifyInstance;
let validateProblem: ReturnType<Ajv['compile']>;
let validateMoney: ReturnType<Ajv['compile']>;

beforeAll(async () => {
  const module = await Test.createTestingModule({ controllers: [ContractController] }).compile();
  application = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
    logger: false,
  });
  configureHttp(application);
  await application.init();
  http = application.getHttpAdapter().getInstance();
  platform = await createApplication();
  await platform.init();
  platformHttp = platform.getHttpAdapter().getInstance();
  const document = createOpenApiDocument(application);
  validateProblem = ajv.compile({
    $ref: '#/components/schemas/ProblemDetails',
    components: document.components,
  });
  validateMoney = ajv.compile(document.components?.schemas?.['DecimalMoney'] ?? false);
});

afterAll(async () => {
  await application?.close();
  await platform?.close();
});

function assertProblem(
  response: Awaited<ReturnType<FastifyInstance['inject']>>,
  code: ProblemCode,
): void {
  const body: unknown = response.json();
  expect(response.statusCode).toBe(PROBLEM_STATUSES[code]);
  expect(response.headers['content-type']).toMatch(/^application\/problem\+json(?:;|$)/);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(validateProblem(body), JSON.stringify(validateProblem.errors)).toBe(true);
  expect(body).toMatchObject({ code, requestId: response.headers['x-request-id'] });
  expect(response.body).not.toContain(SYNTHETIC_MARKER);
}

describe('HTTP contract', () => {
  test.each(Object.keys(PROBLEMS) as ProblemCode[])(
    'validates and redacts the %s problem example',
    async (code) => {
      const response = await http.inject({
        url: `/api/v1/contract/problem/${code}?private=${SYNTHETIC_MARKER}`,
        headers: { 'x-request-id': REQUEST_ID, authorization: SYNTHETIC_MARKER },
      });
      assertProblem(response, code);
      expect(response.headers['x-request-id']).toBe(REQUEST_ID);
      expect(response.json()).toMatchObject({ instance: `urn:mobey:request:${REQUEST_ID}` });
      expect(response.headers['retry-after']).toBe(
        code === 'AUTH_TEMPORARILY_LOCKED' ? '17' : undefined,
      );
    },
  );

  test.each([
    [400, 'VALIDATION_FAILED'],
    [401, 'AUTHENTICATION_REQUIRED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'STATE_CONFLICT'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [429, 'RATE_LIMITED'],
    [503, 'SERVICE_UNAVAILABLE'],
    [500, 'INTERNAL_ERROR'],
    [418, 'INTERNAL_ERROR'],
  ] as const)('redacts framework exception status %s', async (status, code) => {
    assertProblem(await http.inject(`/api/v1/contract/http/${status}`), code);
  });

  test('redacts unexpected errors instead of trusting arbitrary status/code fields', async () => {
    assertProblem(await http.inject('/api/v1/contract/unexpected'), 'INTERNAL_ERROR');
  });

  test('rejects unknown fields without echoing field names or submitted values', async () => {
    assertProblem(
      await http.inject({
        method: 'POST',
        url: '/api/v1/contract/money',
        payload: { amount: '1', [SYNTHETIC_MARKER]: SYNTHETIC_MARKER },
      }),
      'VALIDATION_FAILED',
    );
  });

  test.each(['constructor', 'prototype', '__proto__'])(
    'rejects prototype-related unknown field %s before it can be silently stripped',
    async (field) => {
      for (const response of [
        await http.inject({
          method: 'POST',
          url: '/api/v1/contract/money',
          payload: { amount: '1', [field]: SYNTHETIC_MARKER },
        }),
        await http.inject(`/api/v1/contract/money?amount=1&${field}=${SYNTHETIC_MARKER}`),
      ]) {
        assertProblem(response, 'VALIDATION_FAILED');
      }
    },
  );

  test.each([
    '0',
    '1',
    '-1',
    '9007199254740993',
    '-9007199254740993',
    '999999999999999999999999999999',
  ])(
    'preserves decimal string %s without floating-point conversion or an invented ceiling',
    async (amount) => {
      const response = await http.inject({
        method: 'POST',
        url: '/api/v1/contract/money',
        payload: { amount },
      });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ amount });
      expect(validateMoney(amount)).toBe(true);
    },
  );

  test.each([
    0,
    1,
    1.5,
    null,
    true,
    {},
    [],
    '',
    '01',
    '-0',
    '+1',
    '1.0',
    '1e3',
    ' 1',
    '1 ',
    '1\n',
    '١',
    SYNTHETIC_MARKER,
  ])('rejects invalid money input %# in both runtime validation and the schema', async (amount) => {
    assertProblem(
      await http.inject({ method: 'POST', url: '/api/v1/contract/money', payload: { amount } }),
      'VALIDATION_FAILED',
    );
    expect(validateMoney(amount)).toBe(false);
  });

  test('rejects missing required money', async () => {
    assertProblem(
      await http.inject({ method: 'POST', url: '/api/v1/contract/money', payload: {} }),
      'VALIDATION_FAILED',
    );
  });

  test('validates query and path DTOs and rejects unknown query fields', async () => {
    expect((await http.inject('/api/v1/contract/money?amount=9007199254740993')).json()).toEqual({
      amount: '9007199254740993',
    });
    assertProblem(
      await http.inject(`/api/v1/contract/money?amount=1&${SYNTHETIC_MARKER}=1`),
      'VALIDATION_FAILED',
    );
    assertProblem(await http.inject('/api/v1/contract/money/1.5'), 'VALIDATION_FAILED');
    expect((await http.inject('/api/v1/contract/money/-1')).json()).toEqual({ amount: '-1' });
  });

  test('redacts malformed JSON parser failures', async () => {
    assertProblem(
      await http.inject({
        method: 'POST',
        url: '/api/v1/contract/money',
        headers: { 'content-type': 'application/json' },
        payload: `{"${SYNTHETIC_MARKER}":`,
      }),
      'VALIDATION_FAILED',
    );
  });

  test('redacts unsupported content types', async () => {
    assertProblem(
      await http.inject({
        method: 'POST',
        url: '/api/v1/contract/money',
        headers: { 'content-type': 'application/octet-stream' },
        payload: SYNTHETIC_MARKER,
      }),
      'UNSUPPORTED_MEDIA_TYPE',
    );
  });

  test('enforces the production request-body limit without echo', async () => {
    assertProblem(
      await platformHttp.inject({
        method: 'POST',
        url: '/api/v1/health/live',
        payload: { [SYNTHETIC_MARKER]: 'x'.repeat(1_048_576) },
      }),
      'PAYLOAD_TOO_LARGE',
    );
  });

  test('wires redacted not-found problems into the production application', async () => {
    assertProblem(
      await platformHttp.inject(`/api/v1/${SYNTHETIC_MARKER}?private=${SYNTHETIC_MARKER}`),
      'NOT_FOUND',
    );
  });

  test.each([REQUEST_ID, undefined, SYNTHETIC_MARKER])(
    'redacts pre-routing malformed URL errors and validates correlation ID %#',
    async (id) => {
      for (const suffix of ['%ZZ', '%E0%A4%A']) {
        const response = await platformHttp.inject({
          url: `/api/v1/${SYNTHETIC_MARKER}/${suffix}?private=${SYNTHETIC_MARKER}`,
          headers: id === undefined ? {} : { 'x-request-id': id },
        });
        assertProblem(response, 'VALIDATION_FAILED');
        expect(response.headers['x-request-id']).toMatch(new RegExp(REQUEST_ID_PATTERN));
        if (id === REQUEST_ID) expect(response.headers['x-request-id']).toBe(REQUEST_ID);
        else expect(response.headers['x-request-id']).not.toBe(id);
      }
    },
  );

  test('returns the documented health body and accepted correlation ID', async () => {
    const response = await platformHttp.inject({
      url: '/api/v1/health/live',
      headers: { 'x-request-id': REQUEST_ID },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(response.headers['x-request-id']).toBe(REQUEST_ID);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  test.each([undefined, '', SYNTHETIC_MARKER, `${REQUEST_ID},${REQUEST_ID}`, 'a'.repeat(1000)])(
    'replaces absent or malformed correlation IDs %# on successes and errors',
    async (id) => {
      for (const url of ['/api/v1/health/live', '/api/v1/missing']) {
        const response = await platformHttp.inject({
          url,
          headers: id === undefined ? {} : { 'x-request-id': id },
        });
        expect(response.headers['x-request-id']).toMatch(new RegExp(REQUEST_ID_PATTERN));
        expect(response.headers['x-request-id']).not.toBe(id);
      }
    },
  );

  test('generates a fresh correlation ID for each request', async () => {
    const first = await platformHttp.inject('/api/v1/health/live');
    const second = await platformHttp.inject('/api/v1/health/live');
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });

  test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects unsafe explicit retry duration %#',
    (seconds) => {
      expect(() => new ProblemDetailsException('AUTH_TEMPORARILY_LOCKED', seconds)).toThrow(
        'Invalid retry interval.',
      );
    },
  );

  test('does not attach Retry-After to non-rate-limit errors', () => {
    expect(() => new ProblemDetailsException('STATE_CONFLICT', 17)).toThrow(
      'Invalid retry interval.',
    );
  });
});

describe('generated contract', () => {
  test('documents strict DTO objects consistently with unknown-field rejection', () => {
    const document = createOpenApiDocument(application);
    const validate = ajv.compile(document.components?.schemas?.['MoneyInput'] ?? false);
    expect(validate({ amount: '1' })).toBe(true);
    expect(validate({ amount: '1', extra: SYNTHETIC_MARKER })).toBe(false);
  });

  test('generated types reject numeric money and mismatched problem statuses', () => {
    const configPath = join(process.cwd(), 'tsconfig.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
    const fixturePath = join(dirname(CONTRACT_PATH), '__contract_fixture.ts');
    const fixture = `
      import type { DecimalMoney, StateConflict } from './api.js';
      export const money: DecimalMoney = '9007199254740993';
      export const status: StateConflict['status'] = 409;
    `;
    const diagnostics = (source: string): readonly ts.Diagnostic[] => {
      const options = { ...parsed.options, noEmit: true, rootDir: dirname(CONTRACT_PATH) };
      const host = ts.createCompilerHost(options);
      const original = host.getSourceFile.bind(host);
      host.getSourceFile = (name, version, onError, fresh) =>
        name === fixturePath
          ? ts.createSourceFile(name, source, version, true)
          : original(name, version, onError, fresh);
      return ts.getPreEmitDiagnostics(ts.createProgram([fixturePath], options, host));
    };
    expect(diagnostics(fixture).map((diagnostic) => diagnostic.messageText)).toEqual([]);
    expect(
      diagnostics(fixture.replace("'9007199254740993'", '1.5').replace('= 409', '= 400')).map(
        (diagnostic) => diagnostic.code,
      ),
    ).toEqual([2322, 2322]);
  }, 30_000);

  test('exports generated contract types through the shared package entrypoint for web consumers', () => {
    const webDirectory = resolve(process.cwd(), '../web');
    const configPath = join(webDirectory, 'tsconfig.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    expect(config.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      webDirectory,
      undefined,
      configPath,
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.skipLibCheck).toBe(false);
    const fixturePath = join(webDirectory, 'src/__package_contract_fixture.ts');
    const resolved = ts.resolveModuleName('@mobey/shared', fixturePath, parsed.options, ts.sys);
    expect(resolved.resolvedModule?.resolvedFileName).toBe(
      resolve(process.cwd(), '../../packages/shared/dist/index.d.ts'),
    );
    // Use the real web compiler configuration and built package export map, not
    // source aliases or relative generated-file imports. No web file is written.
    const fixture = `
      import { getApplicationVersion } from '@mobey/shared';
      import type { DecimalMoney, ProblemDetails, HealthControllerLiveResponse } from '@mobey/shared';
      export const money: DecimalMoney = '9007199254740993';
      export const status: Extract<ProblemDetails, { code: 'STATE_CONFLICT' }>['status'] = 409;
      export const health: HealthControllerLiveResponse = { status: 'ok' };
      export const version: string = getApplicationVersion();
    `;
    const diagnostics = (source: string): readonly ts.Diagnostic[] => {
      const host = ts.createCompilerHost(parsed.options);
      host.getCurrentDirectory = () => webDirectory;
      const original = host.getSourceFile.bind(host);
      host.getSourceFile = (name, version, onError, fresh) =>
        name === fixturePath
          ? ts.createSourceFile(name, source, version, true)
          : original(name, version, onError, fresh);
      return ts.getPreEmitDiagnostics(ts.createProgram([fixturePath], parsed.options, host));
    };
    expect(diagnostics(fixture).map((diagnostic) => diagnostic.messageText)).toEqual([]);
    expect(
      diagnostics(fixture.replace("'9007199254740993'", '1.5').replace('= 409', '= 400')).map(
        (diagnostic) => diagnostic.code,
      ),
    ).toEqual([2322, 2322]);
  }, 30_000);

  test('compiled production bootstrap serves health and redacted problems with correlation headers', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
      import { createApplication } from './dist/main.js';
      const app = await createApplication();
      try {
        await app.init();
        const http = app.getHttpAdapter().getInstance();
        const results = [];
        for (const url of ['/api/v1/health/live', '/api/v1/${SYNTHETIC_MARKER}', '/api/v1/${SYNTHETIC_MARKER}/%ZZ']) {
          const response = await http.inject({ url, headers: { 'x-request-id': '${REQUEST_ID}' } });
          results.push({ status: response.statusCode, headers: response.headers, body: response.json() });
        }
        process.stdout.write(JSON.stringify(results));
      } finally { await app.close(); }
    `,
      ],
      { encoding: 'utf8', timeout: 10_000 },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
    const results: unknown = JSON.parse(result.stdout);
    expect(results).toMatchObject([
      { status: 200, headers: { 'x-request-id': REQUEST_ID }, body: { status: 'ok' } },
      {
        status: 404,
        headers: {
          'x-request-id': REQUEST_ID,
          'content-type': 'application/problem+json; charset=utf-8',
        },
        body: { code: 'NOT_FOUND', requestId: REQUEST_ID },
      },
      {
        status: 400,
        headers: {
          'x-request-id': REQUEST_ID,
          'content-type': 'application/problem+json; charset=utf-8',
          'cache-control': 'no-store',
        },
        body: { code: 'VALIDATION_FAILED', requestId: REQUEST_ID },
      },
    ]);
    expect(result.stdout).not.toContain(SYNTHETIC_MARKER);
  });

  test('documents only shipped routes and every stable code, money syntax, and correlation header', () => {
    const document = createOpenApiDocument(platform);
    expect(Object.keys(document.paths).sort()).toEqual([
      '/api/v1/health/live',
      '/api/v1/health/ready',
    ]);
    expect(Object.keys(PROBLEMS).sort()).toEqual(Object.keys(PROBLEM_STATUSES).sort());
    for (const code of Object.keys(PROBLEM_STATUSES))
      expect(document.components?.schemas).toHaveProperty(code);
    for (const path of Object.values(document.paths)) {
      expect(path.get?.responses['default']).toHaveProperty('content.application/problem+json');
      expect(path.get?.responses['200']).toHaveProperty('headers.X-Request-Id');
    }
    expect(document.paths['/api/v1/health/ready']?.get?.responses['503']).toHaveProperty(
      'content.application/json',
    );
    expect(document.components?.schemas?.['DecimalMoney']).toMatchObject({ type: 'string' });
  });

  test('rejects wrong problem status/code pairings and unexpected private extensions in the schema', async () => {
    const response = await http.inject('/api/v1/contract/problem/STATE_CONFLICT');
    const body: Record<string, unknown> = response.json();
    expect(validateProblem({ ...body, status: 400 })).toBe(false);
    expect(validateProblem({ ...body, [SYNTHETIC_MARKER]: SYNTHETIC_MARKER })).toBe(false);
  });

  test('generates byte-identical output twice and matches the committed file', async () => {
    const first = await generateContract();
    expect(await generateContract()).toBe(first);
    expect(await readFile(CONTRACT_PATH, 'utf8')).toBe(first);
    const digest = createHash('sha256')
      .update(JSON.stringify(createOpenApiDocument(platform)))
      .digest('hex');
    expect(first).toContain(`// OpenAPI SHA-256: ${digest}`);
  }, 30_000);

  test('detects missing and stale output without overwriting it', async () => {
    const directory = await mkdtemp(join(process.cwd(), 'dist/contract-test-'));
    const path = join(directory, 'api.ts');
    try {
      await expect(checkContract(path)).rejects.toThrow();
      const stale = '// Synthetic stale output\n';
      await writeFile(path, stale);
      await expect(checkContract(path)).rejects.toThrow('Generated API contract is stale.');
      expect(await readFile(path, 'utf8')).toBe(stale);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);

  test('checks compiled production output without database configuration or a listener', () => {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([name]) => !name.startsWith('DATABASE_')),
    );
    const result = spawnSync(process.execPath, ['dist/openapi.js', '--check'], {
      encoding: 'utf8',
      env,
      timeout: 30_000,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });
});

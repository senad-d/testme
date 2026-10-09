import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const root = fileURLToPath(new URL('../..', import.meta.url));
const project = `mobey-compose-test-${randomUUID()}`;
let directory: string;
let webUrl: string;
let watcher: ChildProcess | undefined;
let watchOutput = '';

function docker(args: string[], input?: string): string {
  return execFileSync('docker', args, {
    cwd: directory,
    encoding: 'utf8',
    input,
    timeout: 600_000,
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function composeArgs(args: string[]): string[] {
  return [
    'compose',
    '--env-file',
    '/dev/null',
    '--project-name',
    project,
    '-f',
    'compose.yaml',
    '-f',
    'ports.yaml',
    ...args,
  ];
}

function compose(args: string[]): string {
  return docker(composeArgs(args));
}

function sql(query: string): string {
  return compose(['exec', '-T', 'db', 'psql', '-U', 'mobey', '-d', 'mobey', '-Atc', query]);
}

function image(service: string): string {
  return docker(['inspect', '--format', '{{.Image}}', compose(['ps', '-aq', service])]);
}

test.beforeAll(async () => {
  test.setTimeout(600_000);
  // A clean source copy inside ignored output; never copy host credentials/agent state.
  directory = await mkdtemp(join(root, 'node_modules', '.compose-test-'));
  const inputs = [
    '.dockerignore',
    'compose.yaml',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.base.json',
    'patches',
    'apps/api/Dockerfile',
    'apps/api/package.json',
    'apps/api/tsconfig.json',
    'apps/api/src',
    'apps/web/Dockerfile',
    'apps/web/package.json',
    'apps/web/tsconfig.json',
    'apps/web/vite.config.ts',
    'apps/web/index.html',
    'apps/web/src',
    'packages/shared/package.json',
    'packages/shared/tsconfig.json',
    'packages/shared/src',
    'packages/content/package.json',
    'packages/content/tsconfig.json',
    'packages/content/src',
    'tests/e2e/package.json',
  ];
  for (const path of inputs) {
    await cp(join(root, path), join(directory, path), {
      recursive: true,
      filter: (source) =>
        !/^(?:\.env(?:\..*)?|\.pi|\.git|\.DS_Store|node_modules|\.aws|\.azure|\.oci|\.ssh|\.config|\.npmrc|\.netrc|\.pgpass|\.git-credentials|credentials|dist|coverage|test-results)$/.test(
          basename(source),
        ) && !/\.(?:pem|key|p12|pfx|log|tsbuildinfo)$/.test(source),
    });
  }
  // Distinct synthetic package versions catch accidentally conflating the API
  // reload endpoint with the shared application identity after integrating main.
  const apiPackagePath = join(directory, 'apps/api/package.json');
  const apiPackage = JSON.parse(await readFile(apiPackagePath, 'utf8')) as Record<string, unknown>;
  await writeFile(
    apiPackagePath,
    `${JSON.stringify({ ...apiPackage, version: '0.0.0-compose-test' }, null, 2)}\n`,
  );
  // Synthetic canaries only. Invalid default Compose selection must never be read.
  await writeFile(
    join(directory, '.env'),
    'COMPOSE_FILE=does-not-exist.yaml\nMOBEY_PUBLIC_BUILD_VERSION=host-env-canary\n',
  );
  await mkdir(join(directory, '.pi'));
  await writeFile(join(directory, '.pi', 'canary'), 'synthetic-agent-state-canary');
  await writeFile(join(directory, 'apps/web/src/.env'), 'nested-env-canary');
  await mkdir(join(directory, 'apps/web/src/.aws'));
  await writeFile(join(directory, 'apps/web/src/.aws/credentials'), 'synthetic-credential-canary');
  await mkdir(join(directory, 'apps/api/src/.ssh'));
  await writeFile(join(directory, 'apps/api/src/.ssh/id_ed25519'), 'synthetic-key-canary');
  await mkdir(join(directory, 'apps/web/src/coverage'));
  await writeFile(join(directory, 'apps/web/src/coverage/canary'), 'synthetic-output-canary');
  await writeFile(join(directory, 'apps/web/src/private.p12'), 'synthetic-certificate-canary');
  await writeFile(
    join(directory, 'ports.yaml'),
    `services:
  api:
    ports: !override ['127.0.0.1::3000']
  web:
    ports: !override ['127.0.0.1::5173']
`,
  );
  // Inspect only the inline service model, never Compose's inherited environment dump.
  expect(compose(['config', '--format', 'json'])).not.toContain('host-env-canary');
  // Exercise the documented up --build --watch lifecycle, not a host dependency install.
  watcher = spawn('docker', composeArgs(['up', '--build', '--watch']), {
    cwd: directory,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  watcher.stdout?.on('data', (chunk: Buffer) => {
    watchOutput += chunk.toString();
  });
  watcher.stderr?.on('data', (chunk: Buffer) => {
    watchOutput += chunk.toString();
  });
  await expect
    .poll(
      () => {
        if (watcher?.exitCode !== null) throw new Error(`Compose exited: ${watchOutput}`);
        try {
          const address = compose(['port', 'web', '5173']);
          webUrl = `http://${address}`;
          return address.startsWith('127.0.0.1:');
        } catch {
          return false;
        }
      },
      { timeout: 480_000 },
    )
    .toBe(true)
    .catch((cause: unknown) => {
      // The isolated stack contains synthetic values only; retain bounded build diagnostics.
      throw new Error(`Compose startup did not complete:\n${watchOutput.slice(-20_000)}`, {
        cause,
      });
    });
  await expect
    .poll(
      async () => {
        try {
          return (await fetch(`${webUrl}/api/v1/health/ready`)).status;
        } catch {
          return 0;
        }
      },
      { timeout: 90_000 },
    )
    .toBe(200);
  await expect
    .poll(() => watchOutput, { timeout: 30_000 })
    .toMatch(/Watch (enabled|configuration)|Watching/i);
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  watcher?.kill('SIGINT');
  if (watcher?.exitCode === null && watcher.signalCode === null) {
    await new Promise<void>((resolve) => {
      watcher?.once('exit', () => {
        resolve();
      });
    });
  }
  if (directory) {
    try {
      compose(['down', '--volumes', '--remove-orphans', '--rmi', 'local']);
      const images = docker(['image', 'ls', '--format', '{{.Repository}}']);
      for (const tag of ['api-production', 'web-production', 'context']) {
        if (images.split('\n').includes(`${project}-${tag}`)) {
          docker(['image', 'rm', `${project}-${tag}`]);
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test('clean Compose migrates once and serves browser readiness with non-root services', async ({
  page,
}) => {
  await page.goto(webUrl);
  await expect(page.getByRole('status').filter({ hasText: /^API readiness:/ })).toHaveText(
    'API readiness: ready',
  );
  await expect(page.getByText('Build: 0.0.0')).toBeVisible();
  expect(
    compose([
      'exec',
      '-T',
      'web',
      'sh',
      '-c',
      'test ! -e /workspace/apps/web/src/.env && echo clean',
    ]),
  ).toBe('clean');
  expect(sql('SELECT count(*) FROM mobey_platform.migrations')).toBe('1');
  expect(
    docker(['inspect', '--format', '{{.State.ExitCode}}', compose(['ps', '-aq', 'migrate'])]),
  ).toBe('0');
  for (const service of ['db', 'api', 'web']) {
    expect(compose(['exec', '-T', service, 'id', '-u'])).not.toBe('0');
  }
  expect(docker(['image', 'inspect', '--format', '{{.Config.User}}', image('migrate')])).toBe(
    'node',
  );
});

test('Compose proxy preserves both version identities and safe correlated HTTP failures', async () => {
  const requestId = '26800000-0000-4000-8000-000000000001';
  const apiPackage = JSON.parse(
    await readFile(join(directory, 'apps/api/package.json'), 'utf8'),
  ) as {
    version: string;
  };
  const versions = [
    ['/api/v1/health/version', { version: apiPackage.version }],
    [
      '/api/v1/version',
      { version: '0.0.0', name: 'mobey', description: 'Mobey family learning and rewards' },
    ],
  ] as const;
  for (const [route, identity] of versions) {
    const response = await fetch(`${webUrl}${route}`, {
      headers: { 'X-Request-Id': requestId },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe(requestId);
    expect(await response.json()).toEqual(identity);
  }

  const response = await fetch(`${webUrl}/api/v1/synthetic-private-path-canary`, {
    headers: { 'X-Request-Id': requestId },
  });
  expect(response.status).toBe(404);
  expect(response.headers.get('content-type')).toContain('application/problem+json');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-request-id')).toBe(requestId);
  expect(await response.json()).toEqual({
    type: 'urn:mobey:problem:not-found',
    title: 'Not found',
    status: 404,
    detail: 'The requested resource was not found.',
    code: 'NOT_FOUND',
    instance: `urn:mobey:request:${requestId}`,
    requestId,
  });
});

test('API development image builds its shared workspace prerequisite', () => {
  // Main's API build compiles @mobey/shared first. Guard the image inputs even
  // when this checkout's API package has not yet adopted that build command.
  expect(() =>
    compose(['exec', '-T', 'api', 'pnpm', '--filter', '@mobey/shared', 'build']),
  ).not.toThrow();
});

test('web HMR and API source restart change responses without rebuilding images', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const apiImage = image('api');
  const webImage = image('web');
  const webSource = join(directory, 'apps/web/src/app.tsx');
  const apiSource = join(directory, 'apps/api/src/app.module.ts');
  const originalWeb = await readFile(webSource, 'utf8');
  const originalApi = await readFile(apiSource, 'utf8');
  try {
    await page.goto(webUrl);
    await expect(page.getByRole('status').filter({ hasText: /^API readiness:/ })).toHaveText(
      'API readiness: ready',
    );
    const changedWeb = originalWeb.replace('<h1>Mobey</h1>', '<h1>Mobey reload proof</h1>');
    expect(changedWeb, 'HMR fixture must change the visible heading').not.toBe(originalWeb);
    await writeFile(webSource, changedWeb);
    await expect(page.getByRole('heading', { name: 'Mobey reload proof' })).toBeVisible({
      timeout: 30_000,
    });
    const changedApi = originalApi.replace("@Get('live')", "@Get('reload-proof')");
    expect(changedApi, 'Restart fixture must change the liveness route').not.toBe(originalApi);
    await writeFile(apiSource, changedApi);
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${webUrl}/api/v1/health/reload-proof`)).status;
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(200);
    expect(image('api')).toBe(apiImage);
    expect(image('web')).toBe(webImage);
  } finally {
    await writeFile(webSource, originalWeb);
    await writeFile(apiSource, originalApi);
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${webUrl}/api/v1/health/live`)).status;
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(200);
  }
});

test('Watch excludes new credentials and generated artifacts while syncing source', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const excluded = [
    '.env.watch-canary',
    '.pi/canary',
    '.aws/credentials',
    '.ssh/id_ed25519',
    '.npmrc',
    '.netrc',
    '.pgpass',
    '.git-credentials',
    'private.key',
    'private.pfx',
    'dist/canary',
    'coverage/watch-canary',
    'test-results/canary',
    'watch-canary.spec.ts',
  ];
  const marker = 'watch-safe-source.ts';
  try {
    for (const service of ['api', 'web']) {
      const source = join(directory, 'apps', service, 'src');
      for (const path of excluded) {
        const destination = join(source, path);
        await mkdir(join(destination, '..'), { recursive: true });
        await writeFile(destination, 'synthetic-watch-exclusion-canary');
      }
      // A real source edit is a synchronization barrier: do not pass merely because Watch
      // was idle, disconnected or too slow to process the excluded files.
      await writeFile(join(source, marker), 'export const watchProof = true;\n');
      await expect
        .poll(
          () => {
            try {
              return compose([
                'exec',
                '-T',
                service,
                'cat',
                `/workspace/apps/${service}/src/${marker}`,
              ]);
            } catch {
              return '';
            }
          },
          { timeout: 60_000 },
        )
        .toBe('export const watchProof = true;');
      for (const path of excluded) {
        expect(
          compose([
            'exec',
            '-T',
            service,
            'sh',
            '-c',
            `test ! -e /workspace/apps/${service}/src/${path} && echo excluded`,
          ]),
        ).toBe('excluded');
      }
    }
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${webUrl}/api/v1/health/ready`)).status;
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(200);
    await page.goto(webUrl);
    await expect(page.getByRole('status').filter({ hasText: /^API readiness:/ })).toHaveText(
      'API readiness: ready',
    );
  } finally {
    for (const service of ['api', 'web']) {
      const source = join(directory, 'apps', service, 'src');
      for (const path of [...excluded, marker]) {
        await rm(join(source, path), { force: true });
      }
    }
  }
});

test('database survives recreation, failed migrations block API startup, and browser readiness recovers', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const checksum = sql('SELECT checksum FROM mobey_platform.migrations WHERE position = 1');
  const appliedAt = sql(
    'SELECT applied_at::text FROM mobey_platform.migrations WHERE position = 1',
  );
  try {
    // Only the disposable test database is altered; production migrations stay immutable.
    sql(`UPDATE mobey_platform.migrations SET checksum = repeat('0', 64) WHERE position = 1`);
    await expect.poll(async () => (await fetch(`${webUrl}/api/v1/health/ready`)).status).toBe(503);
    await page.goto(webUrl);
    await expect(page.getByRole('status').filter({ hasText: /^API readiness:/ })).toHaveText(
      'API readiness: unavailable',
    );
    compose(['stop', 'web', 'api']);
    compose(['rm', '-f', 'web', 'api', 'migrate']);
    expect(() => compose(['up', '-d', 'api'])).toThrow();
    expect(
      docker(['inspect', '--format', '{{.State.ExitCode}}', compose(['ps', '-aq', 'migrate'])]),
    ).toBe('1');
    expect(
      docker(['inspect', '--format', '{{.State.Running}}', compose(['ps', '-aq', 'api'])]),
    ).toBe('false');
  } finally {
    sql(`UPDATE mobey_platform.migrations SET checksum = '${checksum}' WHERE position = 1`);
    compose(['down']);
    compose(['up', '-d', '--wait', '--wait-timeout', '120']);
  }
  expect(sql('SELECT checksum FROM mobey_platform.migrations WHERE position = 1')).toBe(checksum);
  // A fresh database can recreate the same checksum/count, but not this original timestamp.
  expect(sql('SELECT applied_at::text FROM mobey_platform.migrations WHERE position = 1')).toBe(
    appliedAt,
  );
  expect(sql('SELECT count(*) FROM mobey_platform.migrations')).toBe('1');
  const recoveredWebUrl = `http://${compose(['port', 'web', '5173'])}`;
  expect((await fetch(`${recoveredWebUrl}/api/v1/health/ready`)).status).toBe(200);
  await page.goto(recoveredWebUrl);
  await expect(page.getByRole('status').filter({ hasText: /^API readiness:/ })).toHaveText(
    'API readiness: ready',
  );
});

test('build context excludes canaries and production stages are non-root and runnable', async () => {
  test.setTimeout(600_000);
  // COPY the entire filtered context to prove exclusion before any image layer receives it.
  docker(
    ['build', '-t', `${project}-context`, '-f', '-', '.'],
    `FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e
COPY . /context
RUN test ! -e /context/.env && test ! -e /context/.pi && test ! -e /context/apps/web/src/.env && test ! -e /context/ports.yaml \\
    && test ! -e /context/apps/web/src/.aws && test ! -e /context/apps/api/src/.ssh \\
    && test ! -e /context/apps/web/src/coverage && test ! -e /context/apps/web/src/private.p12
`,
  );
  for (const service of ['api', 'web']) {
    const tag = `${project}-${service}-production`;
    docker(['build', '--target', 'production', '-t', tag, '-f', `apps/${service}/Dockerfile`, '.']);
    const user = docker(['image', 'inspect', '--format', '{{.Config.User}}', tag]);
    expect(user).not.toBe('');
    expect(user).not.toBe('0');
    expect(user).not.toBe('root');
    expect(docker(['run', '--rm', '--entrypoint', 'id', tag, '-u'])).not.toBe('0');
    expect(docker(['image', 'inspect', '--format', '{{json .Config.Env}}', tag])).not.toContain(
      'mobey-development-only-',
    );
    const container = docker(['run', '-d', tag]);
    try {
      if (service === 'api') {
        await expect
          .poll(
            () => {
              try {
                return docker([
                  'exec',
                  container,
                  'node',
                  '-e',
                  "fetch('http://127.0.0.1:3000/api/v1/health/live').then(async r => console.log(r.status))",
                ]);
              } catch {
                return '';
              }
            },
            { timeout: 30_000 },
          )
          .toBe('200');
        expect(() =>
          docker(['run', '--rm', '-e', 'COOKIE_MODE=localhost-development', tag]),
        ).toThrow(/API startup failed/);
        expect(
          docker([
            'exec',
            container,
            'sh',
            '-c',
            'test -f src/database/migrations/0001_platform.sql && test ! -e .env && test ! -e src/main.ts && echo clean',
          ]),
        ).toBe('clean');
      } else {
        await expect
          .poll(
            () => {
              try {
                return docker(['exec', container, 'wget', '-qO-', 'http://127.0.0.1:8080']);
              } catch {
                return '';
              }
            },
            { timeout: 30_000 },
          )
          .toContain('<div id="root"></div>');
        expect(
          docker([
            'exec',
            container,
            'sh',
            '-c',
            '! grep -R -E "host-env-canary|synthetic-agent-state-canary|mobey-development-only-" /usr/share/nginx/html && echo clean',
          ]),
        ).toBe('clean');
      }
    } finally {
      docker(['rm', '-f', container]);
    }
  }
});

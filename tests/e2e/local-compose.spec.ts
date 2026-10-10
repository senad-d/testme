import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const root = fileURLToPath(new URL('../..', import.meta.url));
const project = `mobey-compose-test-${randomUUID()}`;
let directory: string;
let webUrl: string;
let watcher: ChildProcess | undefined;
let watchOutput = '';

// One synthetic inventory exercises build, offline initial-sync and live-Watch denial.
const excluded = [
  '.env',
  '.env.canary',
  '.pi/canary',
  '.git/canary',
  'node_modules/canary',
  '.DS_Store',
  '.aws/credentials',
  '.azure/canary',
  '.oci/canary',
  '.ssh/id_ed25519',
  '.config/canary',
  '.npmrc',
  '.netrc',
  '.pgpass',
  '.git-credentials',
  'credentials',
  'private.pem',
  'private.key',
  'private.p12',
  'private.pfx',
  'canary.log',
  'canary.tsbuildinfo',
  'dist/canary',
  'coverage/canary',
  'test-results/canary',
  'canary.test.ts',
  'canary.spec.ts',
  'canary.test.tsx',
  'canary.spec.tsx',
  'nested/.env.canary',
  'nested/.pi/canary',
  'nested/.git/canary',
  'nested/.aws/credentials',
  'nested/node_modules/canary',
  'nested/coverage/canary',
] as const;

async function writeCanaries(source: string): Promise<void> {
  for (const path of excluded) {
    const destination = join(source, path);
    await mkdir(join(destination, '..'), { recursive: true });
    await writeFile(destination, 'synthetic-exclusion-canary');
  }
}

function assertSourceExclusions(service: string, prefix = ''): void {
  expect(
    compose([
      'exec',
      '-T',
      service,
      'sh',
      '-c',
      `${excluded.map((path) => `if test -e /workspace/apps/${service}/src/${prefix}${path}; then echo included:${path}; fi`).join('; ')}; echo checked`,
    ]),
  ).toBe('checked');
}

function startWatcher(args: string[]): void {
  watchOutput = '';
  watcher = spawn(
    process.execPath,
    [join(directory, 'scripts/compose-watch.mjs'), ...composeArgs(args).slice(3)],
    { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  for (const stream of [watcher.stdout, watcher.stderr]) {
    stream?.on('data', (chunk: Buffer) => {
      watchOutput += chunk.toString();
    });
  }
}

async function stopWatcher(): Promise<void> {
  if (watcher?.exitCode === null && watcher.signalCode === null) {
    const stopped = new Promise<void>((resolve) => {
      watcher?.once('exit', () => {
        resolve();
      });
    });
    watcher.kill('SIGINT');
    await stopped;
  }
}

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
    'scripts/compose-watch.mjs',
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
  for (const source of [
    'apps/api/src',
    'apps/web/src',
    'packages/shared/src',
    'packages/content/src',
  ]) {
    await writeCanaries(join(directory, source));
  }
  // Unknown paths must remain denied, not just named sensitive files.
  for (const path of [
    'unapproved-root/canary.ts',
    'apps/api/unapproved/canary.ts',
    'packages/unapproved/canary.ts',
    'patches/unapproved-canary.ts',
    'tests/e2e/canary.ts',
  ]) {
    await mkdir(join(directory, path, '..'), { recursive: true });
    await writeFile(join(directory, path), 'synthetic-unapproved-context-canary');
  }
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
  // Exercise the filtered wrapper's up --build --watch lifecycle, not a host dependency install.
  startWatcher(['up', '--build', '--watch']);
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
  await stopWatcher();
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
  for (const service of ['api', 'web']) assertSourceExclusions(service);
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

test('initial sync applies offline source edits to reused images and excludes canaries', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const apiImage = image('api');
  const webImage = image('web');
  const webSource = join(directory, 'apps/web/src/app.tsx');
  const apiSource = join(directory, 'apps/api/src/app.module.ts');
  const originalWeb = await readFile(webSource, 'utf8');
  const originalApi = await readFile(apiSource, 'utf8');
  const changedWeb = originalWeb.replace('<h1>Mobey</h1>', '<h1>Mobey offline proof</h1>');
  const changedApi = originalApi.replace("@Get('live')", "@Get('offline-proof')");
  expect(changedWeb).not.toBe(originalWeb);
  expect(changedApi).not.toBe(originalApi);
  await stopWatcher();
  // Recreate from the existing images before editing: neither build nor creation
  // can supply the changed sources. Only initial sync can cross this boundary.
  compose(['up', '-d', '--no-build', '--force-recreate', '--wait', '--wait-timeout', '120']);
  webUrl = `http://${compose(['port', 'web', '5173'])}`;
  const containers = ['api', 'web'].map((service) => compose(['ps', '-q', service]));
  try {
    await writeFile(webSource, changedWeb);
    await writeFile(apiSource, changedApi);
    for (const service of ['api', 'web']) {
      await writeCanaries(join(directory, 'apps', service, 'src', 'offline'));
    }
    expect(compose(['exec', '-T', 'api', 'cat', '/workspace/apps/api/src/app.module.ts'])).toBe(
      originalApi.trim(),
    );
    expect(compose(['exec', '-T', 'web', 'cat', '/workspace/apps/web/src/app.tsx'])).toBe(
      originalWeb.trim(),
    );
    startWatcher(['watch', '--no-up']);
    await expect.poll(() => watchOutput, { timeout: 30_000 }).toMatch(/Watch enabled/i);
    for (const [service, path, source] of [
      ['api', 'app.module.ts', changedApi],
      ['web', 'app.tsx', changedWeb],
    ] as const) {
      await expect
        .poll(
          () => compose(['exec', '-T', service, 'cat', `/workspace/apps/${service}/src/${path}`]),
          { timeout: 30_000 },
        )
        .toBe(source.trim());
      assertSourceExclusions(service, 'offline/');
    }
    expect(['api', 'web'].map((service) => compose(['ps', '-q', service]))).toEqual(containers);
    expect(image('api')).toBe(apiImage);
    expect(image('web')).toBe(webImage);
    // Compose initial sync copies files; unlike a live sync+restart event it
    // does not recompile an already-running API. Restart only after byte proof.
    compose(['restart', 'api']);
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${webUrl}/api/v1/health/offline-proof`)).status;
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(200);
    await page.goto(webUrl);
    await expect(page.getByRole('heading', { name: 'Mobey offline proof' })).toBeVisible();
  } finally {
    await writeFile(webSource, originalWeb);
    await writeFile(apiSource, originalApi);
    for (const service of ['api', 'web']) {
      await rm(join(directory, 'apps', service, 'src', 'offline'), {
        recursive: true,
        force: true,
      });
    }
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

test('Watch filters atomic populated-directory arrivals for API and web without rebuilding', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const marker = 'watch-safe-source.ts';
  const images = ['api', 'web'].map((service) => image(service));
  const containers = ['api', 'web'].map((service) => compose(['ps', '-q', service]));
  try {
    for (const service of ['api', 'web']) {
      const source = join(directory, 'apps', service, 'src', 'live');
      // Populate OUTSIDE the watched tree, then atomically move the entire new
      // directory in. Neither host nor container destination parent exists.
      await expect(access(source)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(
        compose([
          'exec',
          '-T',
          service,
          'sh',
          '-c',
          `test ! -e /workspace/apps/${service}/src/live && echo absent`,
        ]),
      ).toBe('absent');
      const arriving = await mkdtemp(join(directory, 'arrival-'));
      await writeCanaries(arriving);
      await writeFile(join(arriving, marker), 'export const watchProof = true;\n');
      await rename(arriving, source);
      // Positive arrival is a barrier: an idle/disconnected Watch cannot pass.
      await expect
        .poll(
          () => {
            try {
              return compose([
                'exec',
                '-T',
                service,
                'cat',
                `/workspace/apps/${service}/src/live/${marker}`,
              ]);
            } catch {
              return '';
            }
          },
          { timeout: 60_000 },
        )
        .toBe('export const watchProof = true;');
      assertSourceExclusions(service, 'live/');
      // Also prove subsequent nested edits and deletion propagate after arrival.
      await writeFile(join(source, 'nested', 'safe.ts'), 'export const nestedProof = true;\n');
      await expect
        .poll(
          () => {
            try {
              return compose([
                'exec',
                '-T',
                service,
                'cat',
                `/workspace/apps/${service}/src/live/nested/safe.ts`,
              ]);
            } catch {
              return '';
            }
          },
          { timeout: 60_000 },
        )
        .toBe('export const nestedProof = true;');
      assertSourceExclusions(service, 'live/');
      await rm(join(source, marker));
      await expect
        .poll(
          () => {
            try {
              return compose([
                'exec',
                '-T',
                service,
                'sh',
                '-c',
                `test ! -e /workspace/apps/${service}/src/live/${marker} && echo deleted`,
              ]);
            } catch {
              return '';
            }
          },
          { timeout: 60_000 },
        )
        .toBe('deleted');
    }
    expect(['api', 'web'].map((service) => image(service))).toEqual(images);
    expect(['api', 'web'].map((service) => compose(['ps', '-q', service]))).toEqual(containers);
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
      await rm(join(directory, 'apps', service, 'src', 'live'), { recursive: true, force: true });
    }
  }
});

test('database survives recreation, failed migrations block API startup, and browser readiness recovers', async ({
  page,
}) => {
  test.setTimeout(180_000);
  // Drain/stop Watch before container recreation: queued source cleanup events
  // must not race the deliberately failed migration by restarting the API.
  await stopWatcher();
  compose(['up', '-d', '--no-build', '--wait', '--wait-timeout', '120']);
  webUrl = `http://${compose(['port', 'web', '5173'])}`;
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
RUN ${[
      ...[
        '.env',
        '.pi',
        'ports.yaml',
        'compose.yaml',
        'unapproved-root/canary.ts',
        'apps/api/unapproved/canary.ts',
        'packages/unapproved/canary.ts',
        'patches/unapproved-canary.ts',
        'tests/e2e/canary.ts',
      ],
      ...['apps/api/src', 'apps/web/src', 'packages/shared/src', 'packages/content/src'].flatMap(
        (source) => excluded.map((path) => `${source}/${path}`),
      ),
    ]
      .map((path) => `test ! -e /context/${path}`)
      .join(' && ')}
RUN ${[
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'tsconfig.base.json',
      'apps/api/package.json',
      'apps/api/tsconfig.json',
      'apps/api/src/app.module.ts',
      'apps/api/src/database/migrations/0001_platform.sql',
      'apps/web/package.json',
      'apps/web/tsconfig.json',
      'apps/web/src/app.tsx',
      'apps/web/vite.config.ts',
      'apps/web/index.html',
      'packages/shared/package.json',
      'packages/shared/tsconfig.json',
      'packages/shared/src/index.ts',
      'packages/shared/src/generated/api.ts',
      'packages/content/package.json',
      'packages/content/tsconfig.json',
      'packages/content/src/index.ts',
      'patches/drizzle-orm@0.45.2.patch',
      'tests/e2e/package.json',
    ]
      .map((path) => `test -f /context/${path}`)
      .join(' && ')}
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

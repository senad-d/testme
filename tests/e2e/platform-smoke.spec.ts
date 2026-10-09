import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const root = fileURLToPath(new URL('../..', import.meta.url));
const project = `mobey-platform-${randomUUID()}`;
const apiImage = `${project}-api`;
const webImage = `${project}-web`;
const proxyImage = `${project}-proxy`;
let directory: string;
let stackWritten = false;
let webUrl: string;
const builtImages: string[] = [];

function docker(args: string[]): string {
  return execFileSync('docker', args, {
    cwd: directory,
    encoding: 'utf8',
    timeout: 600_000,
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function compose(args: string[]): string {
  return docker([
    'compose',
    '--env-file',
    '/dev/null',
    '--project-name',
    project,
    '-f',
    'platform.yaml',
    ...args,
  ]);
}

test.beforeAll(async () => {
  test.setTimeout(900_000);
  directory = await mkdtemp(join(tmpdir(), 'mobey-platform-'));
  // Whitelisted source only: no host dependencies, .env, .pi or credential state.
  for (const path of [
    '.dockerignore',
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
    'tests/e2e/package.json',
  ]) {
    await cp(join(root, path), join(directory, path), {
      recursive: true,
      filter: (source) =>
        !/^(?:\.env(?:\..*)?|\.pi|\.git|\.DS_Store|node_modules|\.aws|\.azure|\.oci|\.ssh|\.config|\.npmrc|\.netrc|\.pgpass|\.git-credentials|credentials|dist|coverage|test-results)$/.test(
          basename(source),
        ) && !/\.(?:pem|key|p12|pfx|log|tsbuildinfo)$/.test(source),
    });
  }
  for (const [service, tag] of [
    ['api', apiImage],
    ['web', webImage],
  ] as const) {
    docker(['build', '--target', 'production', '-f', `apps/${service}/Dockerfile`, '-t', tag, '.']);
    builtImages.push(tag);
    expect(docker(['run', '--rm', '--entrypoint', 'id', tag, '-u'])).not.toBe('0');
  }
  // Add test-only routing to the same production-built static artifact, not AWS routing.
  // An image layer avoids host bind mounts (macOS temporary paths may not be VM-shared).
  await mkdir(join(directory, 'proxy'));
  await writeFile(
    join(directory, 'proxy/nginx.conf'),
    `server {
    listen 8080;
    root /usr/share/nginx/html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ { proxy_pass http://api:3000; }
  }\n`,
  );
  await writeFile(
    join(directory, 'proxy/Dockerfile'),
    `FROM ${webImage}\nCOPY nginx.conf /etc/nginx/conf.d/default.conf\n`,
  );
  docker(['build', '-f', 'proxy/Dockerfile', '-t', proxyImage, 'proxy']);
  builtImages.push(proxyImage);
  await writeFile(
    join(directory, 'platform.yaml'),
    `
x-api-environment: &api-environment
  NODE_ENV: test
  API_HOST: 0.0.0.0
  DATABASE_URL: postgresql://mobey:platform-smoke-only@db:5432/mobey
  DATABASE_POOL_MAX: '3'
  DATABASE_CONNECTION_TIMEOUT_MS: '5000'
  DATABASE_IDLE_TIMEOUT_MS: '1000'
  DATABASE_QUERY_TIMEOUT_MS: '5000'
  DATABASE_STATEMENT_TIMEOUT_MS: '5000'
services:
  db:
    image: postgres:17.11-alpine3.24@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73
    user: postgres
    environment:
      POSTGRES_DB: mobey
      POSTGRES_USER: mobey
      POSTGRES_PASSWORD: platform-smoke-only
    volumes: ['database:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U mobey -d mobey']
      interval: 2s
      timeout: 2s
      retries: 30
  migrate:
    image: ${apiImage}
    environment: *api-environment
    command: ['node', 'dist/database/migrate.js']
    depends_on:
      db: {condition: service_healthy}
    restart: 'no'
  api:
    image: ${apiImage}
    environment: *api-environment
    depends_on:
      migrate: {condition: service_completed_successfully}
    healthcheck:
      test: ['CMD', 'node', '-e', "fetch('http://127.0.0.1:3000/api/v1/health/ready').then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 2s
      timeout: 2s
      retries: 30
  web:
    image: ${proxyImage}
    ports: ['127.0.0.1::8080']
    depends_on:
      api: {condition: service_healthy}
volumes:
  database:
`,
  );
  stackWritten = true;
  // Dependencies enforce migration/readiness ordering; do not wait for the
  // one-shot migration container to remain running.
  compose(['up', '--detach']);
  const address = compose(['port', 'web', '8080']);
  expect(address).toMatch(/^127\.0\.0\.1:\d+$/);
  webUrl = `http://${address}`;
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
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  const failures: unknown[] = [];
  if (stackWritten) {
    try {
      compose(['down', '--volumes', '--remove-orphans']);
    } catch (error: unknown) {
      failures.push(error);
    }
  }
  for (const tag of [...builtImages].reverse()) {
    try {
      docker(['image', 'rm', tag]);
    } catch (error: unknown) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Cleanup failed for owned project ${project}; recovery files retained at ${directory}.`,
      { cause: new AggregateError(failures) },
    );
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('production-built web reaches the migrated API through same-origin routing', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    requests.push(request.url());
  });
  const readiness = page.waitForResponse(`${webUrl}/api/v1/health/ready`);
  await page.goto(webUrl);
  const response = await readiness;
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  expect(body).toEqual({ status: 'ok' });
  await expect(page.getByRole('heading', { name: 'Mobey', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /^API readiness:/ })).toHaveText(
    'API readiness: ready',
  );
  await expect(page.getByText('Build: 0.0.0', { exact: true })).toBeVisible();
  expect(requests.some((url) => /\/assets\/.*\.js$/.test(url))).toBe(true);
  expect(requests.some((url) => url.includes('/@vite/client'))).toBe(false);
  expect(
    compose([
      'exec',
      '-T',
      'db',
      'psql',
      '-U',
      'mobey',
      '-d',
      'mobey',
      '-Atc',
      'SELECT count(*) FROM mobey_platform.migrations;',
    ]),
  ).toBe('1');
});

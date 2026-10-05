import { readFileSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { HealthController } from '../dist/app.module.js';
import { createApplication } from '../dist/main.js';

const apiPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

// Exercise emitted Nest decorator metadata, as used by the running API.
let application: Awaited<ReturnType<typeof createApplication>>;

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', undefined);
  application = await createApplication();
  await application.init();
});

afterAll(async () => {
  await application?.close();
  vi.unstubAllEnvs();
});

describe('health version', () => {
  test('controller returns the API package semantic version on repeated reads', () => {
    const controller = application.get(HealthController);
    const expected = { version: apiPackage.version };

    expect(controller.version()).toEqual(expected);
    expect(controller.version()).toEqual(expected);
    expect(apiPackage.version).toMatch(
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/,
    );
  });

  test('GET /api/v1/health/version returns uncached JSON without a database', async () => {
    const response = await application.inject({ method: 'GET', url: '/api/v1/health/version' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ version: apiPackage.version });
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  test('preserves existing liveness and unavailable readiness responses', async () => {
    for (const [route, statusCode, status] of [
      ['live', 200, 'ok'],
      ['ready', 503, 'unavailable'],
    ] as const) {
      const response = await application.inject({ method: 'GET', url: `/api/v1/health/${route}` });

      expect(response.statusCode).toBe(statusCode);
      expect(response.json()).toEqual({ status });
      expect(response.headers['cache-control']).toBe('no-store');
    }
  });
});

import { readFileSync } from 'node:fs';

import type * as AppModule from '../src/app.module.js';
import type * as MainModule from '../src/main.js';

import {
  getApplicationDescription,
  getApplicationName,
  getApplicationVersion,
} from '@mobey/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

// API builds do not emit declarations. Use source types for the matching compiled
// modules while exercising emitted Nest decorator metadata at runtime.
const compiledApp: unknown = await import(new URL('../dist/app.module.js', import.meta.url).href);
const compiledMain: unknown = await import(new URL('../dist/main.js', import.meta.url).href);
const { HealthController } = compiledApp as typeof AppModule;
const { createApplication } = compiledMain as typeof MainModule;

const apiPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

let application: Awaited<ReturnType<typeof createApplication>>;
let http: FastifyInstance;
let closeApplication: (() => Promise<void>) | undefined;

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', undefined);
  application = await createApplication();
  closeApplication = () => application.close();
  await application.init();
  http = application.getHttpAdapter().getInstance();
});

afterAll(async () => {
  await closeApplication?.();
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

describe('GET /api/v1/version', () => {
  test('returns the shared application identity without allowing caches', async () => {
    const response = await http.inject('/api/v1/version');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      version: getApplicationVersion(),
      name: getApplicationName(),
      description: getApplicationDescription(),
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });
});

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { getApplicationName, getApplicationVersion } from '@mobey/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApplication } from '../src/main.js';

let application: NestFastifyApplication;
let http: FastifyInstance;

beforeAll(async () => {
  application = await createApplication();
  await application.init();
  http = application.getHttpAdapter().getInstance();
});

afterAll(async () => {
  await application?.close();
});

describe('GET /api/v1/version', () => {
  it('returns the shared application identity without allowing caches', async () => {
    const response = await http.inject('/api/v1/version');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      version: getApplicationVersion(),
      name: getApplicationName(),
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });
});

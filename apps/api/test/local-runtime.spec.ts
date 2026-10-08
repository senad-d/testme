import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createApplication } from '../src/main.js';
import { readRuntimeConfig } from '../src/runtime-config.js';

const LOCAL_CONFIGURATION = {
  AUTH_ALLOWLIST: 'mobey-development-only-parent@example.invalid',
  CSRF_SECRET: 'mobey-development-only-csrf',
  PIN_PEPPER: 'mobey-development-only-pin-pepper',
  PIN_BLIND_INDEX_SECRET: 'mobey-development-only-blind-index',
  SESSION_TOKEN_SECRET: 'mobey-development-only-session-token',
  DATABASE_URL: 'postgresql://mobey:mobey-development-only-database@db:5432/mobey',
  COOKIE_MODE: 'localhost-development',
} as const;

afterEach(() => vi.unstubAllEnvs());

describe('local runtime boundary', () => {
  test('defaults to loopback and secure mode while allowing an explicit container host', () => {
    expect(readRuntimeConfig({})).toEqual({ host: '127.0.0.1' });
    expect(readRuntimeConfig({ API_HOST: '0.0.0.0', NODE_ENV: 'production' })).toEqual({
      host: '0.0.0.0',
    });
  });

  test.each([' 0.0.0.0 ', '\t127.0.0.1\n'])(
    'trims surrounding whitespace from listen host %j',
    (host) => {
      expect(readRuntimeConfig({ API_HOST: host })).toEqual({ host: host.trim() });
    },
  );

  test.each(['', '   ', '\t\n'])(
    'defaults to loopback when listen host %j is empty after trimming',
    (host) => {
      expect(readRuntimeConfig({ API_HOST: host })).toEqual({ host: '127.0.0.1' });
    },
  );

  test.each([
    [' \t0.0.0.0\n', 'COOKIE_MODE', LOCAL_CONFIGURATION.COOKIE_MODE],
    [' \t\n', 'SESSION_TOKEN_SECRET', LOCAL_CONFIGURATION.SESSION_TOKEN_SECRET],
  ])(
    'rejects development-only setting with normalized host %j / %s in production',
    (host, name, value) => {
      expect(() =>
        readRuntimeConfig({ NODE_ENV: 'production', API_HOST: host, [name]: value }),
      ).toThrow(new Error('Invalid API runtime configuration.'));
    },
  );

  test.each(['unexpected.invalid', ' unexpected.invalid ', '0.0. 0.0', ' localhost '])(
    'rejects invalid listen host %j without exposing the value',
    (host) => {
      expect(() => readRuntimeConfig({ API_HOST: host })).toThrow(
        new Error('Invalid API runtime configuration.'),
      );
    },
  );

  test('rejects encoded local credentials without rejecting percent signs in opaque settings', () => {
    expect(() =>
      readRuntimeConfig({
        NODE_ENV: 'production',
        DATABASE_URL: LOCAL_CONFIGURATION.DATABASE_URL.replace(
          'mobey-development-only-',
          '%6dobey-development-only-',
        ),
      }),
    ).toThrow('Invalid API runtime configuration.');
    expect(() =>
      readRuntimeConfig({ NODE_ENV: 'production', CSRF_SECRET: 'synthetic-test-100%' }),
    ).not.toThrow();
  });
  test.each(['%', '%ZZ', '%C0%AF'])(
    'rejects malformed database URL encoding %s without exposing configuration',
    (encoding) => {
      expect(() =>
        readRuntimeConfig({
          NODE_ENV: 'production',
          DATABASE_URL: `postgresql://synthetic:${encoding}@database.invalid/mobey`,
        }),
      ).toThrow(new Error('Invalid API runtime configuration.'));
    },
  );

  test.each(['production', 'test', 'staging', undefined])(
    'rejects each local setting before API creation with NODE_ENV=%s',
    async (mode) => {
      vi.stubEnv('NODE_ENV', mode);
      for (const [name, value] of Object.entries(LOCAL_CONFIGURATION)) {
        vi.stubEnv(name, value);
        await expect(
          createApplication().then((application) => application.close()),
        ).rejects.toThrow('Invalid API runtime configuration.');
        vi.stubEnv(name, undefined);
      }
    },
  );

  test('accepts explicit synthetic development settings without implementing authentication', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    for (const [name, value] of Object.entries(LOCAL_CONFIGURATION)) {
      vi.stubEnv(name, value);
    }
    const application = await createApplication();
    await application.close();
  });

  test('rejects unknown cookie modes and invalid listen hosts', async () => {
    vi.stubEnv('COOKIE_MODE', 'insecure');
    await expect(createApplication().then((application) => application.close())).rejects.toThrow(
      'Invalid API runtime configuration.',
    );
    vi.stubEnv('COOKIE_MODE', 'secure');
    vi.stubEnv('API_HOST', 'unexpected.invalid');
    await expect(createApplication().then((application) => application.close())).rejects.toThrow(
      'Invalid API runtime configuration.',
    );
  });

  test('CLI refuses local secrets in production with only generic output', () => {
    const result = spawnSync(process.execPath, ['dist/main.js'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      env: { ...process.env, ...LOCAL_CONFIGURATION, NODE_ENV: 'production' },
      timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('API startup failed.\n');
  });
});

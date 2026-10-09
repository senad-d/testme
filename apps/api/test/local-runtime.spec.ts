import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import type { FastifyInstance } from 'fastify';
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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('local runtime boundary', () => {
  test('defaults to loopback and secure mode while allowing an explicit container host', () => {
    expect(readRuntimeConfig({})).toEqual({ host: '127.0.0.1' });
    expect(readRuntimeConfig({ API_HOST: '127.0.0.1', NODE_ENV: 'production' })).toEqual({
      host: '127.0.0.1',
    });
    expect(readRuntimeConfig({ API_HOST: '0.0.0.0', NODE_ENV: 'production' })).toEqual({
      host: '0.0.0.0',
      port: 3000,
    });
  });

  test.each([
    ['1', 1],
    ['43210', 43210],
    ['65535', 65535],
    ['03000', 3000],
  ] as const)('accepts decimal integer port %s as a number', (port, expected) => {
    expect(readRuntimeConfig({ API_PORT: port })).toEqual({
      host: '127.0.0.1',
      port: expected,
    });
  });

  test.each([
    '',
    ' ',
    ' 3000 ',
    '0',
    '-1',
    '65536',
    '999999999999999999999999999999999999',
    '1.5',
    '3000.0',
    '3e3',
    '0xBB8',
    '+3000',
    '3000synthetic',
    'NaN',
    'Infinity',
    '３０００',
    '3000\n',
  ])('rejects malformed or out-of-range port %j without exposing it', (port) => {
    expect(() => readRuntimeConfig({ API_PORT: port })).toThrow(
      new Error('Invalid API runtime configuration.'),
    );
  });

  test('rejects an invalid port before Nest application creation', async () => {
    vi.stubEnv('API_PORT', 'synthetic-invalid-port');
    const create = vi
      .spyOn(NestFactory, 'create')
      .mockRejectedValue(new Error('Nest creation must not be reached.'));
    await expect(createApplication()).rejects.toThrow('Invalid API runtime configuration.');
    expect(create).not.toHaveBeenCalled();
  });

  test('CLI refuses an invalid port with only generic output', () => {
    const result = spawnSync(process.execPath, ['dist/main.js'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      env: { NODE_ENV: 'test', API_PORT: 'synthetic-invalid-port' },
      timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('API startup failed.\n');
  });

  test.each(['plain', 'zero-prefixed'] as const)(
    'CLI bootstrap serves liveness on an isolated %s custom port',
    async (format) => {
      const reservation = createServer();
      reservation.listen(0, '127.0.0.1');
      await once(reservation, 'listening');
      const address = reservation.address();
      await new Promise<void>((resolve, reject) => {
        reservation.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      if (address === null || typeof address === 'string') {
        throw new Error('Expected a loopback TCP port.');
      }
      expect(address.port).not.toBe(3000);

      const child = spawn(process.execPath, ['dist/main.js'], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env: {
          NODE_ENV: 'test',
          API_HOST: '127.0.0.1',
          API_PORT:
            format === 'zero-prefixed' ? `000${String(address.port)}` : String(address.port),
          COOKIE_MODE: 'secure',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const closed = once(child, 'close');
      let output = '';
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      child.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });
      try {
        let response: Response | undefined;
        const deadline = Date.now() + 10_000;
        while (Date.now() < deadline && child.exitCode === null && response === undefined) {
          response = await fetch(`http://127.0.0.1:${String(address.port)}/api/v1/health/live`, {
            signal: AbortSignal.timeout(500),
          }).catch(() => undefined);
          if (response === undefined) await setTimeout(50);
        }
        expect(response?.status).toBe(200);
        expect(child.exitCode).toBeNull();
        expect(output).toBe('');
      } finally {
        if (child.exitCode === null) child.kill('SIGTERM');
        await closed;
      }
    },
    20_000,
  );

  test('CLI refuses an occupied custom port with only generic output', async () => {
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    try {
      const address = reservation.address();
      if (address === null || typeof address === 'string') {
        throw new Error('Expected a loopback TCP port.');
      }
      const result = spawnSync(process.execPath, ['dist/main.js'], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        encoding: 'utf8',
        env: {
          NODE_ENV: 'test',
          API_HOST: '127.0.0.1',
          API_PORT: String(address.port),
          COOKIE_MODE: 'secure',
        },
        timeout: 10_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('API startup failed.\n');
    } finally {
      await new Promise<void>((resolve, reject) => {
        reservation.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });

  test.each([undefined, 'development', 'production'])(
    'normalizes localhost to IPv4 loopback with NODE_ENV=%s',
    (mode) => {
      expect(readRuntimeConfig({ API_HOST: 'localhost', NODE_ENV: mode })).toEqual({
        host: '127.0.0.1',
      });
    },
  );

  test.each([
    '',
    '::1',
    'LOCALHOST',
    ' localhost ',
    'localhost.',
    '127.0.0.2',
    'unexpected.invalid',
  ])('rejects unsupported host %s without exposing configuration', (host) => {
    expect(() => readRuntimeConfig({ API_HOST: host })).toThrow(
      new Error('Invalid API runtime configuration.'),
    );
  });

  test('localhost does not bypass production guards for local settings or unknown cookie modes', () => {
    for (const [name, value] of Object.entries(LOCAL_CONFIGURATION)) {
      expect(() =>
        readRuntimeConfig({ API_HOST: 'localhost', NODE_ENV: 'production', [name]: value }),
      ).toThrow(new Error('Invalid API runtime configuration.'));
    }
    expect(() =>
      readRuntimeConfig({
        API_HOST: 'localhost',
        NODE_ENV: 'development',
        COOKIE_MODE: 'insecure',
      }),
    ).toThrow(new Error('Invalid API runtime configuration.'));
    expect(
      readRuntimeConfig({ ...LOCAL_CONFIGURATION, API_HOST: 'localhost', NODE_ENV: 'development' }),
    ).toEqual({ host: '127.0.0.1' });
  });

  test('compiled API accepts localhost and serves liveness on IPv4 loopback', async () => {
    vi.stubEnv('API_HOST', 'localhost');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_MODE', 'secure');
    for (const name of Object.keys(LOCAL_CONFIGURATION)) {
      if (name !== 'COOKIE_MODE') vi.stubEnv(name, undefined);
    }
    // Exercise emitted Nest decorator metadata, as in the health/version suite.
    const compiledMain: unknown = await import(new URL('../dist/main.js', import.meta.url).href);
    const { createApplication: createCompiledApplication } = compiledMain as {
      createApplication: typeof createApplication;
    };
    const application = await createCompiledApplication();
    try {
      await application.listen(0, readRuntimeConfig().host);
      const http: FastifyInstance = application.getHttpAdapter().getInstance();
      expect(http.server.address()).toMatchObject({ address: '127.0.0.1', family: 'IPv4' });
      const liveness = await fetch(`${await application.getUrl()}/api/v1/health/live`, {
        signal: AbortSignal.timeout(3_000),
      });
      expect(liveness.status).toBe(200);
      expect(await liveness.json()).toEqual({ status: 'ok' });
    } finally {
      await application.close();
    }
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

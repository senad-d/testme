import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgPolicy, pgRole, pgTable, text } from 'drizzle-orm/pg-core';
import type { Pool } from 'pg';
import ts from 'typescript';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { createApplication } from '../src/main.js';
import {
  createDatabaseConnection,
  type DatabaseEnvironment,
  readDatabaseConfig,
} from '../src/database/client.js';
import {
  DEFAULT_MIGRATIONS_DIRECTORY,
  migrateDatabase,
  MigrationIntegrityError,
} from '../src/database/migrate.js';

const POSTGRESQL_IMAGE =
  'postgres:17.11-alpine3.24@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73';

const DATABASE_SETTINGS = {
  DATABASE_CONNECTION_TIMEOUT_MS: '5000',
  DATABASE_IDLE_TIMEOUT_MS: '1000',
  DATABASE_POOL_MAX: '3',
  DATABASE_QUERY_TIMEOUT_MS: '5000',
  DATABASE_STATEMENT_TIMEOUT_MS: '5000',
  NODE_ENV: 'test',
} as const;

let container: StartedPostgreSqlContainer;
let pool: Pool;
let closeResources: () => Promise<void> = () => Promise.resolve();

function databaseEnvironment(
  databaseUrl: string,
  overrides: DatabaseEnvironment = {},
): DatabaseEnvironment {
  return {
    ...DATABASE_SETTINGS,
    DATABASE_URL: databaseUrl,
    ...overrides,
  };
}

async function requestReadiness(
  databaseUrl: string,
): Promise<Readonly<{ body: unknown; status: number }>> {
  const names = [...Object.keys(DATABASE_SETTINGS), 'DATABASE_URL'] as const;
  const previous = new Map(names.map((name) => [name, process.env[name]]));

  Object.assign(process.env, databaseEnvironment(databaseUrl));
  let application: Awaited<ReturnType<typeof createApplication>> | undefined;

  try {
    application = await createApplication();
    await application.init();
    const response = await application.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    return {
      body: response.json(),
      status: response.statusCode,
    };
  } finally {
    await application?.close();

    for (const [name, value] of previous) {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, name);
      } else {
        process.env[name] = value;
      }
    }
  }
}

describe('platform tooling without a database', () => {
  test('reports API readiness unavailable when PostgreSQL cannot be reached', async () => {
    await expect(requestReadiness('postgresql://127.0.0.1:1/mobey')).resolves.toEqual({
      body: { status: 'unavailable' },
      status: 503,
    });
  });

  test('validates explicit bounds and forces verified TLS outside local environments', () => {
    const url = 'postgresql://database.invalid/mobey?sslmode=disable&statement_timeout=0';
    const config = readDatabaseConfig(databaseEnvironment(url, { NODE_ENV: 'production' }));
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(new URL(config.connectionString).searchParams.get('sslmode')).toBe('verify-full');
    expect(new URL(config.connectionString).searchParams.has('statement_timeout')).toBe(false);

    for (const name of Object.keys(DATABASE_SETTINGS).filter((key) => key !== 'NODE_ENV')) {
      for (const value of [undefined, '', '0', '-1', '1.5', ' 1', '9007199254740992']) {
        expect(() => readDatabaseConfig(databaseEnvironment(url, { [name]: value }))).toThrow();
      }
    }
  });

  test('rejects timeout values that exceed the Node/PostgreSQL signed 32-bit range', () => {
    const url = 'postgresql://database.invalid/mobey';
    const timeoutNames = Object.keys(DATABASE_SETTINGS).filter((name) =>
      name.endsWith('_TIMEOUT_MS'),
    );

    expect(timeoutNames).toHaveLength(4);

    for (const name of timeoutNames) {
      expect(() =>
        readDatabaseConfig(databaseEnvironment(url, { [name]: '2147483647' })),
      ).not.toThrow();

      for (const value of ['2147483648', '2592000000', '9007199254740991']) {
        expect(() => readDatabaseConfig(databaseEnvironment(url, { [name]: value }))).toThrow(
          `Database timeout exceeds the signed 32-bit millisecond range: ${name}.`,
        );
      }
    }
  });

  test('declarations retain typed queries and reject invalid columns and values', () => {
    const apiDirectory = fileURLToPath(new URL('..', import.meta.url));
    const configPath = join(apiDirectory, 'tsconfig.json');
    const config = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
    expect(config.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
    expect(parsed.errors).toEqual([]);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.skipLibCheck).toBe(false);
    expect(parsed.options.exactOptionalPropertyTypes).toBe(true);

    const fixturePath = join(apiDirectory, '__declaration_fixture.ts');
    const fixture = `
      import type { DatabaseConnection } from './src/database/client.js';
      import { pgTable, text } from 'drizzle-orm/pg-core';
      const fixture = pgTable('type_fixture', { id: text().notNull() });
      type IsAny<T> = 0 extends (1 & T) ? true : false;
      export const clientIsTyped: IsAny<DatabaseConnection['database']> = false;
      export async function select(connection: DatabaseConnection): Promise<{ id: string }[]> {
        return connection.database.select({ id: fixture.id }).from(fixture);
      }
      export function insert(connection: DatabaseConnection) {
        return connection.database.insert(fixture).values({ id: 'synthetic' }).toSQL();
      }
    `;
    const diagnostics = (source: string): readonly ts.Diagnostic[] => {
      const options = { ...parsed.options, noEmit: true, rootDir: apiDirectory };
      const host = ts.createCompilerHost(options);
      const getSourceFile = host.getSourceFile.bind(host);
      host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) =>
        name === fixturePath
          ? ts.createSourceFile(name, source, languageVersion, true)
          : getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
      return ts.getPreEmitDiagnostics(ts.createProgram([fixturePath], options, host));
    };

    expect(diagnostics(fixture).map((diagnostic) => diagnostic.messageText)).toEqual([]);
    const invalid = fixture
      .replace("id: 'synthetic'", 'id: 123')
      .replace('id: fixture.id', 'id: fixture.missing');
    expect(
      diagnostics(invalid)
        .map((diagnostic) => diagnostic.code)
        .toSorted(),
    ).toEqual([2339, 2769]);
  }, 30_000);

  test('patched PostgreSQL declarations describe the unchanged runtime', async () => {
    const connection = createDatabaseConnection(
      readDatabaseConfig(databaseEnvironment('postgresql://database.invalid/mobey')),
    );
    const fixture = pgTable('type_fixture', { id: text().notNull() });
    const database = drizzle(connection.pool, { schema: { fixture } });

    try {
      expect(connection.database.$client).toBe(connection.pool);
      expect(connection.database.select({ id: fixture.id }).from(fixture).toSQL()).toEqual({
        sql: 'select "id" from "type_fixture"',
        params: [],
      });
      expect(database.query.fixture.findMany().getSQL()).toBeInstanceOf(SQL);
      expect(pgPolicy('synthetic_policy')).toMatchObject({ as: undefined, using: undefined });
      expect(pgRole('synthetic_role', { createDb: false })).toMatchObject({
        createDb: false,
        createRole: undefined,
        inherit: undefined,
      });
    } finally {
      await connection.pool.end();
    }
  });

  test('migration CLI fails closed without exposing connection credentials', () => {
    const result = spawnSync(process.execPath, ['dist/database/migrate.js'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      env: {
        ...process.env,
        ...databaseEnvironment('postgresql://synthetic:synthetic@127.0.0.1:1/mobey'),
      },
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Database migration failed.\n');
  });
});

describe('platform PostgreSQL migration discipline', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer(POSTGRESQL_IMAGE).start();
    closeResources = async () => {
      await container.stop();
    };

    pool = createDatabaseConnection(
      readDatabaseConfig(databaseEnvironment(container.getConnectionUri())),
    ).pool;
    closeResources = async () => {
      try {
        await pool.end();
      } finally {
        await container.stop();
      }
    };
  }, 120_000);

  beforeEach(async () => {
    await pool.query('DROP SCHEMA IF EXISTS mobey_platform CASCADE');
  });

  afterAll(async () => closeResources());

  test('requires TLS outside local environments and preserves bounded pool settings', async () => {
    const bypassUrl = new URL(container.getConnectionUri());
    bypassUrl.searchParams.set('application_name', 'bypass');
    bypassUrl.searchParams.set('query_timeout', '0');
    bypassUrl.searchParams.set('sslmode', 'disable');
    bypassUrl.searchParams.set('statement_timeout', '0');

    const productionConfig = readDatabaseConfig(
      databaseEnvironment(bypassUrl.toString(), { NODE_ENV: 'production' }),
    );
    const localConfig = readDatabaseConfig(
      databaseEnvironment('postgresql://database.invalid/mobey'),
    );
    const productionConnection = createDatabaseConnection(productionConfig);
    const localConnection = createDatabaseConnection(localConfig);
    const errorOutput = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      expect(() => readDatabaseConfig(databaseEnvironment('sqlite://local/mobey'))).toThrow(
        'DATABASE_URL must be a valid PostgreSQL URL.',
      );
      expect(() =>
        readDatabaseConfig(
          databaseEnvironment(
            'postgresql://database.invalid/mobey?options=-c%20statement_timeout=0',
          ),
        ),
      ).toThrow('DATABASE_URL must not override managed database connection settings.');
      expect(productionConfig).toMatchObject({
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 1000,
        max: 3,
        queryTimeoutMillis: 5000,
        statementTimeoutMillis: 5000,
        ssl: { rejectUnauthorized: true },
      });
      const normalizedUrl = new URL(productionConfig.connectionString);
      expect(normalizedUrl.searchParams.get('application_name')).toBeNull();
      expect(normalizedUrl.searchParams.get('query_timeout')).toBeNull();
      expect(normalizedUrl.searchParams.get('sslmode')).toBe('verify-full');
      expect(normalizedUrl.searchParams.get('statement_timeout')).toBeNull();
      expect(localConnection.pool.options).toMatchObject({
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 1000,
        max: 3,
        query_timeout: 5000,
        statement_timeout: 5000,
        ssl: false,
      });
      expect(localConnection.database.$client).toBe(localConnection.pool);
      expect(() =>
        localConnection.pool.emit('error', new Error('synthetic credential must stay redacted')),
      ).not.toThrow();
      expect(errorOutput).toHaveBeenCalledWith('An idle database connection failed.\n');
      expect(errorOutput).not.toHaveBeenCalledWith(expect.stringContaining('synthetic credential'));
      await expect(productionConnection.pool.query('SELECT 1')).rejects.toThrow();
    } finally {
      errorOutput.mockRestore();
      await Promise.all([localConnection.pool.end(), productionConnection.pool.end()]);
    }
  });

  test('reports API readiness unavailable before the required migration is applied', async () => {
    await expect(requestReadiness(container.getConnectionUri())).resolves.toEqual({
      body: { status: 'unavailable' },
      status: 503,
    });
  });

  test('applies the checked migration once to empty PostgreSQL and records exact ledger evidence', async () => {
    const migrationSql = await readFile(
      join(DEFAULT_MIGRATIONS_DIRECTORY, '0001_platform.sql'),
      'utf8',
    );

    await expect(migrateDatabase(pool)).resolves.toBe(1);
    await expect(migrateDatabase(pool)).resolves.toBe(0);

    const ledger = await pool.query<{
      checksum: string;
      migration_count: string;
      name: string;
      position: number;
    }>(
      `SELECT count(*) OVER ()::text AS migration_count, position, name, checksum
         FROM mobey_platform.migrations
        ORDER BY position`,
    );
    const platformTables = await pool.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'mobey_platform'
        ORDER BY table_name`,
    );

    expect(ledger.rows).toEqual([
      {
        checksum: createHash('sha256').update(migrationSql).digest('hex'),
        migration_count: '1',
        name: '0001_platform.sql',
        position: 1,
      },
    ]);
    expect(platformTables.rows).toEqual([{ table_name: 'migrations' }]);
  });

  test('serializes concurrent migration runners and records the migration once', async () => {
    const appliedCounts = await Promise.all([migrateDatabase(pool), migrateDatabase(pool)]);
    const ledgerCount = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM mobey_platform.migrations',
    );

    expect(appliedCounts.toSorted()).toEqual([0, 1]);
    expect(ledgerCount.rows).toEqual([{ count: '1' }]);
  });

  test('reports API readiness available only after the required migration is current', async () => {
    await migrateDatabase(pool);

    await expect(requestReadiness(container.getConnectionUri())).resolves.toEqual({
      body: { status: 'ok' },
      status: 200,
    });
  });

  test('keeps a previous compatible API ready after a newer migration is applied', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'mobey-migrations-'));

    try {
      const migrationSql = await readFile(
        join(DEFAULT_MIGRATIONS_DIRECTORY, '0001_platform.sql'),
        'utf8',
      );
      await Promise.all([
        writeFile(join(temporaryDirectory, '0001_platform.sql'), migrationSql),
        writeFile(
          join(temporaryDirectory, '0002_additive.sql'),
          'CREATE TABLE mobey_platform.additive (id integer PRIMARY KEY);\n',
        ),
      ]);

      await expect(migrateDatabase(pool, temporaryDirectory)).resolves.toBe(2);
      await expect(migrateDatabase(pool)).resolves.toBe(0);
      await expect(requestReadiness(container.getConnectionUri())).resolves.toEqual({
        body: { status: 'ok' },
        status: 200,
      });
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test('rolls back every schema and ledger write when a forward migration fails', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'mobey-migrations-'));

    try {
      const migrationSql = await readFile(
        join(DEFAULT_MIGRATIONS_DIRECTORY, '0001_platform.sql'),
        'utf8',
      );
      await Promise.all([
        writeFile(join(temporaryDirectory, '0001_platform.sql'), migrationSql),
        writeFile(
          join(temporaryDirectory, '0002_failing.sql'),
          `CREATE TABLE mobey_platform.partial_write (id integer PRIMARY KEY);\nSELECT * FROM mobey_platform.missing_table;\n`,
        ),
      ]);

      await expect(migrateDatabase(pool, temporaryDirectory)).rejects.toThrow();

      const residue = await pool.query<{ ledger: string | null; partial_write: string | null }>(
        `SELECT to_regclass('mobey_platform.migrations')::text AS ledger,
                to_regclass('mobey_platform.partial_write')::text AS partial_write`,
      );
      expect(residue.rows).toEqual([{ ledger: null, partial_write: null }]);
      await expect(requestReadiness(container.getConnectionUri())).resolves.toEqual({
        body: { status: 'unavailable' },
        status: 503,
      });
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test('rejects a changed checksum for an already-applied migration', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'mobey-migrations-'));

    try {
      await migrateDatabase(pool);
      const migrationSql = await readFile(
        join(DEFAULT_MIGRATIONS_DIRECTORY, '0001_platform.sql'),
        'utf8',
      );
      await writeFile(
        join(temporaryDirectory, '0001_platform.sql'),
        `${migrationSql}\n-- changed\n`,
      );

      await expect(migrateDatabase(pool, temporaryDirectory)).rejects.toBeInstanceOf(
        MigrationIntegrityError,
      );
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test('rejects an applied migration whose ledger order no longer matches source', async () => {
    await migrateDatabase(pool);
    await pool.query(
      `UPDATE mobey_platform.migrations
          SET name = '0002_out_of_order.sql'
        WHERE position = 1`,
    );

    try {
      await expect(migrateDatabase(pool)).rejects.toBeInstanceOf(MigrationIntegrityError);
    } finally {
      await pool.query(
        `UPDATE mobey_platform.migrations
            SET name = '0001_platform.sql'
          WHERE position = 1`,
      );
    }
  });

  test('rejects a noncontiguous newer migration ledger suffix', async () => {
    await migrateDatabase(pool);
    await pool.query(
      `INSERT INTO mobey_platform.migrations (position, name, checksum)
       VALUES (3, '0003_out_of_order.sql', $1)`,
      ['0'.repeat(64)],
    );

    await expect(migrateDatabase(pool)).rejects.toBeInstanceOf(MigrationIntegrityError);
    await expect(requestReadiness(container.getConnectionUri())).resolves.toEqual({
      body: { status: 'unavailable' },
      status: 503,
    });
  });
});

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Pool, PoolClient, QueryResultRow } from 'pg';

import { createDatabaseConnection, readDatabaseConfig } from './client.js';

const MIGRATION_FILE_PATTERN = /^(?<position>[0-9]{4})_[a-z0-9_]+\.sql$/;
const MIGRATION_LEDGER = 'mobey_platform.migrations';
const MIGRATION_LOCK_NAMESPACE = 1_297_044_037;
const MIGRATION_LOCK_KEY = 1;

export const DEFAULT_MIGRATIONS_DIRECTORY = fileURLToPath(
  new URL('../../src/database/migrations', import.meta.url),
);

type Migration = Readonly<{
  checksum: string;
  name: string;
  position: number;
  sql: string;
}>;

type AppliedMigration = Readonly<{
  checksum: string;
  name: string;
  position: number;
}>;

interface LedgerRow extends QueryResultRow {
  checksum: string;
  name: string;
  position: number;
}

interface LedgerReferenceRow extends QueryResultRow {
  ledger: string | null;
}

export class MigrationIntegrityError extends Error {
  override readonly name = 'MigrationIntegrityError';
}

function parseMigrationPosition(value: string): number {
  let position = 0;

  for (const digit of value) {
    position = position * 10 + digit.charCodeAt(0) - '0'.charCodeAt(0);
  }

  return position;
}

export async function loadMigrations(
  directory = DEFAULT_MIGRATIONS_DIRECTORY,
): Promise<readonly Migration[]> {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  if (names.length === 0) {
    throw new MigrationIntegrityError('No checked SQL migrations were found.');
  }

  const migrations = await Promise.all(
    names.map(async (name): Promise<Migration> => {
      const match = MIGRATION_FILE_PATTERN.exec(name);

      if (match?.groups === undefined) {
        throw new MigrationIntegrityError('A migration filename is invalid.');
      }

      const position = parseMigrationPosition(match.groups['position'] ?? '');
      const sql = await readFile(resolve(directory, name), 'utf8');

      if (position === 0 || sql.trim().length === 0) {
        throw new MigrationIntegrityError('A migration is empty or has an invalid position.');
      }

      return {
        checksum: createHash('sha256').update(sql).digest('hex'),
        name,
        position,
        sql,
      };
    }),
  );

  migrations.forEach((migration, index) => {
    const expectedPosition = index + 1;

    if (migration.position !== expectedPosition) {
      throw new MigrationIntegrityError('Checked SQL migrations are not contiguous and ordered.');
    }
  });

  return migrations;
}

async function readAppliedMigrations(client: PoolClient): Promise<readonly AppliedMigration[]> {
  const ledgerResult = await client.query<LedgerReferenceRow>('SELECT to_regclass($1) AS ledger', [
    MIGRATION_LEDGER,
  ]);

  const ledger = ledgerResult.rows[0]?.ledger;

  if (ledger === null || ledger === undefined) {
    return [];
  }

  const result = await client.query<LedgerRow>(
    'SELECT position, name, checksum FROM mobey_platform.migrations ORDER BY position',
  );

  return result.rows;
}

function assertCompatibleMigrationHistory(
  migrations: readonly Migration[],
  appliedMigrations: readonly AppliedMigration[],
): void {
  appliedMigrations.forEach((applied, index) => {
    const expectedPosition = index + 1;
    const nameMatch = MIGRATION_FILE_PATTERN.exec(applied.name);
    const namePosition = parseMigrationPosition(nameMatch?.groups?.['position'] ?? '');
    const expected = migrations[index];

    if (
      applied.position !== expectedPosition ||
      namePosition !== expectedPosition ||
      !/^[0-9a-f]{64}$/.test(applied.checksum) ||
      (expected !== undefined &&
        (applied.position !== expected.position ||
          applied.name !== expected.name ||
          applied.checksum !== expected.checksum))
    ) {
      throw new MigrationIntegrityError(
        'Applied migration order or checksum does not match source.',
      );
    }
  });
}

export async function migrateDatabase(
  pool: Pool,
  directory = DEFAULT_MIGRATIONS_DIRECTORY,
): Promise<number> {
  const migrations = await loadMigrations(directory);
  const client = await pool.connect();
  let releaseError: Error | undefined;

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [
      MIGRATION_LOCK_NAMESPACE,
      MIGRATION_LOCK_KEY,
    ]);

    const appliedMigrations = await readAppliedMigrations(client);
    assertCompatibleMigrationHistory(migrations, appliedMigrations);

    const pendingMigrations = migrations.slice(appliedMigrations.length);

    for (const migration of pendingMigrations) {
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO mobey_platform.migrations (position, name, checksum) VALUES ($1, $2, $3)',
        [migration.position, migration.name, migration.checksum],
      );
    }

    await client.query('COMMIT');
    return pendingMigrations.length;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      releaseError =
        rollbackError instanceof Error
          ? rollbackError
          : new Error('Database rollback failed with an unknown error.');
    }

    throw error;
  } finally {
    client.release(releaseError);
  }
}

export async function verifyDatabaseReadiness(
  pool: Pool,
  directory = DEFAULT_MIGRATIONS_DIRECTORY,
): Promise<boolean> {
  try {
    const migrations = await loadMigrations(directory);
    const client = await pool.connect();

    try {
      await client.query('SELECT 1');
      const appliedMigrations = await readAppliedMigrations(client);
      assertCompatibleMigrationHistory(migrations, appliedMigrations);
      return appliedMigrations.length >= migrations.length;
    } finally {
      client.release();
    }
  } catch {
    return false;
  }
}

async function run(): Promise<void> {
  const connection = createDatabaseConnection(readDatabaseConfig());

  try {
    await migrateDatabase(connection.pool);
    process.stdout.write('Database migrations are current.\n');
  } finally {
    await connection.pool.end();
  }
}

const entrypoint = process.argv[1];

if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  void run().catch(() => {
    process.stderr.write('Database migration failed.\n');
    process.exitCode = 1;
  });
}

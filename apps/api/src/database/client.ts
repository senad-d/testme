import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';

export type DatabaseEnvironment = Readonly<Record<string, string | undefined>>;

export type DatabaseConfig = Readonly<{
  connectionString: string;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number;
  queryTimeoutMillis: number;
  statementTimeoutMillis: number;
  ssl: false | Readonly<{ rejectUnauthorized: true }>;
}>;

export type DatabaseClient = NodePgDatabase & Readonly<{ $client: Pool }>;

export type DatabaseConnection = Readonly<{
  database: DatabaseClient;
  pool: Pool;
}>;

const REQUIRED_CONFIGURATION = {
  connectionTimeoutMillis: 'DATABASE_CONNECTION_TIMEOUT_MS',
  idleTimeoutMillis: 'DATABASE_IDLE_TIMEOUT_MS',
  max: 'DATABASE_POOL_MAX',
  queryTimeoutMillis: 'DATABASE_QUERY_TIMEOUT_MS',
  statementTimeoutMillis: 'DATABASE_STATEMENT_TIMEOUT_MS',
} as const;

function requireConfiguration(environment: DatabaseEnvironment, name: string): string {
  const value = environment[name];

  if (value === undefined || value.length === 0) {
    throw new Error(`Required database configuration is missing: ${name}.`);
  }

  return value;
}

function parsePositiveSafeInteger(value: string, name: string): number {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`Database configuration must be a positive integer: ${name}.`);
  }

  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed)) {
    throw new Error(`Database configuration is outside the safe integer range: ${name}.`);
  }

  return parsed;
}

function parseTimeoutMillis(value: string, name: string): number {
  const parsed = parsePositiveSafeInteger(value, name);

  // Node timers overflow to 1 ms above this limit; PostgreSQL statement_timeout also
  // uses a signed 32-bit millisecond value. This is a technical bound, not a capacity default.
  if (parsed > 2_147_483_647) {
    throw new Error(`Database timeout exceeds the signed 32-bit millisecond range: ${name}.`);
  }

  return parsed;
}

function isLocalEnvironment(environment: DatabaseEnvironment): boolean {
  return environment['NODE_ENV'] === 'development' || environment['NODE_ENV'] === 'test';
}

function normalizeConnectionString(connectionString: string, requireTls: boolean): string {
  let databaseUrl: URL;

  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (databaseUrl.protocol !== 'postgres:' && databaseUrl.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (databaseUrl.searchParams.has('options')) {
    throw new Error('DATABASE_URL must not override managed database connection settings.');
  }

  // pg gives URL parameters precedence over explicit PoolConfig values. Remove the settings
  // owned by this boundary so the validated timeout and application-name policy stays effective.
  databaseUrl.searchParams.delete('application_name');
  databaseUrl.searchParams.delete('query_timeout');
  databaseUrl.searchParams.delete('statement_timeout');

  if (requireTls) {
    // Force certificate and hostname verification so a URL cannot disable transport security.
    databaseUrl.searchParams.set('sslmode', 'verify-full');
  }

  return databaseUrl.toString();
}

export function readDatabaseConfig(environment: DatabaseEnvironment = process.env): DatabaseConfig {
  const localEnvironment = isLocalEnvironment(environment);

  return {
    connectionString: normalizeConnectionString(
      requireConfiguration(environment, 'DATABASE_URL'),
      !localEnvironment,
    ),
    connectionTimeoutMillis: parseTimeoutMillis(
      requireConfiguration(environment, REQUIRED_CONFIGURATION.connectionTimeoutMillis),
      REQUIRED_CONFIGURATION.connectionTimeoutMillis,
    ),
    idleTimeoutMillis: parseTimeoutMillis(
      requireConfiguration(environment, REQUIRED_CONFIGURATION.idleTimeoutMillis),
      REQUIRED_CONFIGURATION.idleTimeoutMillis,
    ),
    max: parsePositiveSafeInteger(
      requireConfiguration(environment, REQUIRED_CONFIGURATION.max),
      REQUIRED_CONFIGURATION.max,
    ),
    queryTimeoutMillis: parseTimeoutMillis(
      requireConfiguration(environment, REQUIRED_CONFIGURATION.queryTimeoutMillis),
      REQUIRED_CONFIGURATION.queryTimeoutMillis,
    ),
    statementTimeoutMillis: parseTimeoutMillis(
      requireConfiguration(environment, REQUIRED_CONFIGURATION.statementTimeoutMillis),
      REQUIRED_CONFIGURATION.statementTimeoutMillis,
    ),
    ssl: localEnvironment ? false : { rejectUnauthorized: true },
  };
}

export function createDatabaseConnection(config: DatabaseConfig): DatabaseConnection {
  const poolConfig: PoolConfig = {
    allowExitOnIdle: false,
    application_name: 'mobey-api',
    connectionString: config.connectionString,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    idleTimeoutMillis: config.idleTimeoutMillis,
    max: config.max,
    query_timeout: config.queryTimeoutMillis,
    statement_timeout: config.statementTimeoutMillis,
    ssl: config.ssl,
  };
  const pool = new Pool(poolConfig);

  // pg emits idle-client failures on the pool. An unhandled EventEmitter error would terminate
  // the API during a database restart instead of letting readiness report the outage.
  pool.on('error', () => {
    process.stderr.write('An idle database connection failed.\n');
  });

  return {
    database: drizzle(pool),
    pool,
  };
}

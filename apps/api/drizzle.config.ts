import { defineConfig } from 'drizzle-kit';

const environment: Readonly<Record<string, string | undefined>> = process.env;

function isLocalEnvironment(): boolean {
  return environment['NODE_ENV'] === 'development' || environment['NODE_ENV'] === 'test';
}

function databaseUrl(): string {
  const configuredUrl = environment['DATABASE_URL'];

  if (configuredUrl === undefined || configuredUrl.length === 0) {
    throw new Error('DATABASE_URL is required for Drizzle commands.');
  }

  try {
    const databaseUrl = new URL(configuredUrl);

    if (databaseUrl.protocol !== 'postgres:' && databaseUrl.protocol !== 'postgresql:') {
      throw new Error('invalid protocol');
    }

    if (!isLocalEnvironment()) {
      databaseUrl.searchParams.set('sslmode', 'verify-full');
    }

    return databaseUrl.toString();
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
}

export default defineConfig({
  breakpoints: false,
  dbCredentials: {
    url: databaseUrl(),
  },
  dialect: 'postgresql',
  out: './src/database/migrations',
  strict: true,
});

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

const LOCAL_CONFIGURATION_NAMES = [
  'AUTH_ALLOWLIST',
  'CSRF_SECRET',
  'PIN_PEPPER',
  'PIN_BLIND_INDEX_SECRET',
  'SESSION_TOKEN_SECRET',
  'DATABASE_URL',
] as const;

// A rejection boundary for the Compose health slice, not authentication policy.
// Future auth owners must validate their own required configuration and approved lifetimes.
export function readRuntimeConfig(environment: RuntimeEnvironment = process.env): Readonly<{
  host: '127.0.0.1' | '0.0.0.0';
}> {
  const configuredHost = environment['API_HOST']?.trim() ?? '';
  const host = configuredHost === '' ? '127.0.0.1' : configuredHost;
  const cookieMode = environment['COOKIE_MODE'] ?? 'secure';
  const development = environment['NODE_ENV'] === 'development';

  try {
    if (
      (host !== '127.0.0.1' && host !== '0.0.0.0') ||
      (cookieMode !== 'secure' && cookieMode !== 'localhost-development') ||
      (!development &&
        (cookieMode === 'localhost-development' ||
          LOCAL_CONFIGURATION_NAMES.some((name) => {
            const value = environment[name] ?? '';
            const decoded = name === 'DATABASE_URL' ? decodeURIComponent(value) : value;
            return decoded.includes('mobey-development-only-');
          })))
    ) {
      throw new Error('Invalid configuration.');
    }
  } catch {
    // Do not include configuration values, including malformed URLs, in errors.
    throw new Error('Invalid API runtime configuration.');
  }

  return { host };
}

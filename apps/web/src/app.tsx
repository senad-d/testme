import type { VersionControllerVersionResponse } from '@mobey/shared';
import { useEffect, useState } from 'react';

declare global {
  interface ImportMetaEnv {
    readonly MOBEY_PUBLIC_BUILD_VERSION?: string;
  }
}

const configuredBuildVersion: unknown = import.meta.env.MOBEY_PUBLIC_BUILD_VERSION;
const buildVersion =
  typeof configuredBuildVersion === 'string' && configuredBuildVersion.length > 0
    ? configuredBuildVersion
    : '0.0.0';

type Readiness = 'checking' | 'ready' | 'unavailable';

function isReadyResponse(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'status' in value && value.status === 'ok';
}

function isVersionResponse(value: unknown): value is VersionControllerVersionResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'version' in value &&
    typeof value.version === 'string' &&
    value.version.trim().length > 0 &&
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    typeof value.description === 'string'
  );
}

export function App() {
  const [readiness, setReadiness] = useState<Readiness>('checking');
  const [apiVersion, setApiVersion] = useState('checking');

  useEffect(() => {
    const request = new AbortController();

    const checkReadiness = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/health/ready', {
          headers: { Accept: 'application/json' },
          signal: request.signal,
        });
        const isSuccessfulReadinessResponse = response.status === 200;
        const body: unknown = isSuccessfulReadinessResponse ? await response.json() : undefined;
        setReadiness(
          isSuccessfulReadinessResponse && isReadyResponse(body) ? 'ready' : 'unavailable',
        );
      } catch {
        if (!request.signal.aborted) {
          setReadiness('unavailable');
        }
      }
    };

    void checkReadiness();

    return () => {
      request.abort();
    };
  }, []);

  useEffect(() => {
    const request = new AbortController();

    const checkVersion = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/version', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: request.signal,
        });
        const body: unknown = response.status === 200 ? await response.json() : undefined;
        if (!request.signal.aborted) {
          setApiVersion(isVersionResponse(body) ? body.version : 'unavailable');
        }
      } catch {
        if (!request.signal.aborted) {
          setApiVersion('unavailable');
        }
      }
    };

    void checkVersion();

    return () => {
      request.abort();
    };
  }, []);

  return (
    <main>
      <h1>Mobey</h1>
      <p>Build: {buildVersion}</p>
      <p role="status" aria-live="polite">
        API: {apiVersion}
      </p>
      <p role="status" aria-live="polite">
        API readiness: {readiness}
      </p>
    </main>
  );
}

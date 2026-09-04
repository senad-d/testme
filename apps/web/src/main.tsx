import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

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

function App() {
  const [readiness, setReadiness] = useState<Readiness>('checking');

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

  return (
    <main>
      <h1>Mobey</h1>
      <p>Build: {buildVersion}</p>
      <p role="status" aria-live="polite">
        API readiness: {readiness}
      </p>
    </main>
  );
}

const rootElement = document.querySelector('#root');

if (rootElement === null) {
  throw new Error('Web root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

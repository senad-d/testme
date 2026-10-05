import { getApplicationVersion } from '@mobey/shared';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { render } = vi.hoisted(() => ({ render: vi.fn<(node: ReactNode) => void>() }));

// Replace only browser mounting; render the actual application markup below.
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render }) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.resetModules();
});

async function renderApp(buildVersion: string | undefined): Promise<string> {
  vi.stubEnv('MOBEY_PUBLIC_BUILD_VERSION', buildVersion);
  vi.stubGlobal('document', { querySelector: () => ({}) });
  await import('./main.js');
  expect(render).toHaveBeenCalledOnce();
  return renderToStaticMarkup(render.mock.calls[0]?.[0]);
}

describe('web build version footer', () => {
  it.each([undefined, ''])('uses the shared version when configuration is %s', async (version) => {
    const markup = await renderApp(version);

    expect(markup).toContain(
      `<footer class="build-version" data-testid="build-version">Build: ${getApplicationVersion()}</footer>`,
    );
    expect(markup).toContain('<h1>Mobey</h1>');
    expect(markup).toContain('role="status" aria-live="polite"');
    expect(markup).toContain('API readiness:');
    expect(markup).toContain('>checking</span>');
    expect(markup.indexOf('</main>')).toBeLessThan(markup.indexOf('<footer'));
  });

  it('shows the configured web build version rather than the API version', async () => {
    const markup = await renderApp('1.2.3-web');

    expect(markup).toContain(
      '<footer class="build-version" data-testid="build-version">Build: 1.2.3-web</footer>',
    );
  });
});

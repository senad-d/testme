import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { App } from './app.js';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

it.each([
  [200, '{"status":"ok"}', 'ready'],
  [503, '{"status":"unavailable"}', 'unavailable'],
  [200, '{"status":"unexpected"}', 'unavailable'],
  [200, 'null', 'unavailable'],
  [200, '"ok"', 'unavailable'],
  [200, '{}', 'unavailable'],
  [200, '[{"status":"ok"}]', 'unavailable'],
  [201, '{"status":"ok"}', 'unavailable'],
  [200, 'invalid-json', 'unavailable'],
])('renders readiness for HTTP %s and %s', async (status, body, readiness) => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  await act(async () => {
    root.render(<App />);
    await Promise.resolve();
  });
  expect(container.querySelector('h1')?.textContent).toBe('Mobey');
  expect(container.textContent).toContain('Build: 0.0.0');
  expect(container.querySelector('[role="status"]')?.textContent).toBe(
    `API readiness: ${readiness}`,
  );
  expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/health/ready');
  expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ Accept: 'application/json' });
  const signal = fetchMock.mock.calls[0]?.[1]?.signal;
  expect(signal).toBeInstanceOf(AbortSignal);
  act(() => {
    root.unmount();
  });
  expect(signal?.aborted).toBe(true);
});

it('renders unavailable on network failure', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('synthetic failure')));
  await act(async () => {
    root.render(<App />);
    await Promise.resolve();
  });
  expect(container.querySelector('[role="status"]')?.textContent).toBe(
    'API readiness: unavailable',
  );
});

it('renders checking while a readiness request is pending', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockReturnValue(
      new Promise<Response>(() => {
        /* Deliberately pending until unmount. */
      }),
    ),
  );
  act(() => {
    root.render(<App />);
  });
  expect(container.querySelector('[role="status"]')?.textContent).toBe('API readiness: checking');
});

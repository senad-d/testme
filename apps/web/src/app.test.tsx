import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { App } from './app.js';

let container: HTMLDivElement;
let root: Root;

const versionBody = JSON.stringify({
  version: '1.2.3',
  name: 'Synthetic application',
  description: 'Synthetic description',
});

function mockEndpoints(overrides: Partial<Record<string, () => Promise<Response>>> = {}) {
  const endpoints: Record<string, () => Promise<Response>> = {
    '/api/v1/health/ready': () => Promise.resolve(new Response('{"status":"ok"}')),
    '/api/v1/version': () => Promise.resolve(new Response(versionBody)),
    ...overrides,
  };
  const fetchMock = vi.fn<typeof fetch>((input) => {
    if (typeof input !== 'string') throw new Error('Expected a test endpoint path');
    const endpoint = endpoints[input];
    if (!endpoint) throw new Error('Unexpected test endpoint');
    return endpoint();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderApp() {
  await act(async () => {
    root.render(<App />);
    await Promise.resolve();
  });
}

function statusParagraph(prefix: string) {
  return Array.from(container.querySelectorAll('p[role="status"]')).find((paragraph) =>
    paragraph.textContent.startsWith(prefix),
  );
}

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

it.each(['successful', 'pending', 'unavailable'] as const)(
  'renders accessible bottom-of-page navigation with %s endpoints',
  async (state) => {
    const endpoint = () =>
      state === 'pending'
        ? new Promise<Response>(() => {
            /* Deliberately pending until unmount. */
          })
        : Promise.reject<Response>(new Error('Synthetic endpoint failure'));
    mockEndpoints(
      state === 'successful'
        ? {}
        : { '/api/v1/health/ready': endpoint, '/api/v1/version': endpoint },
    );
    await renderApp();
    expect(statusParagraph('API:')?.textContent).toBe(
      `API: ${state === 'successful' ? '1.2.3' : state === 'pending' ? 'checking' : 'unavailable'}`,
    );
    expect(statusParagraph('API readiness:')?.textContent).toBe(
      `API readiness: ${state === 'successful' ? 'ready' : state === 'pending' ? 'checking' : 'unavailable'}`,
    );

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    const link = links.item(0);
    expect(link.textContent).toBe('Back to top');
    expect(link.getAttribute('href')).toBe('#top');
    expect(link.hasAttribute('tabindex')).toBe(false);

    const targets = container.querySelectorAll('#top');
    expect(targets).toHaveLength(1);
    const main = targets.item(0);
    expect(main.tagName).toBe('MAIN');
    expect(main.querySelector('h1')?.textContent).toBe('Mobey');
    expect(container.lastElementChild).toBe(main);
    const paragraph = link.parentElement;
    expect(paragraph?.tagName).toBe('P');
    if (!paragraph) throw new Error('Expected the navigation paragraph');
    expect(main.lastElementChild).toBe(paragraph);
    expect(paragraph.previousElementSibling).toBe(statusParagraph('API readiness:'));
    expect(paragraph.previousElementSibling?.previousElementSibling).toBe(statusParagraph('API:'));
    expect(link.closest('[role="status"], [role="alert"], [aria-live]')).toBeNull();
    expect(link.closest('[hidden], [aria-hidden="true"], [inert]')).toBeNull();
    for (const element of [main, paragraph, link]) {
      expect(getComputedStyle(element).display).not.toBe('none');
      expect(getComputedStyle(element).visibility).toBe('visible');
    }
  },
);

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
  const fetchMock = mockEndpoints({
    '/api/v1/health/ready': () => Promise.resolve(new Response(body, { status })),
  });
  await renderApp();
  expect(container.querySelector('h1')?.textContent).toBe('Mobey');
  expect(container.textContent).toContain('Build: 0.0.0');
  expect(statusParagraph('API readiness:')?.textContent).toBe(`API readiness: ${readiness}`);
  const readinessCall = fetchMock.mock.calls.find(([url]) => url === '/api/v1/health/ready');
  expect(readinessCall?.[1]?.headers).toEqual({ Accept: 'application/json' });
  const signal = readinessCall?.[1]?.signal;
  expect(signal).toBeInstanceOf(AbortSignal);
  act(() => {
    root.unmount();
  });
  expect(signal?.aborted).toBe(true);
});

it('renders readiness unavailable on network failure', async () => {
  mockEndpoints({
    '/api/v1/health/ready': () => Promise.reject(new Error('synthetic failure')),
  });
  await renderApp();
  expect(statusParagraph('API readiness:')?.textContent).toBe('API readiness: unavailable');
});

it('renders readiness checking while its request is pending', async () => {
  mockEndpoints({
    '/api/v1/health/ready': () =>
      new Promise<Response>(() => {
        /* Deliberately pending until unmount. */
      }),
  });
  await renderApp();
  expect(statusParagraph('API readiness:')?.textContent).toBe('API readiness: checking');
  expect(statusParagraph('API:')?.textContent).toBe('API: 1.2.3');
});

it('requests the API version with JSON Accept and shows checking next to Build', async () => {
  const fetchMock = mockEndpoints({
    '/api/v1/version': () =>
      new Promise<Response>(() => {
        /* Deliberately pending until unmount. */
      }),
  });
  await renderApp();
  const paragraph = statusParagraph('API:');
  expect(paragraph?.textContent).toBe('API: checking');
  expect(paragraph?.previousElementSibling?.textContent).toBe('Build: 0.0.0');
  expect(statusParagraph('API readiness:')?.textContent).toBe('API readiness: ready');
  const versionCall = fetchMock.mock.calls.find(([url]) => url === '/api/v1/version');
  expect(versionCall).toBeDefined();
  expect(versionCall?.[1]?.method).toBe('GET');
  expect(versionCall?.[1]?.headers).toEqual({ Accept: 'application/json' });
  expect(versionCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
});

it('renders the version field from a valid response independently of readiness', async () => {
  mockEndpoints({
    '/api/v1/health/ready': () => Promise.resolve(new Response('{}', { status: 503 })),
  });
  await renderApp();
  expect(statusParagraph('API:')?.textContent).toBe('API: 1.2.3');
  expect(statusParagraph('API readiness:')?.textContent).toBe('API readiness: unavailable');
});

it.each([
  [503, versionBody],
  [201, versionBody],
  [200, 'invalid-json'],
  [200, 'null'],
  [200, '"1.2.3"'],
  [200, '{}'],
  [200, `[${versionBody}]`],
  [200, '{"name":"Synthetic application","description":"Synthetic description"}'],
  [200, '{"version":123,"name":"Synthetic application","description":"Synthetic description"}'],
  [200, '{"version":null,"name":"Synthetic application","description":"Synthetic description"}'],
  [200, '{"version":"","name":"Synthetic application","description":"Synthetic description"}'],
  [200, '{"version":"  ","name":"Synthetic application","description":"Synthetic description"}'],
  [200, '{"version":"1.2.3"}'],
  [200, '{"version":"1.2.3","name":null,"description":"Synthetic description"}'],
  [200, '{"version":"1.2.3","name":"Synthetic application","description":123}'],
])('renders API unavailable for HTTP %s and %s', async (status, body) => {
  mockEndpoints({ '/api/v1/version': () => Promise.resolve(new Response(body, { status })) });
  await renderApp();
  expect(statusParagraph('API:')?.textContent).toBe('API: unavailable');
  expect(statusParagraph('API readiness:')?.textContent).toBe('API readiness: ready');
});

it('renders API unavailable on network failure without changing readiness', async () => {
  mockEndpoints({ '/api/v1/version': () => Promise.reject(new Error('synthetic failure')) });
  await renderApp();
  expect(statusParagraph('API:')?.textContent).toBe('API: unavailable');
  expect(statusParagraph('API readiness:')?.textContent).toBe('API readiness: ready');
});

it('renders untrusted version text without interpreting HTML', async () => {
  const version = '<img src=x onerror="alert(1)">';
  mockEndpoints({
    '/api/v1/version': () =>
      Promise.resolve(
        new Response(JSON.stringify({ version, name: 'Synthetic', description: '' })),
      ),
  });
  await renderApp();
  expect(statusParagraph('API:')?.textContent).toBe(`API: ${version}`);
  expect(container.querySelector('img')).toBeNull();
});

it.each([
  ['response', 'resolve'],
  ['response', 'reject'],
  ['JSON body', 'resolve'],
  ['JSON body', 'reject'],
] as const)(
  'preserves the current version after a stale %s %s during StrictMode replay',
  async (stage, outcome) => {
    let resolve!: () => void;
    let reject!: (reason: unknown) => void;
    const pending = new Promise<void>((resolvePending, rejectPending) => {
      resolve = resolvePending;
      reject = rejectPending;
    });
    const staleBody = { version: '9.9.9', name: 'Synthetic', description: '' };
    const staleResponse = new Response(JSON.stringify(staleBody));
    if (stage === 'JSON body') {
      vi.spyOn(staleResponse, 'json').mockImplementation(() => pending.then(() => staleBody));
    }
    let versionRequests = 0;
    mockEndpoints({
      '/api/v1/version': () => {
        versionRequests += 1;
        if (versionRequests > 1) return Promise.resolve(new Response(versionBody));
        return stage === 'response'
          ? pending.then(() => staleResponse)
          : Promise.resolve(staleResponse);
      },
    });
    await act(async () => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
      await Promise.resolve();
    });
    expect(statusParagraph('API:')?.textContent).toBe('API: 1.2.3');
    await act(async () => {
      if (outcome === 'resolve') resolve();
      else reject(new Error('Synthetic stale request failure'));
      await pending.catch(() => undefined);
    });
    expect(statusParagraph('API:')?.textContent).toBe('API: 1.2.3');
    expect(statusParagraph('API readiness:')?.textContent).toBe('API readiness: ready');
  },
);

it.each(['resolve', 'reject'] as const)(
  'aborts both requests on unmount and ignores a late version %s',
  async (outcome) => {
    let resolve!: (response: Response) => void;
    let reject!: (reason: unknown) => void;
    const pending = new Promise<Response>((resolveResponse, rejectResponse) => {
      resolve = resolveResponse;
      reject = rejectResponse;
    });
    const fetchMock = mockEndpoints({ '/api/v1/version': () => pending });
    await renderApp();
    const versionSignal = fetchMock.mock.calls.find(([url]) => url === '/api/v1/version')?.[1]
      ?.signal;
    const readinessSignal = fetchMock.mock.calls.find(
      ([url]) => url === '/api/v1/health/ready',
    )?.[1]?.signal;
    expect(versionSignal?.aborted).toBe(false);
    expect(versionSignal).not.toBe(readinessSignal);
    act(() => {
      root.unmount();
    });
    expect(versionSignal?.aborted).toBe(true);
    expect(readinessSignal?.aborted).toBe(true);
    await act(async () => {
      if (outcome === 'resolve') resolve(new Response(versionBody));
      else reject(new DOMException('Synthetic abort', 'AbortError'));
      await Promise.resolve();
    });
    expect(container.childElementCount).toBe(0);
  },
);

/**
 * @jest-environment node
 */

/**
 * Tests for the VintaSend proxy route.
 *
 * This route is what keeps `VINTASEND_API_KEY` out of the browser, so the two
 * things worth pinning down are that it never forwards a request it has not
 * authenticated, and that it never answers one without attaching the key. The
 * rest is relaying: path, query, body, status and the error envelope have to
 * survive the hop, or the core's error helpers stop working in the browser.
 */

const isAuthenticated = jest.fn();
const resolveAuthStrategy: jest.Mock = jest.fn(() => ({ isAuthenticated }));
const assertValidAuthConfig: jest.Mock = jest.fn();

jest.mock('@/lib/auth', () => ({
  resolveAuthStrategy: (...args: unknown[]) => resolveAuthStrategy(...(args as [])),
}));

jest.mock('@/lib/auth/validate-config', () => ({
  assertValidAuthConfig: (...args: unknown[]) => assertValidAuthConfig(...(args as [])),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/vintasend/[...path]/route';

const fetchMock = jest.fn();

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });

const request = (url: string, init?: RequestInit) =>
  new NextRequest(`https://dashboard.test${url}`, init as never);

const upstream = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const savedEnv = {
  url: process.env.VINTASEND_API_URL,
  key: process.env.VINTASEND_API_KEY,
};

beforeEach(() => {
  jest.clearAllMocks();
  isAuthenticated.mockResolvedValue(true);
  resolveAuthStrategy.mockReturnValue({ isAuthenticated });
  fetchMock.mockResolvedValue(upstream({ data: [] }));
  global.fetch = fetchMock as unknown as typeof fetch;

  process.env.VINTASEND_API_URL = 'https://api.test';
  process.env.VINTASEND_API_KEY = 'secret-key';
});

afterEach(() => {
  for (const [name, value] of [
    ['VINTASEND_API_URL', savedEnv.url],
    ['VINTASEND_API_KEY', savedEnv.key],
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

/** The Request the route handed to fetch. */
const forwarded = () => fetchMock.mock.calls[0] as [URL, RequestInit];

describe('authentication', () => {
  it('answers 401 as JSON, not a redirect, when the session is gone', async () => {
    isAuthenticated.mockResolvedValue(false);

    const response = await GET(request('/api/vintasend/api/v1/notifications'), context([
      'api',
      'v1',
      'notifications',
    ]));

    expect(response.status).toBe(401);
    // A fetch cannot follow a redirect to an HTML sign-in page usefully.
    await expect(response.json()).resolves.toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Your session has expired. Sign in again.' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates the auth configuration before trusting the answer', async () => {
    await GET(request('/api/vintasend/api/v1/notifications'), context(['api', 'v1', 'notifications']));

    expect(assertValidAuthConfig).toHaveBeenCalled();
  });

  it('answers 500, never 401, when the dashboard itself is misconfigured', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    resolveAuthStrategy.mockImplementation(() => {
      throw new Error('AUTH_PROVIDER env var is required');
    });

    const response = await GET(request('/api/vintasend/health'), context(['health']));

    // Reading a deployment fault as "signed out" would send every user to a
    // sign-in page that cannot fix it.
    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe('INTERNAL_ERROR');
    expect(fetchMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('configuration', () => {
  it.each(['VINTASEND_API_URL', 'VINTASEND_API_KEY'])(
    'refuses to forward anything when %s is missing',
    async (name) => {
      delete process.env[name];

      const response = await GET(request('/api/vintasend/health'), context(['health']));

      expect(response.status).toBe(500);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

describe('forwarding', () => {
  it('attaches the API key the browser never sees', async () => {
    await GET(request('/api/vintasend/api/v1/notifications'), context(['api', 'v1', 'notifications']));

    const [, init] = forwarded();
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key');
  });

  it('rebuilds the upstream path from the catch-all segments', async () => {
    await GET(request('/api/vintasend/api/v1/notifications'), context(['api', 'v1', 'notifications']));

    expect(String(forwarded()[0])).toBe('https://api.test/api/v1/notifications');
  });

  it('carries the query string through untouched', async () => {
    await GET(
      request('/api/vintasend/api/v1/notifications?status=SENT&page=2'),
      context(['api', 'v1', 'notifications']),
    );

    const url = forwarded()[0];
    expect(url.searchParams.get('status')).toBe('SENT');
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('encodes a path segment rather than letting it change the target path', async () => {
    await GET(
      request('/api/vintasend/api/v1/notifications/a%2Fb'),
      context(['api', 'v1', 'notifications', 'a/b']),
    );

    expect(String(forwarded()[0])).toBe('https://api.test/api/v1/notifications/a%2Fb');
  });

  it('strips a trailing slash from the configured base URL', async () => {
    process.env.VINTASEND_API_URL = 'https://api.test/';

    await GET(request('/api/vintasend/health'), context(['health']));

    expect(String(forwarded()[0])).toBe('https://api.test/health');
  });

  it('never caches, so the dashboard cannot show a stale page', async () => {
    await GET(request('/api/vintasend/api/v1/notifications'), context(['api', 'v1', 'notifications']));

    expect(forwarded()[1]).toMatchObject({ cache: 'no-store' });
  });

  it('forwards a POST body and its content type', async () => {
    await POST(
      request('/api/vintasend/api/v1/notifications/n1/resend', {
        method: 'POST',
        body: JSON.stringify({ useStoredContext: true }),
      }),
      context(['api', 'v1', 'notifications', 'n1', 'resend']),
    );

    const [, init] = forwarded();
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"useStoredContext":true}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sends no body or content type on a GET', async () => {
    await GET(request('/api/vintasend/health'), context(['health']));

    const [, init] = forwarded();
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });
});

describe('relaying the response', () => {
  it('passes a success payload straight through', async () => {
    fetchMock.mockResolvedValue(upstream({ data: [{ id: 'n1' }], hasMore: false }));

    const response = await GET(
      request('/api/vintasend/api/v1/notifications'),
      context(['api', 'v1', 'notifications']),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: 'n1' }], hasMore: false });
  });

  it('preserves the API error envelope and status', async () => {
    fetchMock.mockResolvedValue(
      upstream({ error: { code: 'PREVIEW_UNAVAILABLE', message: 'No commit recorded.' } }, 409),
    );

    const response = await GET(
      request('/api/vintasend/api/v1/notifications/n1/preview'),
      context(['api', 'v1', 'notifications', 'n1', 'preview']),
    );

    // The browser branches on this code, so flattening it here would break the
    // preview dialog's "no commit recorded" state.
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'PREVIEW_UNAVAILABLE', message: 'No commit recorded.' },
    });
  });

  it('reports an unreachable API as UPSTREAM_ERROR', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await GET(request('/api/vintasend/health'), context(['health']));

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe('UPSTREAM_ERROR');
    expect(body.error.message).toContain('ECONNREFUSED');
  });

  it('reports a non-Error transport failure too', async () => {
    fetchMock.mockRejectedValue('socket hang up');

    const response = await GET(request('/api/vintasend/health'), context(['health']));

    expect(response.status).toBe(503);
    expect((await response.json()).error.message).toContain('unknown network error');
  });
});

describe('methods', () => {
  it('rejects a method the contract does not use', async () => {
    const response = await POST(
      request('/api/vintasend/api/v1/notifications', { method: 'DELETE' }),
      context(['api', 'v1', 'notifications']),
    );

    expect(response.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('route configuration', () => {
  it('is always dynamic, because the session is per request', async () => {
    const route = await import('@/app/api/vintasend/[...path]/route');

    expect(route.dynamic).toBe('force-dynamic');
  });
});

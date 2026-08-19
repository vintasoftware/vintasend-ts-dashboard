/**
 * Tests for the VintaSend API client: how requests are built and how the
 * contract's error envelope is surfaced to callers.
 */

import { VintaSendApiError, apiRequest, getApiClientConfig } from '@/lib/api/client';
import * as api from '@/lib/api/notifications';

const originalEnv = process.env;

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    ...response,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function lastRequest(fetchMock: jest.Mock): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: call?.[0] as string, init: (call?.[1] ?? {}) as RequestInit };
}

beforeEach(() => {
  process.env = {
    ...originalEnv,
    VINTASEND_API_URL: 'https://api.example.com',
    VINTASEND_API_KEY: 'secret-key',
  };
  jest.restoreAllMocks();
});

afterAll(() => {
  process.env = originalEnv;
});

describe('getApiClientConfig', () => {
  it('reports every missing variable at once', () => {
    process.env.VINTASEND_API_URL = '';
    process.env.VINTASEND_API_KEY = '';

    expect(() => getApiClientConfig()).toThrow(
      'VintaSend API configuration is incomplete: VINTASEND_API_URL, VINTASEND_API_KEY must be set.',
    );
  });

  it('strips trailing slashes from the base URL', () => {
    process.env.VINTASEND_API_URL = 'https://api.example.com/';

    expect(getApiClientConfig().baseUrl).toBe('https://api.example.com');
  });
});

describe('apiRequest', () => {
  it('sends the API key as a bearer token and does not cache', async () => {
    const fetchMock = mockFetch({ json: async () => ({ ok: true }) });

    await apiRequest('/api/v1/notifications');

    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe('https://api.example.com/api/v1/notifications');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key');
    expect(init.cache).toBe('no-store');
  });

  it('omits empty query parameters', async () => {
    const fetchMock = mockFetch({});

    await apiRequest('/api/v1/notifications', {
      query: { page: '1', status: undefined, tenant: '' },
    });

    expect(lastRequest(fetchMock).url).toBe('https://api.example.com/api/v1/notifications?page=1');
  });

  it('sends a JSON body with a content type on POST', async () => {
    const fetchMock = mockFetch({});

    await apiRequest('/api/v1/notifications/1/resend', {
      method: 'POST',
      body: { useStoredContext: true },
    });

    const { init } = lastRequest(fetchMock);
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"useStoredContext":true}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('surfaces the contract error envelope', async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'NOT_FOUND', message: 'No such notification.' } }),
    });

    await expect(apiRequest('/api/v1/notifications/missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: 'No such notification.',
    });
  });

  it('falls back to a generic error for a non-JSON failure', async () => {
    mockFetch({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(apiRequest('/api/v1/notifications')).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 502,
    });
  });

  it('reports an unreachable API as an upstream error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const error: unknown = await apiRequest('/api/v1/notifications').catch((e) => e);

    expect(error).toBeInstanceOf(VintaSendApiError);
    expect((error as VintaSendApiError).code).toBe('UPSTREAM_ERROR');
    expect((error as VintaSendApiError).message).toContain('https://api.example.com');
  });
});

describe('endpoint wrappers', () => {
  it('sends filters and 1-indexed pagination as query parameters', async () => {
    const fetchMock = mockFetch({
      json: async () => ({ data: [], page: 2, pageSize: 20, hasMore: false }),
    });

    await api.listNotifications({ status: 'SENT', tenant: undefined }, 2, 20);

    const url = new URL(lastRequest(fetchMock).url);
    expect(url.pathname).toBe('/api/v1/notifications');
    expect(url.searchParams.get('status')).toBe('SENT');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('20');
    expect(url.searchParams.has('tenant')).toBe(false);
  });

  it.each([
    ['listPendingNotifications', '/api/v1/notifications/pending'],
    ['listFutureNotifications', '/api/v1/notifications/future'],
    ['listOneOffNotifications', '/api/v1/notifications/one-off'],
  ] as const)('%s calls %s', async (method, path) => {
    const fetchMock = mockFetch({
      json: async () => ({ data: [], page: 1, pageSize: 20, hasMore: false }),
    });

    await api[method](1, 20);

    expect(new URL(lastRequest(fetchMock).url).pathname).toBe(path);
  });

  it('unwraps the data envelope for single resources', async () => {
    mockFetch({ json: async () => ({ data: { id: 'notif-1', kind: 'user' } }) });

    await expect(api.getNotification('notif-1')).resolves.toEqual({
      id: 'notif-1',
      kind: 'user',
    });
  });

  it('escapes ids in the path', async () => {
    const fetchMock = mockFetch({ json: async () => ({ data: {} }) });

    await api.getNotificationPreview('a/b?c');

    expect(lastRequest(fetchMock).url).toContain('/api/v1/notifications/a%2Fb%3Fc/preview');
  });
});

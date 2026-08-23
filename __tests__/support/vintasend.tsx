/**
 * Test harness for the `vintasend-dashboard-core` data layer.
 *
 * Component tests that only care about rendering mock the core's hooks
 * directly. This helper is for the ones that should exercise the real thing —
 * the URL filters, the query cache, the generated client — by swapping only the
 * transport underneath it. What it asserts on is therefore the same code path
 * the browser runs, minus the network.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { VintaSendProvider, createVintaSendClient } from 'vintasend-dashboard-core';

export type StubbedResponse = {
  status?: number;
  body: unknown;
};

export type FetchStub = jest.Mock<Promise<Response>, [Request]>;

/**
 * Builds a `fetch` that answers from a path -> response map. Keys are matched
 * as a substring of the request URL, so a test can key on
 * '/api/v1/notifications' without spelling out the query string.
 */
export function createFetchStub(routes: Record<string, StubbedResponse>): FetchStub {
  return jest.fn(async (request: Request) => {
    const url = typeof request === 'string' ? request : request.url;
    const match = Object.keys(routes)
      // Longest key first, so '/notifications/{id}/preview' wins over
      // '/notifications'.
      .sort((a, b) => b.length - a.length)
      .find((path) => url.includes(path));

    if (!match) {
      return new Response(
        JSON.stringify({ error: { code: 'NOT_FOUND', message: `No stub for ${url}` } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { status = 200, body } = routes[match];

    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as FetchStub;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Retries turn an expected failure into a multi-second test.
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/**
 * The app configures the client with the relative '/api/vintasend', which a
 * browser resolves against the page. Node's fetch has no page to resolve
 * against and rejects a relative URL outright, so tests spell out the origin
 * jsdom is already serving from.
 */
const TEST_BASE_URL = 'http://localhost/api/vintasend';

export function VintaSendTestProvider({
  children,
  fetch,
  queryClient = createTestQueryClient(),
}: {
  children: ReactNode;
  fetch: typeof globalThis.fetch;
  queryClient?: QueryClient;
}) {
  const client = createVintaSendClient({ baseUrl: TEST_BASE_URL, fetch });

  return (
    <QueryClientProvider client={queryClient}>
      <VintaSendProvider client={client}>{children}</VintaSendProvider>
    </QueryClientProvider>
  );
}

export function renderWithVintaSend(
  ui: ReactElement,
  {
    fetch,
    queryClient,
    ...options
  }: Omit<RenderOptions, 'wrapper'> & {
    fetch: typeof globalThis.fetch;
    queryClient?: QueryClient;
  },
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <VintaSendTestProvider fetch={fetch} queryClient={queryClient}>
        {children}
      </VintaSendTestProvider>
    ),
    ...options,
  });
}

/** A page of notifications in the contract's envelope. */
export function paginated(data: unknown[], overrides: Record<string, unknown> = {}) {
  return { data, page: 1, pageSize: 20, hasMore: false, ...overrides };
}

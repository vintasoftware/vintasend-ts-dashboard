'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { VintaSendProvider, createVintaSendClient } from 'vintasend-dashboard-core';

/**
 * Client-side data layer.
 *
 * `vintasend-dashboard-core` ships the API client and the hooks but takes no
 * position on how they are provided, so this is the one place the dashboard
 * decides: one TanStack Query cache, and a VintaSend client pointed at this
 * app's own proxy route.
 *
 * `baseUrl` is the proxy, not the API. The API's bearer key is a server-side
 * secret and `createVintaSendClient` runs in the browser, so the key is added
 * by app/api/vintasend/[...path]/route.ts instead of being passed here. Anyone
 * copying this file for their own UI should keep that split.
 */
const VINTASEND_PROXY_URL = '/api/vintasend';

/** How many times a request that failed in transport is tried again. */
const MAX_TRANSPORT_RETRIES = 2;

/**
 * Retry only what retrying can fix.
 *
 * The API answers with a typed error code, and most of them are verdicts: a
 * 401, a 404 or a `PREVIEW_UNAVAILABLE` will say the same thing however many
 * times it is asked. Retrying those just delays the message the user needs to
 * see. `UPSTREAM_ERROR` — and anything that never reached the API at all, which
 * arrives without an envelope — is the transient case worth a second attempt.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const code = (error as { error?: { code?: string } } | null)?.error?.code;

  if (code && code !== 'UPSTREAM_ERROR') {
    return false;
  }

  return failureCount < MAX_TRANSPORT_RETRIES;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A dashboard is read-mostly and its rows change behind the user's
        // back, so a short staleness window keeps a tab that has been open all
        // afternoon from showing yesterday's statuses.
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: shouldRetryQuery,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // Created once per browser session. A module-level client would be shared
  // between requests on the server, leaking one user's cache into another's.
  const [queryClient] = useState(createQueryClient);
  const [vintasend] = useState(() => createVintaSendClient({ baseUrl: VINTASEND_PROXY_URL }));

  return (
    <QueryClientProvider client={queryClient}>
      <VintaSendProvider client={vintasend}>{children}</VintaSendProvider>
    </QueryClientProvider>
  );
}

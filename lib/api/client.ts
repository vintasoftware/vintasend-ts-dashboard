import 'server-only';

import type { ApiErrorCode, ApiErrorResponse } from './types';

/**
 * HTTP client for the VintaSend API.
 *
 * The API key is a server-side secret, so every call goes through the
 * dashboard's own server (server components and server actions) and never from
 * the browser. See lib/api/notifications.ts for the typed endpoint wrappers.
 */

export class VintaSendApiError extends Error {
  readonly code: ApiErrorCode;

  readonly status: number;

  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'VintaSendApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type ApiClientConfig = {
  baseUrl: string;
  apiKey: string;
};

export function getApiClientConfig(): ApiClientConfig {
  const baseUrl = process.env.VINTASEND_API_URL?.trim();
  const apiKey = process.env.VINTASEND_API_KEY?.trim();

  const missing = [
    ...(baseUrl ? [] : ['VINTASEND_API_URL']),
    ...(apiKey ? [] : ['VINTASEND_API_KEY']),
  ];

  if (missing.length > 0) {
    throw new Error(`VintaSend API configuration is incomplete: ${missing.join(', ')} must be set.`);
  }

  return { baseUrl: (baseUrl as string).replace(/\/+$/, ''), apiKey: apiKey as string };
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | undefined>,
): string {
  const url = new URL(`${baseUrl}${path}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

async function toApiError(response: Response): Promise<VintaSendApiError> {
  let body: ApiErrorResponse | undefined;

  try {
    body = (await response.json()) as ApiErrorResponse;
  } catch {
    // Non-JSON error body, such as a proxy timeout page.
  }

  if (body?.error) {
    return new VintaSendApiError(
      body.error.code,
      body.error.message,
      response.status,
      body.error.details,
    );
  }

  return new VintaSendApiError(
    'INTERNAL_ERROR',
    `The notifications API responded with status ${response.status}.`,
    response.status,
  );
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    query?: Record<string, string | undefined>;
    body?: unknown;
  } = {},
): Promise<T> {
  const { baseUrl, apiKey } = getApiClientConfig();

  let response: Response;

  try {
    response = await fetch(buildUrl(baseUrl, path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      // Dashboard views must reflect the current state of the backend.
      cache: 'no-store',
    });
  } catch (error) {
    throw new VintaSendApiError(
      'UPSTREAM_ERROR',
      `Could not reach the notifications API at ${baseUrl}: ${
        error instanceof Error ? error.message : 'unknown network error'
      }`,
      503,
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as T;
}

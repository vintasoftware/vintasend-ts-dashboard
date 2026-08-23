/**
 * Tests for the client-side data layer.
 *
 * The load-bearing detail here is what the browser client is *not* given: the
 * VintaSend API key is a server-side secret, and this provider runs in the
 * browser, so it must point at the dashboard's own proxy route and pass no key
 * at all. Everything else is wiring the core's two contexts.
 */

const createVintaSendClient = jest.fn(() => ({ fetch: {}, api: {} }));

jest.mock('vintasend-dashboard-core', () => ({
  ...jest.requireActual('vintasend-dashboard-core'),
  createVintaSendClient: (...args: unknown[]) => createVintaSendClient(...(args as [])),
}));

import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { useVintaSendClient } from 'vintasend-dashboard-core';
import { Providers, shouldRetryQuery } from '@/app/providers';

function Probe() {
  const queryClient = useQueryClient();
  const vintasend = useVintaSendClient();

  return (
    <div
      data-testid="probe"
      data-has-query-client={String(Boolean(queryClient))}
      data-has-vintasend={String(Boolean(vintasend))}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Providers', () => {
  it('renders its children', () => {
    render(
      <Providers>
        <p>dashboard</p>
      </Providers>,
    );

    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('supplies both the query client and the VintaSend client', () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    );

    const probe = screen.getByTestId('probe');
    expect(probe).toHaveAttribute('data-has-query-client', 'true');
    expect(probe).toHaveAttribute('data-has-vintasend', 'true');
  });

  it('points the client at the dashboard proxy, never at the API directly', () => {
    render(
      <Providers>
        <p>dashboard</p>
      </Providers>,
    );

    expect(createVintaSendClient).toHaveBeenCalledWith({ baseUrl: '/api/vintasend' });
  });

  it('passes no API key, because this code reaches the browser', () => {
    render(
      <Providers>
        <p>dashboard</p>
      </Providers>,
    );

    const [config] = createVintaSendClient.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(config).not.toHaveProperty('apiKey');
  });

  it('creates the clients once, not per render', () => {
    const { rerender } = render(
      <Providers>
        <p>one</p>
      </Providers>,
    );

    rerender(
      <Providers>
        <p>two</p>
      </Providers>,
    );

    // A client rebuilt on every render would throw away the query cache with it.
    expect(createVintaSendClient).toHaveBeenCalledTimes(1);
  });
});

describe('shouldRetryQuery', () => {
  const apiError = (code: string) => ({ error: { code, message: 'nope' } });

  it.each(['UNAUTHORIZED', 'NOT_FOUND', 'CONFLICT', 'PREVIEW_UNAVAILABLE', 'BAD_REQUEST'])(
    'does not retry %s, which will not change on a second ask',
    (code) => {
      expect(shouldRetryQuery(0, apiError(code))).toBe(false);
    },
  );

  it('retries an upstream failure, which is usually transient', () => {
    expect(shouldRetryQuery(0, apiError('UPSTREAM_ERROR'))).toBe(true);
    expect(shouldRetryQuery(1, apiError('UPSTREAM_ERROR'))).toBe(true);
  });

  it('gives up on an upstream failure after two attempts', () => {
    expect(shouldRetryQuery(2, apiError('UPSTREAM_ERROR'))).toBe(false);
  });

  it('retries a failure that never reached the API, so carries no envelope', () => {
    expect(shouldRetryQuery(0, new Error('Failed to fetch'))).toBe(true);
    expect(shouldRetryQuery(0, null)).toBe(true);
  });
});

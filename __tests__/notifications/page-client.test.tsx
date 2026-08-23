/**
 * Integration tests for the notifications page.
 *
 * These run the real `vintasend-dashboard-core` hooks — URL parsing, the
 * generated client, the query cache — and stub only `fetch`. That makes them
 * the tests that would actually catch the dashboard drifting away from the
 * package it is meant to demonstrate: a filter that never reaches the query
 * string, or a query string the list request ignores.
 */

const replace = jest.fn();
const push = jest.fn();

let currentSearch = '';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsPageClient } from '@/app/components/notifications-page-client';
import {
  createFetchStub,
  paginated,
  renderWithVintaSend,
  type FetchStub,
} from '../support/vintasend';

const notification = (overrides: Record<string, unknown> = {}) => ({
  kind: 'user',
  id: 'notif-1',
  userId: 'user-1',
  notificationType: 'EMAIL',
  title: 'Welcome',
  contextName: 'taskAssignment',
  status: 'SENT',
  sendAfter: null,
  sentAt: '2024-01-02T10:00:00Z',
  readAt: null,
  createdAt: '2024-01-01T09:00:00Z',
  updatedAt: '2024-01-02T10:00:00Z',
  adapterUsed: 'nodemailer',
  gitCommitSha: 'a'.repeat(40),
  requestedTemplateVersion: null,
  usedTemplateVersion: null,
  bodyTemplate: 'body.pug',
  subjectTemplate: 'subject.pug',
  tenant: null,
  ...overrides,
});

const renderPage = (routes: Record<string, { status?: number; body: unknown }>) => {
  const fetch = createFetchStub(routes);
  renderWithVintaSend(<NotificationsPageClient />, {
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
  return fetch;
};

/** The query string of the most recent list request the stub saw. */
const lastListQuery = (fetch: FetchStub) => {
  const call = fetch.mock.calls
    .map(([request]) => (typeof request === 'string' ? request : request.url))
    .reverse()
    .find((url) => url.includes('/api/v1/notifications?') || url.endsWith('/api/v1/notifications'));

  return new URL(call as string, 'http://localhost').searchParams;
};

/** The query string the page last pushed into the URL. */
const lastReplacedQuery = () =>
  new URL(String(replace.mock.calls.at(-1)?.[0]), 'http://localhost').searchParams;

beforeEach(() => {
  jest.clearAllMocks();
  currentSearch = '';
});

describe('loading notifications', () => {
  it('renders the rows the API returns', async () => {
    renderPage({
      '/api/v1/notifications': { body: paginated([notification({ title: 'Welcome' })]) },
    });

    expect(await screen.findByText('Welcome')).toBeInTheDocument();
  });

  it('requests the first page with the default page size', async () => {
    const fetch = renderPage({ '/api/v1/notifications': { body: paginated([notification()]) } });

    await screen.findByText('Welcome');

    const query = lastListQuery(fetch);
    expect(query.get('page')).toBe('1');
    expect(query.get('pageSize')).toBe('20');
  });

  it('drives the request from filters already in the URL', async () => {
    currentSearch = 'status=FAILED&adapterUsed=mailgun&page=3';

    const fetch = renderPage({ '/api/v1/notifications': { body: paginated([notification()]) } });

    await screen.findByText('Welcome');

    const query = lastListQuery(fetch);
    expect(query.get('status')).toBe('FAILED');
    expect(query.get('adapterUsed')).toBe('mailgun');
    expect(query.get('page')).toBe('3');
  });

  it('ignores a filter value the contract does not allow', async () => {
    // A hand-edited URL must not turn into a 400 from the API.
    currentSearch = 'status=NOT_A_STATUS';

    const fetch = renderPage({ '/api/v1/notifications': { body: paginated([notification()]) } });

    await screen.findByText('Welcome');

    expect(lastListQuery(fetch).get('status')).toBeNull();
  });

  it('seeds the filter bar from the URL', async () => {
    currentSearch = 'adapterUsed=mailgun';

    renderPage({ '/api/v1/notifications': { body: paginated([notification()]) } });

    await screen.findByText('Welcome');

    expect(screen.getByLabelText('Adapter Used')).toHaveValue('mailgun');
  });
});

describe('failures', () => {
  it('shows the API error message and offers a retry', async () => {
    renderPage({
      '/api/v1/notifications': {
        status: 500,
        body: { error: { code: 'INTERNAL_ERROR', message: 'The backend is down.' } },
      },
    });

    const panel = await screen.findByTestId('notifications-error');

    expect(within(panel).getByText('The backend is down.')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('refetches when the user retries', async () => {
    const user = userEvent.setup();
    const fetch = renderPage({
      '/api/v1/notifications': {
        status: 503,
        body: { error: { code: 'UPSTREAM_ERROR', message: 'Could not reach the API.' } },
      },
    });

    const panel = await screen.findByTestId('notifications-error');
    const before = fetch.mock.calls.length;

    await user.click(within(panel).getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(before));
  });
});

describe('filters write to the URL', () => {
  it('puts a chosen status in the query string and returns to page 1', async () => {
    currentSearch = 'page=4';
    const user = userEvent.setup();

    renderPage({ '/api/v1/notifications': { body: paginated([notification()]) } });
    await screen.findByText('Welcome');

    await user.click(screen.getByTestId('status-select'));
    await user.click(await screen.findByRole('option', { name: 'FAILED' }));

    await waitFor(() => expect(replace).toHaveBeenCalled());

    const query = lastReplacedQuery();
    expect(query.get('status')).toBe('FAILED');
    // A narrower result set makes the old page number meaningless.
    expect(query.get('page')).toBe('1');
  });

  it('debounces a text filter into a single URL write', async () => {
    const user = userEvent.setup();

    renderPage({ '/api/v1/notifications': { body: paginated([notification()]) } });
    await screen.findByText('Welcome');

    await user.type(screen.getByLabelText('Adapter Used'), 'mailgun');

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(lastReplacedQuery().get('adapterUsed')).toBe('mailgun');
  });
});

describe('pagination and sorting write to the URL', () => {
  it('advances the page', async () => {
    const user = userEvent.setup();

    renderPage({
      '/api/v1/notifications': { body: paginated([notification()], { hasMore: true }) },
    });
    await screen.findByText('Welcome');

    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(lastReplacedQuery().get('page')).toBe('2');
  });

  it('records a sortable column, and resets to the first page', async () => {
    currentSearch = 'page=5';
    const user = userEvent.setup();

    renderPage({ '/api/v1/notifications': { body: paginated([notification()]) } });
    await screen.findByText('Welcome');

    await user.click(screen.getByRole('button', { name: /Created At/i }));

    await waitFor(() => expect(replace).toHaveBeenCalled());

    const query = lastReplacedQuery();
    expect(query.get('orderByField')).toBe('createdAt');
    // First click on an unsorted column sorts ascending.
    expect(query.get('orderByDirection')).toBe('asc');
    expect(query.get('page')).toBe('1');
  });

  it('sends the sort from the URL to the API', async () => {
    currentSearch = 'orderByField=sentAt&orderByDirection=asc';

    const fetch = renderPage({ '/api/v1/notifications': { body: paginated([notification()]) } });
    await screen.findByText('Welcome');

    const query = lastListQuery(fetch);
    expect(query.get('orderByField')).toBe('sentAt');
    expect(query.get('orderByDirection')).toBe('asc');
  });
});

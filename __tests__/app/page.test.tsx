/**
 * Tests for the notifications page server component.
 *
 * The page's own job is parsing untrusted search params into a filter set and
 * a sane page/pageSize before handing off to the client component, so that
 * parsing is what these cover.
 */

const fetchNotifications = jest.fn();

jest.mock('@/app/actions', () => ({
  fetchNotifications: (...args: unknown[]) => fetchNotifications(...(args as [])),
}));

jest.mock('@/app/components/notifications-page-client', () => ({
  NotificationsPageClient: (props: Record<string, unknown>) => (
    <div data-testid="page-client" data-props={JSON.stringify(props)} />
  ),
}));

import type { ReactElement } from 'react';
import NotificationsPage from '@/app/page';
import { NotificationsLoadingFallback } from '@/app/loading';
import type { Notification, PaginatedResponse } from '@/lib/notifications/types';

const emptyPage: PaginatedResponse<Notification> = {
  data: [],
  page: 1,
  pageSize: 20,
  hasMore: false,
};

type AnyElement = ReactElement<Record<string, unknown>>;

/**
 * Resolves the page down to the props it hands the client component.
 *
 * `NotificationsPage` returns `<main><Suspense><NotificationsContent/></Suspense></main>`,
 * and `NotificationsContent` is an async server component — react-dom's client
 * renderer cannot await one, so it is invoked directly instead.
 */
async function renderPage(params: Record<string, string | string[] | undefined>) {
  const page = (await NotificationsPage({
    searchParams: Promise.resolve(params),
  })) as AnyElement;

  const suspense = page.props.children as AnyElement;
  expect(suspense.props.fallback).toEqual(<NotificationsLoadingFallback />);

  const content = suspense.props.children as AnyElement;
  const resolved = (await (content.type as (p: unknown) => Promise<AnyElement>)(
    content.props,
  )) as AnyElement;

  return resolved.props as Record<string, unknown>;
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchNotifications.mockResolvedValue(emptyPage);
});

describe('NotificationsPage search param parsing', () => {
  it('defaults to page 1 with 20 rows and no filters', async () => {
    await renderPage({});

    expect(fetchNotifications).toHaveBeenCalledWith({}, 1, 20);
  });

  it('passes through every supported filter key', async () => {
    await renderPage({
      status: 'SENT',
      notificationType: 'EMAIL',
      adapterUsed: 'mailgun',
      userId: 'user-1',
      bodyTemplate: 'body.pug',
      subjectTemplate: 'subject.pug',
      contextName: 'taskAssignment',
      tenant: 'acme',
      createdAtFrom: '2024-01-01',
      createdAtTo: '2024-01-31',
      sentAtFrom: '2024-02-01',
      sentAtTo: '2024-02-28',
    });

    expect(fetchNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SENT',
        notificationType: 'EMAIL',
        adapterUsed: 'mailgun',
        tenant: 'acme',
        sentAtTo: '2024-02-28',
      }),
      1,
      20,
    );
  });

  it('keeps the first entry of a repeated filter param', async () => {
    await renderPage({ status: ['SENT', 'FAILED'] });

    expect(fetchNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SENT' }),
      1,
      20,
    );
  });

  it('carries the sort order through to the fetch', async () => {
    await renderPage({ orderByField: 'sentAt', orderByDirection: 'desc' });

    expect(fetchNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ orderByField: 'sentAt', orderByDirection: 'desc' }),
      1,
      20,
    );
  });

  it('omits sort keys entirely when they are not in the URL', async () => {
    await renderPage({ status: 'SENT' });

    const [filters] = fetchNotifications.mock.calls[0];
    expect(filters).not.toHaveProperty('orderByField');
    expect(filters).not.toHaveProperty('orderByDirection');
  });

  it('reads an explicit page and page size', async () => {
    await renderPage({ page: '3', pageSize: '50' });

    expect(fetchNotifications).toHaveBeenCalledWith({}, 3, 50);
  });

  it.each([
    ['0', 1],
    ['-5', 1],
    ['not-a-number', 1],
  ])('clamps the page param %s to %i', async (page, expected) => {
    await renderPage({ page });

    expect(fetchNotifications).toHaveBeenCalledWith({}, expected, 20);
  });

  it.each([
    ['5', 10],
    ['500', 100],
    ['garbage', 20],
  ])('clamps the pageSize param %s to %i', async (pageSize, expected) => {
    await renderPage({ pageSize });

    expect(fetchNotifications).toHaveBeenCalledWith({}, 1, expected);
  });

  it('hands the fetched page and the parsed filters to the client component', async () => {
    fetchNotifications.mockResolvedValue({ ...emptyPage, page: 2, hasMore: true });

    const props = await renderPage({ status: 'SENT', page: '2' });

    expect(props.initialData).toEqual({ data: [], page: 2, pageSize: 20, hasMore: true });
    expect(props.initialFilters).toEqual({ status: 'SENT' });
    expect(props.initialPage).toBe(2);
  });
});

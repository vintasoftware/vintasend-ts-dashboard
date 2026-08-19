import { Suspense } from 'react';
import { fetchNotifications } from './actions';
import { NOTIFICATION_FILTER_KEYS, type NotificationFilters } from '@/lib/notifications/types';
import { NotificationsPageClient } from './components/notifications-page-client';
import { NotificationsLoadingFallback } from './loading';

/**
 * Notifications page - Server Component (RSC)
 *
 * This page handles:
 * 1. Server-side rendering of initial data for fast TTI
 * 2. Reading URL search params (page, pageSize, status, notificationType, and other filter fields)
 * 3. Calling the fetchNotifications server action, which reads from the VintaSend API
 * 4. Rendering the client wrapper with initial state
 *
 * All subsequent interactions (pagination, filtering) happen client-side
 * without full page reloads via useTransition in the client component.
 */

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const DEFAULT_PAGE_SIZE = 20;
const MIN_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function parseFilters(params: Record<string, string | string[] | undefined>): NotificationFilters {
  const filters: NotificationFilters = {};

  for (const key of NOTIFICATION_FILTER_KEYS) {
    const value = params[key];
    if (value !== undefined) {
      // Filter values are single-valued; a repeated param keeps its first entry.
      filters[key] = String(Array.isArray(value) ? value[0] : value) as never;
    }
  }

  if (params.orderByField) {
    filters.orderByField = String(params.orderByField) as NotificationFilters['orderByField'];
  }
  if (params.orderByDirection) {
    filters.orderByDirection = String(
      params.orderByDirection,
    ) as NotificationFilters['orderByDirection'];
  }

  return filters;
}

async function NotificationsContent({
  initialFilters,
  initialPage,
  initialPageSize,
}: {
  initialFilters: NotificationFilters;
  initialPage: number;
  initialPageSize: number;
}) {
  // Fetch initial data server-side
  const initialData = await fetchNotifications(initialFilters, initialPage, initialPageSize);

  return (
    <NotificationsPageClient
      initialData={initialData}
      initialFilters={initialFilters}
      initialPage={initialPage}
    />
  );
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse search params with sensible defaults
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);
  const pageSize = Math.max(
    MIN_PAGE_SIZE,
    Math.min(
      MAX_PAGE_SIZE,
      Number.parseInt(String(params.pageSize ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE,
    ),
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={<NotificationsLoadingFallback />}>
        <NotificationsContent
          initialFilters={parseFilters(params)}
          initialPage={page}
          initialPageSize={pageSize}
        />
      </Suspense>
    </main>
  );
}

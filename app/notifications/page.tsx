import { Suspense } from 'react';
import { fetchNotifications } from './actions';
import type { NotificationFilters } from '@/lib/notifications/types';
import { NotificationsPageClient } from '@/app/notifications/components/notifications-page-client';
import { NotificationsLoadingFallback } from '@/app/notifications/loading';

/**
 * Notifications page - Server Component (RSC)
 *
 * This page handles:
 * 1. Server-side rendering of initial data for fast TTI
 * 2. Reading URL search params (page, pageSize, status, notificationType, search)
 * 3. Calling fetchNotifications server action
 * 4. Rendering the client wrapper with initial state
 *
 * All subsequent interactions (pagination, filtering) happen client-side
 * without full page reloads via useTransition in the client component.
 */

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const page = Math.max(1, parseInt(String(params.page ?? '1')));
  const pageSize = Math.max(10, Math.min(100, parseInt(String(params.pageSize ?? '20'))));

  const filters: NotificationFilters = {
    status: params.status ? (String(params.status) as NotificationFilters['status']) : undefined,
    notificationType: params.notificationType ? (String(params.notificationType) as NotificationFilters['notificationType']) : undefined,
    search: params.search ? String(params.search) : undefined,
  };

  // Remove undefined values from filters object
  Object.keys(filters).forEach((key) => {
    if (filters[key as keyof NotificationFilters] === undefined) {
      delete filters[key as keyof NotificationFilters];
    }
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={<NotificationsLoadingFallback />}>
        <NotificationsContent
          initialFilters={filters}
          initialPage={page}
          initialPageSize={pageSize}
        />
      </Suspense>
    </main>
  );
}

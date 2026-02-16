'use client';

import { useCallback, useTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AnyDashboardNotification, NotificationFilters, PaginatedResult } from '@/lib/notifications/types';
import { NotificationsFilters } from './notifications-filters';
import { NotificationsTable } from './notifications-table';
import { fetchNotifications } from '../actions';

interface NotificationsPageClientProps {
  initialData: PaginatedResult<AnyDashboardNotification>;
  initialFilters: NotificationFilters;
  initialPage: number;
}

/**
 * Client component for the notifications page.
 *
 * Handles:
 * 1. Client-side state for filters, pagination, and data
 * 2. useTransition for non-blocking server action calls
 * 3. URL search param syncing for bookmarkability
 * 4. Loading states and error handling
 *
 * All data refetches happen via server actions without page reloads.
 */
export function NotificationsPageClient({
  initialData,
  initialFilters,
  initialPage,
}: NotificationsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  /**
   * Handle filter changes from the filter component.
   * Updates URL search params and fetches new data.
   */
  const handleFiltersChange = useCallback(
    (newFilters: NotificationFilters) => {
      startTransition(async () => {
        try {
          // Build new search params
          const params = new URLSearchParams(searchParams);

          // Update or remove filter params
          if (newFilters.status) {
            params.set('status', newFilters.status);
          } else {
            params.delete('status');
          }

          if (newFilters.notificationType) {
            params.set('notificationType', newFilters.notificationType);
          } else {
            params.delete('notificationType');
          }

          if (newFilters.search) {
            params.set('search', newFilters.search);
          } else {
            params.delete('search');
          }

          // Always reset to page 1 when filters change
          params.set('page', '1');

          // Update URL without page reload
          router.replace(`?${params.toString()}`, { scroll: false });

          // Fetch new data server-side
          const result = await fetchNotifications(newFilters, 1, data.pageSize);
          setData(result);
        } catch (error) {
          console.error('Error fetching notifications:', error);
          // Error will be caught by error boundary
          throw error;
        }
      });
    },
    [searchParams, data.pageSize, router],
  );

  /**
   * Handle pagination changes.
   * Updates URL and fetches new page of data.
   */
  const handlePaginationChange = useCallback(
    (newPage: number) => {
      startTransition(async () => {
        try {
          const params = new URLSearchParams(searchParams);
          params.set('page', String(newPage));

          // Update URL
          router.replace(`?${params.toString()}`, { scroll: false });

          // Re-fetch with current filters and new page
          const result = await fetchNotifications(initialFilters, newPage, data.pageSize);
          setData(result);
        } catch (error) {
          console.error('Error fetching notifications:', error);
          throw error;
        }
      });
    },
    [searchParams, initialFilters, data.pageSize, router],
  );

  // Calculate page count
  const pageCount = Math.ceil(data.total / data.pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Manage and view all notifications. Total: <span className="font-semibold">{data.total}</span>
        </p>
      </div>

      {/* Filters */}
      <NotificationsFilters
        onFiltersChange={handleFiltersChange}
        initialFilters={initialFilters}
        isLoading={isPending}
      />

      {/* Table */}
      <NotificationsTable
        data={data.data}
        pageCount={pageCount}
        currentPage={data.page}
        pageSize={data.pageSize}
        isLoading={isPending}
        onPaginationChange={handlePaginationChange}
      />
    </div>
  );
}

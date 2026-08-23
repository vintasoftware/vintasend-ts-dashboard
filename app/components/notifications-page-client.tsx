'use client';

import type { SortingState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  getApiErrorMessage,
  NOTIFICATION_ORDER_BY_FIELDS,
  useCancelNotification,
  useFilteredNotifications,
  type NotificationFilters,
  type NotificationOrderByField,
} from 'vintasend-dashboard-core';
import { useNextRouterAdapter } from 'vintasend-dashboard-core/next';

import { NotificationsFilters } from './notifications-filters';
import { NotificationsTable } from './notifications-table';
import { NotificationDetail } from './notification-detail';
import { ResendNotificationDialog } from './resend-notification-dialog';
import { PreviewRenderDialog } from './preview-render-dialog';
import { CancelNotificationDialog } from './cancel-notification-dialog';

/**
 * The notifications page.
 *
 * Everything data-shaped here comes from `vintasend-dashboard-core`:
 * `useFilteredNotifications` reads the filters out of the URL, runs the list
 * query, and hands back pagination helpers, while `useCancelNotification`
 * writes and invalidates the affected caches. What is left is this app's own
 * UI — which dialog is open, and how a failure is reported.
 *
 * That split is the point of the example. A dashboard with a different design
 * system replaces this file and keeps the two hooks.
 */
export function NotificationsPageClient() {
  // Filters live in the query string, so the Next router — not the History API
  // — has to do the navigating, or the route never re-renders.
  const router = useNextRouterAdapter();

  const {
    notifications,
    filters,
    page,
    pageSize,
    setFilters,
    setPage,
    setSort,
    hasNextPage,
    isFetching,
    isError,
    error,
    refetch,
  } = useFilteredNotifications({ router });

  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [resendNotificationId, setResendNotificationId] = useState<string | null>(null);
  const [previewNotificationId, setPreviewNotificationId] = useState<string | null>(null);
  const [cancelNotificationId, setCancelNotificationId] = useState<string | null>(null);

  const cancelMutation = useCancelNotification();

  const handleFiltersChange = useCallback(
    (next: NotificationFilters) => {
      // The hook resets to page 1 on every filter change, so a narrowed result
      // set never strands the user on a page that no longer exists.
      setFilters(next);
    },
    [setFilters],
  );

  const handleSortingChange = useCallback(
    (sorting: SortingState) => {
      const [first] = sorting;

      if (!first || !NOTIFICATION_ORDER_BY_FIELDS.includes(first.id as NotificationOrderByField)) {
        setSort();
        return;
      }

      setSort(first.id as NotificationOrderByField, first.desc ? 'desc' : 'asc');
    },
    [setSort],
  );

  const handleCancelConfirm = useCallback(
    async (id: string) => {
      try {
        // The mutation invalidates every notification list on success, so the
        // table refreshes itself; there is nothing to refetch by hand.
        await cancelMutation.mutateAsync({ params: { path: { id } } });

        toast.success('Notification cancelled successfully.');
        setCancelNotificationId(null);
      } catch (mutationError) {
        toast.error(`Failed to cancel notification: ${getApiErrorMessage(mutationError)}`);
      }
    },
    [cancelMutation],
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-2">Manage and view all notifications.</p>
        </div>

        <NotificationsFilters
          onFiltersChange={handleFiltersChange}
          initialFilters={filters}
          isLoading={isFetching}
        />

        {isError ? (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-6"
            data-testid="notifications-error"
          >
            <h2 className="font-semibold text-destructive mb-2">Failed to load notifications</h2>
            <p className="text-sm text-muted-foreground mb-4">{getApiErrorMessage(error)}</p>
            <button
              type="button"
              onClick={refetch}
              className="text-sm underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        ) : (
          <NotificationsTable
            data={notifications}
            hasMore={hasNextPage}
            currentPage={page}
            pageSize={pageSize}
            isLoading={isFetching}
            orderByField={filters.orderByField}
            orderByDirection={filters.orderByDirection}
            onPaginationChange={setPage}
            onSortingChange={handleSortingChange}
            onRowClick={setSelectedNotificationId}
            onResend={setResendNotificationId}
            onPreviewRender={setPreviewNotificationId}
            onCancel={setCancelNotificationId}
          />
        )}

        <NotificationDetail
          notificationId={selectedNotificationId}
          onClose={() => setSelectedNotificationId(null)}
        />

        <ResendNotificationDialog
          notificationId={resendNotificationId}
          onClose={() => setResendNotificationId(null)}
        />

        <PreviewRenderDialog
          notificationId={previewNotificationId}
          onClose={() => setPreviewNotificationId(null)}
        />

        <CancelNotificationDialog
          notificationId={cancelNotificationId}
          onClose={() => setCancelNotificationId(null)}
          onConfirm={handleCancelConfirm}
        />
      </div>
    </main>
  );
}

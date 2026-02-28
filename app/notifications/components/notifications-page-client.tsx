'use client';

import type { SortingState } from '@tanstack/react-table';
import { useCallback, useTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { AnyDashboardNotification, NotificationFilters, PaginatedResult } from '@/lib/notifications/types';
import { NotificationsFilters } from './notifications-filters';
import { NotificationsTable } from './notifications-table';
import { NotificationDetail } from './notification-detail';
import { ResendNotificationDialog } from './resend-notification-dialog';
import { PreviewRenderDialog } from './preview-render-dialog';
import { CancelNotificationDialog } from './cancel-notification-dialog';
import { cancelNotification, fetchNotifications } from '../actions';

interface NotificationsPageClientProps {
  initialData: PaginatedResult<AnyDashboardNotification>;
  initialFilters: NotificationFilters;
  initialPage: number;
}

function buildFiltersFromParams(params: URLSearchParams): NotificationFilters {
  return {
    status: (params.get('status') as NotificationFilters['status']) ?? undefined,
    notificationType:
      (params.get('notificationType') as NotificationFilters['notificationType']) ?? undefined,
    adapterUsed: params.get('adapterUsed') ?? undefined,
    userId: params.get('userId') ?? undefined,
    bodyTemplate: params.get('bodyTemplate') ?? undefined,
    subjectTemplate: params.get('subjectTemplate') ?? undefined,
    contextName: params.get('contextName') ?? undefined,
    createdAtFrom: params.get('createdAtFrom') ?? undefined,
    createdAtTo: params.get('createdAtTo') ?? undefined,
    sentAtFrom: params.get('sentAtFrom') ?? undefined,
    sentAtTo: params.get('sentAtTo') ?? undefined,
    orderByField: (params.get('orderByField') as NotificationFilters['orderByField']) ?? undefined,
    orderByDirection:
      (params.get('orderByDirection') as NotificationFilters['orderByDirection']) ?? undefined,
  };
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
}: NotificationsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentOrderByField =
    (searchParams.get('orderByField') as NotificationFilters['orderByField']) ?? undefined;
  const currentOrderByDirection =
    (searchParams.get('orderByDirection') as NotificationFilters['orderByDirection']) ?? undefined;

  // State management
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  
  // Detail panel state
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  // Resend dialog state
  const [resendNotificationId, setResendNotificationId] = useState<string | null>(null);

  // Preview render dialog state
  const [previewNotificationId, setPreviewNotificationId] = useState<string | null>(null);

  // Cancel dialog state
  const [cancelNotificationId, setCancelNotificationId] = useState<string | null>(null);

  /**
   * Handle opening the notification detail panel.
   */
  const handleRowClick = useCallback((id: string) => {
    setSelectedNotificationId(id);
  }, []);

  /**
   * Handle closing the notification detail panel.
   */
  const handleDetailClose = useCallback(() => {
    setSelectedNotificationId(null);
  }, []);

  /**
   * Handle opening the resend confirmation dialog.
   */
  const handleResendClick = useCallback((id: string) => {
    setResendNotificationId(id);
  }, []);

  /**
   * Handle closing the resend confirmation dialog.
   */
  const handleResendClose = useCallback(() => {
    setResendNotificationId(null);
  }, []);

  /**
   * Handle opening the preview render dialog.
   */
  const handlePreviewRenderClick = useCallback((id: string) => {
    setPreviewNotificationId(id);
  }, []);

  /**
   * Handle closing the preview render dialog.
   */
  const handlePreviewRenderClose = useCallback(() => {
    setPreviewNotificationId(null);
  }, []);

  /**
   * Handle opening the cancel confirmation dialog.
   */
  const handleCancelClick = useCallback((id: string) => {
    setCancelNotificationId(id);
  }, []);

  /**
   * Handle closing the cancel confirmation dialog.
   */
  const handleCancelClose = useCallback(() => {
    setCancelNotificationId(null);
  }, []);

  /**
   * Handle confirmed cancellation of a pending notification.
   */
  const handleCancelConfirm = useCallback(async (id: string) => {
    const result = await cancelNotification(id);

    if (!result.success) {
      toast.error(`Failed to cancel notification: ${result.error}`);
      return;
    }

    toast.success('Notification cancelled successfully.');

    setCancelNotificationId(null);

    try {
      const activeFilters = buildFiltersFromParams(new URLSearchParams(searchParams));
      const refreshed = await fetchNotifications(activeFilters, data.page, data.pageSize);
      setData(refreshed);
    } catch (error) {
      console.error('Error refreshing notifications after cancellation:', error);
    }
  }, [searchParams, data.page, data.pageSize]);

  /**
   * Handle successful resend - refresh the current page data.
   */
  const handleResent = useCallback(() => {
    startTransition(async () => {
      try {
        const activeFilters = buildFiltersFromParams(new URLSearchParams(searchParams));
        const result = await fetchNotifications(activeFilters, data.page, data.pageSize);
        setData(result);
      } catch (error) {
        console.error('Error refreshing notifications after resend:', error);
      }
    });
  }, [searchParams, data.page, data.pageSize]);

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
          // Sync all filter fields to URL search params
          const filterKeys: (keyof NotificationFilters)[] = [
            'status', 'notificationType', 'adapterUsed', 'userId',
            'bodyTemplate', 'subjectTemplate', 'contextName',
            'createdAtFrom', 'createdAtTo', 'sentAtFrom', 'sentAtTo',
          ];
          for (const key of filterKeys) {
            const value = newFilters[key];
            if (value) {
              params.set(key, value);
            } else {
              params.delete(key);
            }
          }

          // Always reset to page 1 when filters change
          params.set('page', '1');

          // Update URL without page reload
          router.replace(`?${params.toString()}`, { scroll: false });

          // Fetch new data server-side
          const result = await fetchNotifications(buildFiltersFromParams(params), 1, data.pageSize);
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
          const result = await fetchNotifications(buildFiltersFromParams(params), newPage, data.pageSize);
          setData(result);
        } catch (error) {
          console.error('Error fetching notifications:', error);
          throw error;
        }
      });
    },
    [searchParams, data.pageSize, router],
  );

  const handleSortingChange = useCallback(
    (sorting: SortingState) => {
      startTransition(async () => {
        try {
          const params = new URLSearchParams(searchParams);
          const firstSort = sorting[0];

          console.log('[notifications.ui] sorting change', {
            sorting,
            firstSort,
          });

          const sortableFields: NonNullable<NotificationFilters['orderByField']>[] = [
            'sendAfter',
            'sentAt',
            'readAt',
            'createdAt',
            'updatedAt',
          ];

          if (firstSort && sortableFields.includes(firstSort.id as NonNullable<NotificationFilters['orderByField']>)) {
            params.set('orderByField', firstSort.id);
            params.set('orderByDirection', firstSort.desc ? 'desc' : 'asc');
          } else {
            params.delete('orderByField');
            params.delete('orderByDirection');
          }

          params.set('page', '1');

          router.replace(`?${params.toString()}`, { scroll: false });

          const nextFilters = buildFiltersFromParams(params);
          console.log('[notifications.ui] fetch after sorting', {
            page: 1,
            pageSize: data.pageSize,
            nextFilters,
          });

          const result = await fetchNotifications(nextFilters, 1, data.pageSize);
          setData(result);
        } catch (error) {
          console.error('Error fetching notifications with sorting:', error);
          throw error;
        }
      });
    },
    [searchParams, data.pageSize, router],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Manage and view all notifications.
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
        hasMore={data.hasMore}
        currentPage={data.page}
        pageSize={data.pageSize}
        isLoading={isPending}
        orderByField={currentOrderByField}
        orderByDirection={currentOrderByDirection}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onRowClick={handleRowClick}
        onResend={handleResendClick}
        onPreviewRender={handlePreviewRenderClick}
        onCancel={handleCancelClick}
      />

      {/* Notification Detail Panel */}
      <NotificationDetail
        notificationId={selectedNotificationId}
        onClose={handleDetailClose}
      />

      {/* Resend Notification Dialog */}
      <ResendNotificationDialog
        notificationId={resendNotificationId}
        onClose={handleResendClose}
        onResent={handleResent}
      />

      <PreviewRenderDialog
        notificationId={previewNotificationId}
        onClose={handlePreviewRenderClose}
      />

      <CancelNotificationDialog
        notificationId={cancelNotificationId}
        onClose={handleCancelClose}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}

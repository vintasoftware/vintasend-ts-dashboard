'use server';

/**
 * Server actions for the notifications page.
 *
 * Each action is a thin wrapper over the VintaSend API: the API key stays on
 * the server, and the browser only ever sees the contract's payloads. Read
 * actions let errors propagate to the page's error boundary; actions invoked
 * from a dialog return a result object so the dialog can show the message
 * inline.
 */

import { VintaSendApiError } from '@/lib/api/client';
import * as api from '@/lib/api/notifications';
import type {
  Notification,
  NotificationDetail,
  NotificationFilters,
  PaginatedResponse,
} from '@/lib/notifications/types';

function describeError(error: unknown, fallback: string): string {
  if (error instanceof VintaSendApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

/**
 * Fetches notifications with optional filtering and pagination.
 *
 * @param filters - Filter criteria (status, notificationType, adapterUsed, userId, templates, dates, etc.)
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 */
export async function fetchNotifications(
  filters: NotificationFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Notification>> {
  try {
    return await api.listNotifications(filters, page, pageSize);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error(`Failed to fetch notifications: ${describeError(error, 'Unknown error')}`);
  }
}

/**
 * Fetches a single notification with full details (contextUsed, extraParams, etc.).
 * Used by the detail panel.
 */
export async function fetchNotificationDetail(id: string): Promise<NotificationDetail> {
  try {
    return await api.getNotification(id);
  } catch (error) {
    console.error('Error fetching notification detail:', error);
    throw new Error(
      `Failed to fetch notification detail: ${describeError(error, 'Unknown error')}`,
    );
  }
}

/**
 * Fetches pending notifications (status = PENDING_SEND).
 */
export async function fetchPendingNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Notification>> {
  try {
    return await api.listPendingNotifications(page, pageSize);
  } catch (error) {
    console.error('Error fetching pending notifications:', error);
    throw new Error(
      `Failed to fetch pending notifications: ${describeError(error, 'Unknown error')}`,
    );
  }
}

/**
 * Fetches future notifications (sendAfter > now).
 */
export async function fetchFutureNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Notification>> {
  try {
    return await api.listFutureNotifications(page, pageSize);
  } catch (error) {
    console.error('Error fetching future notifications:', error);
    throw new Error(
      `Failed to fetch future notifications: ${describeError(error, 'Unknown error')}`,
    );
  }
}

/**
 * Fetches one-off notifications only.
 */
export async function fetchOneOffNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Notification>> {
  try {
    return await api.listOneOffNotifications(page, pageSize);
  } catch (error) {
    console.error('Error fetching one-off notifications:', error);
    throw new Error(
      `Failed to fetch one-off notifications: ${describeError(error, 'Unknown error')}`,
    );
  }
}

export type NotificationPreviewResult =
  | {
      state: 'success';
      gitCommitSha: string;
      bodyTemplatePath: string;
      subjectTemplatePath: string | null;
      renderedBodyHtml: string;
      renderedSubjectHtml: string;
    }
  | {
      state: 'missing_sha';
      message: string;
    }
  | {
      state: 'error';
      message: string;
    };

/**
 * Fetches the notification's templates rendered at the commit persisted with it.
 * The client only provides the notification ID; the API performs the lookup.
 */
export async function fetchNotificationPreview(
  notificationId: string,
): Promise<NotificationPreviewResult> {
  try {
    const preview = await api.getNotificationPreview(notificationId);

    return { state: 'success', ...preview };
  } catch (error) {
    if (error instanceof VintaSendApiError && error.code === 'PREVIEW_UNAVAILABLE') {
      return { state: 'missing_sha', message: error.message };
    }

    console.error('Error fetching notification preview:', error);

    return {
      state: 'error',
      message: describeError(error, 'Unknown error while fetching notification preview.'),
    };
  }
}

/**
 * Resends a notification by creating a new notification based on the original.
 * Only works for non-one-off notifications with status SENT or FAILED.
 *
 * @param notificationId - The ID of the notification to resend
 * @param useStoredContext - Whether to reuse the stored context or recalculate from current data
 */
export async function resendNotification(
  notificationId: string,
  useStoredContext: boolean,
): Promise<{ success: true; notification: Notification } | { success: false; error: string }> {
  try {
    const notification = await api.resendNotification(notificationId, useStoredContext);

    return { success: true, notification };
  } catch (error) {
    console.error('Error resending notification:', error);

    return {
      success: false,
      error: describeError(error, 'Unknown error occurred while resending notification'),
    };
  }
}

/**
 * Cancels a notification if it is still pending send.
 */
export async function cancelNotification(
  notificationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await api.cancelNotification(notificationId);

    return { success: true };
  } catch (error) {
    console.error('Error cancelling notification:', error);

    return {
      success: false,
      error: describeError(error, 'Unknown error occurred while cancelling notification'),
    };
  }
}

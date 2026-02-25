'use server';

/**
 * Server actions for the notifications page.
 * Handles data fetching and real-time updates without page reloads.
 */

import type {
  AnyDashboardNotification,
  AnyDashboardNotificationDetail,
  NotificationFilters,
  PaginatedResult,
} from '@/lib/notifications/types';
import {
  serializeNotification,
  serializeNotificationWithDetail,
  serializeOneOffNotification,
  serializeOneOffNotificationWithDetail,
} from '@/lib/notifications/serialize';
import { getVintaSendService, type VintaSendConfig } from '@/lib/notifications/get-vintasend-service';
import { isOneOffNotification } from 'vintasend';
import type { NotificationFilterFields } from 'vintasend';

/**
 * Fetches notifications with optional filtering and pagination.
 * Connects to the real VintaSend backend using filterNotifications.
 *
 * @param filters - Filter criteria (status, notificationType, adapterUsed, userId, templates, dates, etc.)
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated result of dashboard notifications
 */
/**
 * Converts dashboard NotificationFilters to VintaSend's NotificationFilterFields.
 */
function buildBackendFilter(filters: NotificationFilters): NotificationFilterFields<VintaSendConfig> {
  const filter: NotificationFilterFields<VintaSendConfig> = {};

  if (filters.status) filter.status = filters.status;
  if (filters.notificationType) filter.notificationType = filters.notificationType;
  if (filters.adapterUsed) filter.adapterUsed = filters.adapterUsed;
  if (filters.userId) filter.userId = filters.userId;
  if (filters.bodyTemplate) filter.bodyTemplate = filters.bodyTemplate;
  if (filters.subjectTemplate) filter.subjectTemplate = filters.subjectTemplate;
  if (filters.contextName) filter.contextName = filters.contextName;

  if (filters.createdAtFrom || filters.createdAtTo) {
    filter.createdAtRange = {
      ...(filters.createdAtFrom ? { from: new Date(filters.createdAtFrom) } : {}),
      ...(filters.createdAtTo ? { to: new Date(filters.createdAtTo) } : {}),
    };
  }

  if (filters.sentAtFrom || filters.sentAtTo) {
    filter.sentAtRange = {
      ...(filters.sentAtFrom ? { from: new Date(filters.sentAtFrom) } : {}),
      ...(filters.sentAtTo ? { to: new Date(filters.sentAtTo) } : {}),
    };
  }

  console.log('Built backend filter from dashboard filters:', filter);

  return filter;
}

export async function fetchNotifications(
  filters: NotificationFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<AnyDashboardNotification>> {
  try {
    const service = await getVintaSendService();

    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const backendPage = page - 1;

    // Build backend filter from dashboard filters and use filterNotifications
    const backendFilter = buildBackendFilter(filters);
    const dbNotifications = await service.filterNotifications(backendFilter, backendPage, pageSize);

    const serialized = dbNotifications.map((n) =>
      isOneOffNotification(n) ? serializeOneOffNotification(n) : serializeNotification(n),
    );

    return {
      data: serialized,
      page,
      pageSize,
      hasMore: serialized.length === pageSize,
    };
  } catch (error) {
    // Log error and re-throw with user-friendly message
    console.error('Error fetching notifications:', error);
    throw new Error(
      `Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Fetches a single notification with full details (contextUsed, extraParams, etc.).
 * Used by the detail panel/modal.
 *
 * @param id - Notification ID
 * @returns Full notification detail
 */
export async function fetchNotificationDetail(
  id: string,
): Promise<AnyDashboardNotificationDetail> {
  try {
    const service = await getVintaSendService();

    // Try to fetch as a regular notification first
    const notification = await service.getNotification(id, false);

    if (notification) {
      // Serialize based on notification type
      if (isOneOffNotification(notification)) {
        return serializeOneOffNotificationWithDetail(notification);
      }
      return serializeNotificationWithDetail(notification);
    }

    // If not found, try as a one-off notification
    const oneOffNotification = await service.getOneOffNotification(id, false);

    if (oneOffNotification) {
      return serializeOneOffNotificationWithDetail(oneOffNotification);
    }

    // Notification not found
    throw new Error(`Notification with ID ${id} not found`);
  } catch (error) {
    console.error('Error fetching notification detail:', error);
    throw new Error(
      `Failed to fetch notification detail: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Fetches pending notifications (status = PENDING_SEND).
 * Uses the backend's optimized pending notifications query.
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated result of pending notifications
 */
export async function fetchPendingNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<AnyDashboardNotification>> {
  try {
    const service = await getVintaSendService();
    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const dbNotifications = await service.getPendingNotifications(page - 1, pageSize);

    const serialized = dbNotifications.map((n) =>
      isOneOffNotification(n) ? serializeOneOffNotification(n) : serializeNotification(n),
    );

    return {
      data: serialized,
      page,
      pageSize,
      hasMore: serialized.length === pageSize,
    };
  } catch (error) {
    console.error('Error fetching pending notifications:', error);
    throw new Error(
      `Failed to fetch pending notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Fetches future notifications (sendAfter > now).
 * Uses the backend's future notifications query.
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated result of scheduled notifications
 */
export async function fetchFutureNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<AnyDashboardNotification>> {
  try {
    const service = await getVintaSendService();
    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const dbNotifications = await service.getFutureNotifications(page - 1, pageSize);

    const serialized = dbNotifications.map((n) =>
      isOneOffNotification(n) ? serializeOneOffNotification(n) : serializeNotification(n),
    );

    return {
      data: serialized,
      page,
      pageSize,
      hasMore: serialized.length === pageSize,
    };
  } catch (error) {
    console.error('Error fetching future notifications:', error);
    throw new Error(
      `Failed to fetch future notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Fetches one-off notifications only.
 * Uses the backend's one-off notifications query.
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated result of one-off notifications
 */
export async function fetchOneOffNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<AnyDashboardNotification>> {
  try {
    const service = await getVintaSendService();
    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const dbNotifications = await service.getOneOffNotifications(page - 1, pageSize);

    const serialized = dbNotifications.map((n) => serializeOneOffNotification(n));

    return {
      data: serialized,
      page,
      pageSize,
      hasMore: serialized.length === pageSize,
    };
  } catch (error) {
    console.error('Error fetching one-off notifications:', error);
    throw new Error(
      `Failed to fetch one-off notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Resends a notification by creating a new notification based on the original.
 * Only works for non-one-off notifications with status SENT or FAILED.
 *
 * @param notificationId - The ID of the notification to resend
 * @param useStoredContext - Whether to reuse the stored context or recalculate from current DB state
 * @returns The newly created notification (serialized) or an error message
 */
export async function resendNotification(
  notificationId: string,
  useStoredContext: boolean,
): Promise<{ success: true; notification: AnyDashboardNotification } | { success: false; error: string }> {
  try {
    const service = await getVintaSendService();

    const result = await service.resendNotification(notificationId, useStoredContext);

    if (!result) {
      return { success: false, error: 'Failed to resend notification. The notification may not exist, may be a one-off notification, or may be scheduled for the future.' };
    }

    const serialized = serializeNotification(result);
    return { success: true, notification: serialized };
  } catch (error) {
    console.error('Error resending notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while resending notification',
    };
  }
}

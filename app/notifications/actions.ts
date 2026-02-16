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
import { getVintaSendService } from '@/lib/notifications/get-vintasend-service';
import { isOneOffNotification } from 'vintasend';

/**
 * Helper function to apply client-side filters to notifications.
 * Used when backend doesn't support specific filter combinations.
 */
function applyFilters(
  notifications: AnyDashboardNotification[],
  filters: NotificationFilters,
): AnyDashboardNotification[] {
  let filtered = notifications;

  if (filters.status) {
    filtered = filtered.filter((item) => item.status === filters.status);
  }

  if (filters.notificationType) {
    filtered = filtered.filter((item) => item.notificationType === filters.notificationType);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        (item.title?.toLowerCase().includes(searchLower) ?? false) ||
        item.id.toLowerCase().includes(searchLower) ||
        ('emailOrPhone' in item && item.emailOrPhone.toLowerCase().includes(searchLower)) ||
        ('userId' in item && item.userId.toLowerCase().includes(searchLower)),
    );
  }

  return filtered;
}

/**
 * Fetches notifications with optional filtering and pagination.
 * Connects to the real VintaSend backend.
 *
 * @param filters - Filter criteria (status, notificationType, search)
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated result of dashboard notifications
 */
export async function fetchNotifications(
  filters: NotificationFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<AnyDashboardNotification>> {
  try {
    const service = await getVintaSendService();

    // Use specialized backend methods when possible
    let dbNotifications: Awaited<ReturnType<typeof service.getPendingNotifications>>;
    if (filters.status === 'PENDING_SEND' && !filters.notificationType && !filters.search) {
      // Use optimized pending notifications query
      dbNotifications = await service.getPendingNotifications(page, pageSize);
    } else {
      // Fetch a larger batch to account for filtering
      // This is a limitation of the current backend not supporting complex filters
      const fetchSize = pageSize * 3; // Fetch 3x to account for filtering
      dbNotifications = await service.getNotifications(page, fetchSize);
    }

    // Serialize all notifications
    const serialized = dbNotifications.map((n) =>
      isOneOffNotification(n) ? serializeOneOffNotification(n) : serializeNotification(n),
    );

    // Apply client-side filters
    const filtered = applyFilters(serialized, filters);

    // Paginate the filtered results
    const startIdx = 0; // Already paginated by backend call
    const endIdx = pageSize;
    const paginatedData = filtered.slice(startIdx, endIdx);

    // Note: Total count is approximate when filters are applied
    // A proper implementation would require backend support for filtered counts
    return {
      data: paginatedData,
      page,
      pageSize,
      total: filtered.length + (paginatedData.length === pageSize ? pageSize : 0), // Estimate
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
    const dbNotifications = await service.getPendingNotifications(page, pageSize);

    const serialized = dbNotifications.map((n) =>
      isOneOffNotification(n) ? serializeOneOffNotification(n) : serializeNotification(n),
    );

    return {
      data: serialized,
      page,
      pageSize,
      total: serialized.length + (serialized.length === pageSize ? pageSize : 0), // Estimate
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
    const dbNotifications = await service.getFutureNotifications(page, pageSize);

    const serialized = dbNotifications.map((n) =>
      isOneOffNotification(n) ? serializeOneOffNotification(n) : serializeNotification(n),
    );

    return {
      data: serialized,
      page,
      pageSize,
      total: serialized.length + (serialized.length === pageSize ? pageSize : 0), // Estimate
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
    const dbNotifications = await service.getOneOffNotifications(page, pageSize);

    const serialized = dbNotifications.map((n) => serializeOneOffNotification(n));

    return {
      data: serialized,
      page,
      pageSize,
      total: serialized.length + (serialized.length === pageSize ? pageSize : 0), // Estimate
    };
  } catch (error) {
    console.error('Error fetching one-off notifications:', error);
    throw new Error(
      `Failed to fetch one-off notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

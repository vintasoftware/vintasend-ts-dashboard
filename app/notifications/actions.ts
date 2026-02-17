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

    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const backendPage = page - 1;

    let dbNotifications: Awaited<ReturnType<typeof service.getPendingNotifications>>;
    if (filters.status === 'PENDING_SEND') {
      dbNotifications = await service.getPendingNotifications(backendPage, pageSize);
    } else {
      dbNotifications = await service.getNotifications(backendPage, pageSize);
    }

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

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
import { createGitHubTemplateClientFromEnv } from '@/lib/notifications/github-template-client';
import { isOneOffNotification } from 'vintasend';
import type {
  NotificationFilterCapabilities,
  NotificationFilterFields,
  StringFieldFilter,
} from 'vintasend';

type DashboardOrderByField = 'sendAfter' | 'sentAt' | 'readAt' | 'createdAt' | 'updatedAt';
type DashboardOrderDirection = 'asc' | 'desc';

function getDashboardReadBackendIdentifier(): string | undefined {
  const backendIdentifier = process.env.VINTASEND_DASHBOARD_BACKEND_IDENTIFIER?.trim();
  return backendIdentifier ? backendIdentifier : undefined;
}

function buildOrderBy(
  filters: NotificationFilters,
  capabilities: NotificationFilterCapabilities,
): { field: DashboardOrderByField; direction: DashboardOrderDirection } | undefined {
  const field = filters.orderByField ?? 'createdAt';
  const direction = filters.orderByDirection ?? 'desc';

  if (capabilities[`orderBy.${field}`] === false) {
    return undefined;
  }

  return {
    field,
    direction,
  };
}

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
function buildStringFilter(
  value: string | undefined,
  capabilities: NotificationFilterCapabilities,
): StringFieldFilter | undefined {
  if (!value) {
    return undefined;
  }

  const supportsIncludes = capabilities['stringLookups.includes'];
  const supportsCaseInsensitive = capabilities['stringLookups.caseInsensitive'];

  if (supportsIncludes) {
    return {
      lookup: 'includes',
      value,
      ...(supportsCaseInsensitive ? { caseSensitive: false } : {}),
    };
  }

  if (supportsCaseInsensitive) {
    return {
      lookup: 'exact',
      value,
      caseSensitive: false,
    };
  }

  return value;
}

function buildBackendFilter(
  filters: NotificationFilters,
  capabilities: NotificationFilterCapabilities,
): NotificationFilterFields<VintaSendConfig> {
  const filter: NotificationFilterFields<VintaSendConfig> = {};

  if (filters.status) filter.status = filters.status;
  if (filters.notificationType) filter.notificationType = filters.notificationType;
  if (filters.adapterUsed) filter.adapterUsed = filters.adapterUsed;
  if (filters.userId) filter.userId = filters.userId;
  if (filters.bodyTemplate) {
    filter.bodyTemplate = buildStringFilter(filters.bodyTemplate, capabilities);
  }
  if (filters.subjectTemplate) {
    filter.subjectTemplate = buildStringFilter(filters.subjectTemplate, capabilities);
  }
  if (filters.contextName) {
    filter.contextName = buildStringFilter(filters.contextName, capabilities);
  }

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
    const backendIdentifier = getDashboardReadBackendIdentifier();

    console.log('[notifications.fetch] request', {
      page,
      pageSize,
      backendIdentifier,
      orderByField: filters.orderByField,
      orderByDirection: filters.orderByDirection,
      filters,
    });

    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const backendPage = page - 1;

    const capabilities = await service.getBackendSupportedFilterCapabilities(backendIdentifier);

    console.log('[notifications.fetch] capabilities sample', {
      'orderBy.sendAfter': capabilities['orderBy.sendAfter'],
      'orderBy.sentAt': capabilities['orderBy.sentAt'],
      'orderBy.readAt': capabilities['orderBy.readAt'],
      'orderBy.createdAt': capabilities['orderBy.createdAt'],
      'orderBy.updatedAt': capabilities['orderBy.updatedAt'],
    });

    // Build backend filter from dashboard filters and use filterNotifications
    const backendFilter = buildBackendFilter(filters, capabilities);
    const orderBy = buildOrderBy(filters, capabilities);

    console.log('[notifications.fetch] computed', {
      backendPage,
      backendFilter,
      orderBy,
      orderByCapability:
        filters.orderByField ? capabilities[`orderBy.${filters.orderByField}`] : 'default(createdAt)',
    });

    const dbNotifications = await service.filterNotifications(
      backendFilter,
      backendPage,
      pageSize,
      orderBy,
      backendIdentifier,
    );

    console.log('[notifications.fetch] result', {
      count: dbNotifications.length,
      hasMore: dbNotifications.length === pageSize,
      topOrderValues: orderBy
        ? dbNotifications
            .slice(0, 3)
            .map((n) => {
              const value = n[orderBy.field];
              return value instanceof Date ? value.toISOString() : value;
            })
        : [],
    });

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
    const backendIdentifier = getDashboardReadBackendIdentifier();

    // Try to fetch as a regular notification first
    const notification = await service.getNotification(id, false, backendIdentifier);

    if (notification) {
      // Serialize based on notification type
      if (isOneOffNotification(notification)) {
        return serializeOneOffNotificationWithDetail(notification);
      }
      return serializeNotificationWithDetail(notification);
    }

    // If not found, try as a one-off notification
    const oneOffNotification = await service.getOneOffNotification(id, false, backendIdentifier);

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
 * Fetches template source for a notification at the commit SHA persisted with that notification.
 * The client only provides the notification ID; GitHub access is performed server-side.
 */
export async function fetchNotificationPreview(
  notificationId: string,
): Promise<NotificationPreviewResult> {
  try {
    const service = await getVintaSendService();
    const backendIdentifier = getDashboardReadBackendIdentifier();

    const notification =
      (await service.getNotification(notificationId, false, backendIdentifier))
      ?? (await service.getOneOffNotification(notificationId, false, backendIdentifier));

    if (!notification) {
      return {
        state: 'error',
        message: `Notification with ID ${notificationId} not found.`,
      };
    }

    const githubClient = createGitHubTemplateClientFromEnv();

    let gitCommitShaForPreview = notification.gitCommitSha;

    if (!gitCommitShaForPreview && notification.status === 'PENDING_SEND') {
      gitCommitShaForPreview = await githubClient.getLatestMainCommitSha();
    }

    if (!gitCommitShaForPreview) {
      return {
        state: 'missing_sha',
        message:
          'This notification does not have a tracked git commit SHA and is not pending send, so preview is unavailable.',
      };
    }

    const bodyTemplateContent = await githubClient.getTemplateContentByCommit({
      templatePath: notification.bodyTemplate,
      gitCommitSha: gitCommitShaForPreview,
    });

    let subjectTemplateContent: string | null = null;
    if (notification.subjectTemplate) {
      subjectTemplateContent = await githubClient.getTemplateContentByCommit({
        templatePath: notification.subjectTemplate,
        gitCommitSha: gitCommitShaForPreview,
      });
    }

    const renderedTemplate = await service.renderEmailTemplateFromContent(
      notification,
      {
        body: bodyTemplateContent,
        subject: subjectTemplateContent,
      },
      notification.contextUsed
        ? {
            context: notification.contextUsed,
          }
        : {
            contextName: notification.contextName,
            contextParameters: notification.contextParameters,
          },
    );

    return {
      state: 'success',
      gitCommitSha: gitCommitShaForPreview,
      bodyTemplatePath: notification.bodyTemplate,
      subjectTemplatePath: notification.subjectTemplate,
      renderedBodyHtml: renderedTemplate.body,
      renderedSubjectHtml: renderedTemplate.subject,
    };
  } catch (error) {
    console.error('Error fetching notification preview:', error);
    return {
      state: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Unknown error while fetching notification preview.',
    };
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
    const backendIdentifier = getDashboardReadBackendIdentifier();
    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const dbNotifications = await service.getPendingNotifications(
      page - 1,
      pageSize,
      backendIdentifier,
    );

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
    const backendIdentifier = getDashboardReadBackendIdentifier();
    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const dbNotifications = await service.getFutureNotifications(page - 1, pageSize, backendIdentifier);

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
    const backendIdentifier = getDashboardReadBackendIdentifier();
    // Convert from 1-indexed (dashboard) to 0-indexed (backend) pages
    const dbNotifications = await service.getOneOffNotifications(page - 1, pageSize, backendIdentifier);

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

/**
 * Cancels a notification if it is still pending send.
 *
 * @param notificationId - The ID of the notification to cancel
 * @returns Success state or error message
 */
export async function cancelNotification(
  notificationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const service = await getVintaSendService();
    const backendIdentifier = getDashboardReadBackendIdentifier();

    const notification =
      (await service.getNotification(notificationId, false, backendIdentifier))
      ?? (await service.getOneOffNotification(notificationId, false, backendIdentifier));

    if (!notification) {
      return {
        success: false,
        error: `Notification with ID ${notificationId} not found.`,
      };
    }

    if (notification.status !== 'PENDING_SEND') {
      return {
        success: false,
        error: 'Only notifications in PENDING_SEND status can be cancelled.',
      };
    }

    await service.cancelNotification(notificationId);

    return { success: true };
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while cancelling notification',
    };
  }
}

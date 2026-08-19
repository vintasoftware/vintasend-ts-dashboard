/**
 * Types the notifications UI works with.
 *
 * Everything describing a notification comes from the API contract
 * (`@/lib/api/types`); this module only adds the client-side filter state and
 * re-exports the contract so components have a single import path.
 */

import type { NotificationListQuery } from '@/lib/api/types';

export type {
  FilterCapabilities,
  JsonValue,
  Notification,
  NotificationAttachment,
  NotificationDetail,
  NotificationOrderByField,
  NotificationOrderDirection,
  NotificationPreview,
  NotificationStatus,
  NotificationType,
  OneOffNotification,
  OneOffNotificationDetail,
  PaginatedResponse,
  UserNotification,
  UserNotificationDetail,
} from '@/lib/api/types';

/**
 * Filter state held by the notifications page and mirrored into the URL.
 * It is the list query minus pagination, which the page tracks separately.
 */
export type NotificationFilters = Omit<NotificationListQuery, 'page' | 'pageSize'>;

/**
 * Every filter key that is synced to the URL, in the order they appear in the UI.
 */
export const NOTIFICATION_FILTER_KEYS = [
  'status',
  'notificationType',
  'adapterUsed',
  'userId',
  'bodyTemplate',
  'subjectTemplate',
  'contextName',
  'tenant',
  'createdAtFrom',
  'createdAtTo',
  'sentAtFrom',
  'sentAtTo',
] as const satisfies readonly (keyof NotificationFilters)[];

export const NOTIFICATION_SORTABLE_FIELDS = [
  'sendAfter',
  'sentAt',
  'readAt',
  'createdAt',
  'updatedAt',
] as const;

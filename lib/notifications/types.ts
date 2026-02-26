/**
 * Dashboard-specific types derived from VintaSend types using type algebra.
 * Converts database representations (with Date fields) to serializable DTOs (with ISO strings).
 */

import type {
  DatabaseNotification,
  DatabaseOneOffNotification,
} from 'vintasend';

import type {
  NotificationStatus,
} from 'vintasend/dist/types/notification-status';
import type {
  NotificationType,
} from 'vintasend/dist/types/notification-type';
import type { VintaSendConfig } from './get-vintasend-service';

export type {
  JsonValue,
} from 'vintasend/dist/types/json-values';

// Re-export core types from vintasend
export type {
  AnyDatabaseNotification,
} from 'vintasend';

/**
 * Helper type: converts Date fields to ISO string representations.
 * Normalizes null and undefined date fields to `string | null`.
 */
type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date | null | undefined
    ? T[K] extends Date
      ? string
      : string | null // normalize both null and undefined to `string | null`
    : T[K];
};

/**
 * Dashboard DTO for regular notifications - derived from DatabaseNotification with serialized dates.
 * Strips large context fields (contextUsed, contextParameters, extraParams) to keep payload small for list views.
 */
export type DashboardNotification = SerializeDates<
  Pick<
    DatabaseNotification<VintaSendConfig>,
    | 'id'
    | 'userId'
    | 'notificationType'
    | 'title'
    | 'contextName'
    | 'status'
    | 'sendAfter'
    | 'sentAt'
    | 'readAt'
    | 'createdAt'
    | 'adapterUsed'
    | 'bodyTemplate'
    | 'subjectTemplate'
    | 'gitCommitSha'
  >
>;

/**
 * Dashboard DTO for one-off notifications - derived from DatabaseOneOffNotification with serialized dates.
 * Strips large context fields (contextUsed, contextParameters, extraParams) to keep payload small for list views.
 */
export type DashboardOneOffNotification = SerializeDates<
  Pick<
    DatabaseOneOffNotification<VintaSendConfig>,
    | 'id'
    | 'emailOrPhone'
    | 'firstName'
    | 'lastName'
    | 'notificationType'
    | 'title'
    | 'contextName'
    | 'status'
    | 'sendAfter'
    | 'sentAt'
    | 'readAt'
    | 'createdAt'
    | 'adapterUsed'
    | 'bodyTemplate'
    | 'subjectTemplate'
    | 'gitCommitSha'
  >
>;

/**
 * Detail view DTO for regular notifications.
 * Extends DashboardNotification with full database fields including sensitive context data.
 */
export type DashboardNotificationDetail = SerializeDates<DatabaseNotification<VintaSendConfig>>;

/**
 * Detail view DTO for one-off notifications.
 * Extends DashboardOneOffNotification with full database fields including sensitive context data.
 */
export type DashboardOneOffNotificationDetail = SerializeDates<DatabaseOneOffNotification<VintaSendConfig>>;

/**
 * Union type for dashboard notifications (regular or one-off) - list view.
 */
export type AnyDashboardNotification =
  | DashboardNotification
  | DashboardOneOffNotification;

/**
 * Union type for dashboard notification details (regular or one-off) - detail view.
 */
export type AnyDashboardNotificationDetail =
  | DashboardNotificationDetail
  | DashboardOneOffNotificationDetail;

/**
 * Filters for querying notifications.
 * Maps to VintaSend's NotificationFilterFields for server-side filtering.
 */
export type NotificationFilters = {
  status?: NotificationStatus;
  notificationType?: NotificationType;
  adapterUsed?: string;
  userId?: string;
  bodyTemplate?: string;
  subjectTemplate?: string;
  contextName?: string;
  createdAtFrom?: string; // ISO date string
  createdAtTo?: string; // ISO date string
  sentAtFrom?: string; // ISO date string
  sentAtTo?: string; // ISO date string
};

/**
 * Paginated result wrapper for dashboard queries.
 */
export type PaginatedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

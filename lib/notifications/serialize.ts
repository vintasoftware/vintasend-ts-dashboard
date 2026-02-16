/**
 * Serialization logic to convert database notifications into dashboard DTOs.
 * Converts dates to ISO strings and strips large payloads for list views.
 */

import type {
  DatabaseNotification,
  DatabaseOneOffNotification,
  BaseNotificationTypeConfig,
} from 'vintasend';

import type {
  DashboardNotification,
  DashboardNotificationDetail,
  DashboardOneOffNotification,
  DashboardOneOffNotificationDetail,
} from './types';
import { VintaSendConfig } from './get-vintasend-service';

/**
 * Converts a database notification to a dashboard notification DTO.
 * Strips contextUsed and contextParameters to keep payload small.
 * Converts Date fields to ISO strings for serialization.
 */
export function serializeNotification(notification: DatabaseNotification<VintaSendConfig>): DashboardNotification {
  return {
    id: notification.id,
    userId: notification.userId,
    notificationType: notification.notificationType,
    title: notification.title,
    contextName: notification.contextName,
    status: notification.status,
    sendAfter: notification.sendAfter ? notification.sendAfter.toISOString() : null,
    sentAt: notification.sentAt ? notification.sentAt.toISOString() : null,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt ? notification.createdAt.toISOString() : undefined,
    adapterUsed: notification.adapterUsed,
    bodyTemplate: notification.bodyTemplate,
    subjectTemplate: notification.subjectTemplate,
  };
}

/**
 * Converts a database notification to a dashboard notification detail DTO.
 * Includes contextUsed and extraParams for the detail view.
 */
export function serializeNotificationWithDetail(
  notification: DatabaseNotification<VintaSendConfig>,
): DashboardNotificationDetail {
  return {
    ...serializeNotification(notification),
    contextUsed: notification.contextUsed,
    contextParameters: notification.contextParameters,
    extraParams: notification.extraParams,
  };
}

/**
 * Converts a database one-off notification to a dashboard one-off notification DTO.
 * Strips contextUsed and contextParameters to keep payload small.
 */
export function serializeOneOffNotification(
  notification: DatabaseOneOffNotification<VintaSendConfig>,
): DashboardOneOffNotification {
  return {
    id: String(notification.id),
    emailOrPhone: notification.emailOrPhone,
    firstName: notification.firstName,
    lastName: notification.lastName,
    notificationType: notification.notificationType,
    title: notification.title,
    contextName: notification.contextName,
    status: notification.status,
    sendAfter: notification.sendAfter ? notification.sendAfter.toISOString() : null,
    sentAt: notification.sentAt ? notification.sentAt.toISOString() : null,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt ? notification.createdAt.toISOString() : undefined,
    adapterUsed: notification.adapterUsed,
    bodyTemplate: notification.bodyTemplate,
    subjectTemplate: notification.subjectTemplate,
  };
}

/**
 * Converts a database one-off notification to a dashboard one-off notification detail DTO.
 * Includes contextUsed and extraParams for the detail view.
 */
export function serializeOneOffNotificationWithDetail(
  notification: DatabaseOneOffNotification<VintaSendConfig>,
): DashboardOneOffNotificationDetail {
  return {
    ...serializeOneOffNotification(notification),
    contextUsed: notification.contextUsed,
    contextParameters: notification.contextParameters,
    extraParams: notification.extraParams,
  };
}

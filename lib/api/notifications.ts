import 'server-only';

import { apiRequest } from './client';
import type {
  CancelledNotification,
  DataResponse,
  FilterCapabilities,
  Notification,
  NotificationDetail,
  NotificationPreview,
  PaginatedResponse,
} from './types';
import type { NotificationFilters } from '@/lib/notifications/types';

/**
 * Typed wrappers around the VintaSend API endpoints.
 */

function toQuery(
  filters: NotificationFilters,
  page: number,
  pageSize: number,
): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {
    page: String(page),
    pageSize: String(pageSize),
  };

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = String(value);
    }
  }

  return query;
}

function pageQuery(page: number, pageSize: number): Record<string, string> {
  return { page: String(page), pageSize: String(pageSize) };
}

export async function listNotifications(
  filters: NotificationFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Notification>> {
  return apiRequest<PaginatedResponse<Notification>>('/api/v1/notifications', {
    query: toQuery(filters, page, pageSize),
  });
}

export async function listPendingNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Notification>> {
  return apiRequest<PaginatedResponse<Notification>>('/api/v1/notifications/pending', {
    query: pageQuery(page, pageSize),
  });
}

export async function listFutureNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Notification>> {
  return apiRequest<PaginatedResponse<Notification>>('/api/v1/notifications/future', {
    query: pageQuery(page, pageSize),
  });
}

export async function listOneOffNotifications(
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Notification>> {
  return apiRequest<PaginatedResponse<Notification>>('/api/v1/notifications/one-off', {
    query: pageQuery(page, pageSize),
  });
}

export async function getNotification(id: string): Promise<NotificationDetail> {
  const response = await apiRequest<DataResponse<NotificationDetail>>(
    `/api/v1/notifications/${encodeURIComponent(id)}`,
  );

  return response.data;
}

export async function getNotificationPreview(id: string): Promise<NotificationPreview> {
  const response = await apiRequest<DataResponse<NotificationPreview>>(
    `/api/v1/notifications/${encodeURIComponent(id)}/preview`,
  );

  return response.data;
}

export async function resendNotification(
  id: string,
  useStoredContext: boolean,
): Promise<Notification> {
  const response = await apiRequest<DataResponse<Notification>>(
    `/api/v1/notifications/${encodeURIComponent(id)}/resend`,
    { method: 'POST', body: { useStoredContext } },
  );

  return response.data;
}

export async function cancelNotification(id: string): Promise<CancelledNotification> {
  const response = await apiRequest<DataResponse<CancelledNotification>>(
    `/api/v1/notifications/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
  );

  return response.data;
}

export async function getFilterCapabilities(): Promise<FilterCapabilities> {
  const response = await apiRequest<DataResponse<FilterCapabilities>>('/api/v1/capabilities');

  return response.data;
}

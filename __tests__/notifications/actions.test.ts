/**
 * Tests for the notification server actions.
 *
 * The actions are a thin layer over the API client, so these cover the layer's
 * own behaviour: error wrapping for read actions, and the result objects the
 * dialogs branch on.
 */

jest.mock('@/lib/api/notifications', () => ({
  listNotifications: jest.fn(),
  listPendingNotifications: jest.fn(),
  listFutureNotifications: jest.fn(),
  listOneOffNotifications: jest.fn(),
  getNotification: jest.fn(),
  getNotificationPreview: jest.fn(),
  resendNotification: jest.fn(),
  cancelNotification: jest.fn(),
}));

import { VintaSendApiError } from '@/lib/api/client';
import * as api from '@/lib/api/notifications';
import {
  cancelNotification,
  fetchFutureNotifications,
  fetchNotificationDetail,
  fetchNotificationPreview,
  fetchNotifications,
  fetchOneOffNotifications,
  fetchPendingNotifications,
  resendNotification,
} from '@/app/actions';
import type { Notification, PaginatedResponse } from '@/lib/notifications/types';

const mockedApi = api as jest.Mocked<typeof api>;

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    kind: 'user',
    id: 'notif-1',
    userId: 'user-1',
    notificationType: 'EMAIL',
    title: 'Test Notification',
    contextName: 'taskAssignment',
    status: 'SENT',
    sendAfter: null,
    sentAt: '2024-01-15T10:00:00.000Z',
    readAt: null,
    createdAt: '2024-01-15T09:00:00.000Z',
    updatedAt: '2024-01-15T09:30:00.000Z',
    adapterUsed: 'mailgun',
    bodyTemplate: 'emails/body.pug',
    subjectTemplate: 'emails/subject.pug',
    gitCommitSha: 'abc123',
    tenant: null,
    ...overrides,
  } as Notification;
}

function makePage(data: Notification[]): PaginatedResponse<Notification> {
  return { data, page: 1, pageSize: 20, hasMore: false };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('fetchNotifications', () => {
  it('passes filters and pagination through to the API', async () => {
    mockedApi.listNotifications.mockResolvedValue(makePage([makeNotification()]));

    const result = await fetchNotifications({ status: 'SENT' }, 2, 50);

    expect(mockedApi.listNotifications).toHaveBeenCalledWith({ status: 'SENT' }, 2, 50);
    expect(result.data).toHaveLength(1);
  });

  it('wraps API failures in a message the error boundary can show', async () => {
    mockedApi.listNotifications.mockRejectedValue(
      new VintaSendApiError('UPSTREAM_ERROR', 'API unreachable', 503),
    );

    await expect(fetchNotifications({}, 1, 20)).rejects.toThrow(
      'Failed to fetch notifications: API unreachable',
    );
  });
});

describe('collection actions', () => {
  it.each([
    [fetchPendingNotifications, 'listPendingNotifications'],
    [fetchFutureNotifications, 'listFutureNotifications'],
    [fetchOneOffNotifications, 'listOneOffNotifications'],
  ] as const)('delegates to %s', async (action, method) => {
    mockedApi[method].mockResolvedValue(makePage([]));

    await action(3, 10);

    expect(mockedApi[method]).toHaveBeenCalledWith(3, 10);
  });
});

describe('fetchNotificationDetail', () => {
  it('returns the notification detail', async () => {
    const detail = {
      ...makeNotification(),
      contextUsed: { key: 'value' },
      contextParameters: null,
      extraParams: null,
      attachments: [],
    };
    mockedApi.getNotification.mockResolvedValue(detail as never);

    await expect(fetchNotificationDetail('notif-1')).resolves.toEqual(detail);
  });

  it('wraps failures', async () => {
    mockedApi.getNotification.mockRejectedValue(
      new VintaSendApiError('NOT_FOUND', 'Notification with ID notif-9 was not found.', 404),
    );

    await expect(fetchNotificationDetail('notif-9')).rejects.toThrow(
      'Failed to fetch notification detail: Notification with ID notif-9 was not found.',
    );
  });
});

describe('fetchNotificationPreview', () => {
  it('returns a success state with the rendered templates', async () => {
    mockedApi.getNotificationPreview.mockResolvedValue({
      gitCommitSha: 'abc123',
      bodyTemplatePath: 'emails/body.pug',
      subjectTemplatePath: 'emails/subject.pug',
      renderedBodyHtml: '<p>Body</p>',
      renderedSubjectHtml: '<h1>Subject</h1>',
    });

    await expect(fetchNotificationPreview('notif-1')).resolves.toEqual({
      state: 'success',
      gitCommitSha: 'abc123',
      bodyTemplatePath: 'emails/body.pug',
      subjectTemplatePath: 'emails/subject.pug',
      renderedBodyHtml: '<p>Body</p>',
      renderedSubjectHtml: '<h1>Subject</h1>',
    });
  });

  it('maps PREVIEW_UNAVAILABLE to the missing-SHA state', async () => {
    mockedApi.getNotificationPreview.mockRejectedValue(
      new VintaSendApiError('PREVIEW_UNAVAILABLE', 'No tracked commit SHA.', 409),
    );

    await expect(fetchNotificationPreview('notif-1')).resolves.toEqual({
      state: 'missing_sha',
      message: 'No tracked commit SHA.',
    });
  });

  it('maps any other failure to the error state', async () => {
    mockedApi.getNotificationPreview.mockRejectedValue(
      new VintaSendApiError('UPSTREAM_ERROR', 'GitHub is down.', 502),
    );

    await expect(fetchNotificationPreview('notif-1')).resolves.toEqual({
      state: 'error',
      message: 'GitHub is down.',
    });
  });
});

describe('resendNotification', () => {
  it('returns the new notification on success', async () => {
    const resent = makeNotification({ id: 'notif-2' });
    mockedApi.resendNotification.mockResolvedValue(resent);

    await expect(resendNotification('notif-1', true)).resolves.toEqual({
      success: true,
      notification: resent,
    });
    expect(mockedApi.resendNotification).toHaveBeenCalledWith('notif-1', true);
  });

  it('returns the API message when the resend is refused', async () => {
    mockedApi.resendNotification.mockRejectedValue(
      new VintaSendApiError('CONFLICT', 'The notification could not be resent.', 409),
    );

    await expect(resendNotification('notif-1', false)).resolves.toEqual({
      success: false,
      error: 'The notification could not be resent.',
    });
  });
});

describe('cancelNotification', () => {
  it('reports success', async () => {
    mockedApi.cancelNotification.mockResolvedValue({ id: 'notif-1', status: 'CANCELLED' });

    await expect(cancelNotification('notif-1')).resolves.toEqual({ success: true });
  });

  it('reports the conflict message when the notification is not pending', async () => {
    mockedApi.cancelNotification.mockRejectedValue(
      new VintaSendApiError(
        'CONFLICT',
        'Only notifications in PENDING_SEND status can be cancelled.',
        409,
      ),
    );

    await expect(cancelNotification('notif-1')).resolves.toEqual({
      success: false,
      error: 'Only notifications in PENDING_SEND status can be cancelled.',
    });
  });
});

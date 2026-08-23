/**
 * @jest-environment node
 */

/**
 * Tests for the typed VintaSend API endpoint wrappers.
 *
 * These are thin, but they own two things worth pinning: how filters and
 * pagination become a query string, and the `{ data }` unwrapping that every
 * single-resource endpoint depends on. IDs are also URL-encoded here, which is
 * the layer's only injection-shaped concern.
 */

const apiRequest = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...(args as [])),
}));

jest.mock('server-only', () => ({}));

import {
  cancelNotification,
  getFilterCapabilities,
  getNotification,
  getNotificationPreview,
  listFutureNotifications,
  listNotifications,
  listOneOffNotifications,
  listPendingNotifications,
  resendNotification,
} from '@/lib/api/notifications';

beforeEach(() => {
  jest.clearAllMocks();
  apiRequest.mockResolvedValue({ data: { id: 'notif-1' } });
});

describe('listNotifications', () => {
  it('always sends page and pageSize as strings', async () => {
    await listNotifications({}, 2, 50);

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/notifications', {
      query: { page: '2', pageSize: '50' },
    });
  });

  it('passes filters through alongside pagination', async () => {
    await listNotifications({ status: 'SENT', adapterUsed: 'mailgun' }, 1, 20);

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/notifications', {
      query: { page: '1', pageSize: '20', status: 'SENT', adapterUsed: 'mailgun' },
    });
  });

  it('drops undefined, null and empty filter values instead of sending blanks', async () => {
    await listNotifications(
      {
        status: 'SENT',
        adapterUsed: '',
        userId: undefined,
        tenant: null as never,
      },
      1,
      20,
    );

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/notifications', {
      query: { page: '1', pageSize: '20', status: 'SENT' },
    });
  });

  it('returns the paginated envelope untouched', async () => {
    const page = { data: [{ id: 'notif-1' }], page: 1, pageSize: 20, hasMore: true };
    apiRequest.mockResolvedValue(page);

    await expect(listNotifications({}, 1, 20)).resolves.toBe(page);
  });
});

describe('the fixed-collection list endpoints', () => {
  it.each([
    [listPendingNotifications, '/api/v1/notifications/pending'],
    [listFutureNotifications, '/api/v1/notifications/future'],
    [listOneOffNotifications, '/api/v1/notifications/one-off'],
  ])('requests %#: %s with pagination only', async (fn, path) => {
    await (fn as (page: number, pageSize: number) => Promise<unknown>)(3, 10);

    expect(apiRequest).toHaveBeenCalledWith(path, { query: { page: '3', pageSize: '10' } });
  });
});

describe('single-resource endpoints', () => {
  it('unwraps the data envelope when fetching a notification', async () => {
    apiRequest.mockResolvedValue({ data: { id: 'notif-1', status: 'SENT' } });

    await expect(getNotification('notif-1')).resolves.toEqual({ id: 'notif-1', status: 'SENT' });
    expect(apiRequest).toHaveBeenCalledWith('/api/v1/notifications/notif-1');
  });

  it('unwraps the data envelope when fetching a preview', async () => {
    apiRequest.mockResolvedValue({ data: { renderedBodyHtml: '<p>hi</p>' } });

    await expect(getNotificationPreview('notif-1')).resolves.toEqual({
      renderedBodyHtml: '<p>hi</p>',
    });
    expect(apiRequest).toHaveBeenCalledWith('/api/v1/notifications/notif-1/preview');
  });

  it('unwraps the data envelope when fetching capabilities', async () => {
    apiRequest.mockResolvedValue({ data: { filters: ['status'] } });

    await expect(getFilterCapabilities()).resolves.toEqual({ filters: ['status'] });
    expect(apiRequest).toHaveBeenCalledWith('/api/v1/capabilities');
  });

  it.each([
    ['getNotification', getNotification, '/api/v1/notifications/notif%2F1'],
    ['getNotificationPreview', getNotificationPreview, '/api/v1/notifications/notif%2F1/preview'],
  ])('URL-encodes the id in %s', async (_name, fn, expected) => {
    await (fn as (id: string) => Promise<unknown>)('notif/1');

    expect(apiRequest).toHaveBeenCalledWith(expected);
  });
});

describe('resendNotification', () => {
  it('POSTs the context choice and unwraps the new notification', async () => {
    apiRequest.mockResolvedValue({ data: { id: 'notif-2' } });

    await expect(resendNotification('notif-1', true)).resolves.toEqual({ id: 'notif-2' });
    expect(apiRequest).toHaveBeenCalledWith('/api/v1/notifications/notif-1/resend', {
      method: 'POST',
      body: { useStoredContext: true },
    });
  });

  it('sends useStoredContext=false when the context is recalculated', async () => {
    await resendNotification('notif-1', false);

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/notifications/notif-1/resend',
      expect.objectContaining({ body: { useStoredContext: false } }),
    );
  });

  it('URL-encodes the id', async () => {
    await resendNotification('notif/1', false);

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/notifications/notif%2F1/resend',
      expect.anything(),
    );
  });

  it('propagates a failure from the client', async () => {
    apiRequest.mockRejectedValue(new Error('boom'));

    await expect(resendNotification('notif-1', false)).rejects.toThrow('boom');
  });
});

describe('cancelNotification', () => {
  it('POSTs without a body and unwraps the cancelled notification', async () => {
    apiRequest.mockResolvedValue({ data: { id: 'notif-1', status: 'CANCELLED' } });

    await expect(cancelNotification('notif-1')).resolves.toEqual({
      id: 'notif-1',
      status: 'CANCELLED',
    });
    expect(apiRequest).toHaveBeenCalledWith('/api/v1/notifications/notif-1/cancel', {
      method: 'POST',
    });
  });

  it('URL-encodes the id', async () => {
    await cancelNotification('notif/1');

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/notifications/notif%2F1/cancel',
      expect.anything(),
    );
  });
});

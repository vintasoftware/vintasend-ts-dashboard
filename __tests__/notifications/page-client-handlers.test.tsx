/**
 * Tests for the notifications page container's callback wiring.
 *
 * `page.test.tsx` covers this page as an integration, driving the real table
 * and filter bar. This file targets the container's own job instead — which
 * child gets which id, what lands in the URL, and what is refetched after a
 * mutation — by stubbing the children so each callback can be fired directly.
 */

const push = jest.fn();
const replace = jest.fn();
const fetchNotifications = jest.fn();
const cancelNotification = jest.fn();
const toastSuccess = jest.fn();
const toastError = jest.fn();

let searchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => searchParams,
}));

jest.mock('@/app/actions', () => ({
  fetchNotifications: (...args: unknown[]) => fetchNotifications(...(args as [])),
  cancelNotification: (...args: unknown[]) => cancelNotification(...(args as [])),
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...(args as [])),
    error: (...args: unknown[]) => toastError(...(args as [])),
  },
}));

/**
 * Child stubs. Each renders the id it was handed plus buttons that fire the
 * callbacks the container passes down.
 */
jest.mock('@/app/components/notifications-filters', () => ({
  NotificationsFilters: ({ isLoading }: { isLoading?: boolean }) => (
    <div data-testid="filters" data-loading={String(!!isLoading)} />
  ),
}));

jest.mock('@/app/components/notifications-table', () => ({
  NotificationsTable: (props: Record<string, never>) => {
    const p = props as unknown as {
      currentPage: number;
      orderByField?: string;
      orderByDirection?: string;
      onRowClick: (id: string) => void;
      onResend: (id: string) => void;
      onPreviewRender: (id: string) => void;
      onCancel: (id: string) => void;
      onPaginationChange: (page: number) => void;
      onSortingChange: (sorting: { id: string; desc: boolean }[]) => void;
    };
    return (
      <div data-testid="table" data-page={p.currentPage} data-order={p.orderByField ?? ''}
           data-direction={p.orderByDirection ?? ''}>
        <button type="button" onClick={() => p.onRowClick('notif-1')}>row</button>
        <button type="button" onClick={() => p.onResend('notif-1')}>resend</button>
        <button type="button" onClick={() => p.onPreviewRender('notif-1')}>preview</button>
        <button type="button" onClick={() => p.onCancel('notif-1')}>cancel</button>
        <button type="button" onClick={() => p.onPaginationChange(3)}>page-3</button>
        <button type="button" onClick={() => p.onSortingChange([{ id: 'sentAt', desc: true }])}>
          sort-sent-desc
        </button>
        <button type="button" onClick={() => p.onSortingChange([{ id: 'sentAt', desc: false }])}>
          sort-sent-asc
        </button>
        <button type="button" onClick={() => p.onSortingChange([{ id: 'title', desc: false }])}>
          sort-unsortable
        </button>
        <button type="button" onClick={() => p.onSortingChange([])}>sort-none</button>
      </div>
    );
  },
}));

/**
 * Detail panel and preview dialog share a shape: an id plus a close callback.
 * The factory is inlined per mock because jest.mock is hoisted above consts.
 */
jest.mock('@/app/components/notification-detail', () => ({
  NotificationDetail: (props: Record<string, never>) => {
    const p = props as unknown as { notificationId: string | null; onClose: () => void };
    return (
      <div data-testid="detail" data-id={p.notificationId ?? ''}>
        <button type="button" onClick={p.onClose}>close-detail</button>
      </div>
    );
  },
}));

jest.mock('@/app/components/preview-render-dialog', () => ({
  PreviewRenderDialog: (props: Record<string, never>) => {
    const p = props as unknown as { notificationId: string | null; onClose: () => void };
    return (
      <div data-testid="preview" data-id={p.notificationId ?? ''}>
        <button type="button" onClick={p.onClose}>close-preview</button>
      </div>
    );
  },
}));

jest.mock('@/app/components/resend-notification-dialog', () => ({
  ResendNotificationDialog: (props: Record<string, never>) => {
    const p = props as unknown as {
      notificationId: string | null;
      onClose: () => void;
      onResent: () => void;
    };
    return (
      <div data-testid="resend" data-id={p.notificationId ?? ''}>
        <button type="button" onClick={p.onClose}>close-resend</button>
        <button type="button" onClick={p.onResent}>did-resend</button>
      </div>
    );
  },
}));

jest.mock('@/app/components/cancel-notification-dialog', () => ({
  CancelNotificationDialog: (props: Record<string, never>) => {
    const p = props as unknown as {
      notificationId: string | null;
      onClose: () => void;
      onConfirm: (id: string) => void;
    };
    return (
      <div data-testid="cancel" data-id={p.notificationId ?? ''}>
        <button type="button" onClick={p.onClose}>close-cancel</button>
        <button type="button" onClick={() => p.onConfirm('notif-1')}>confirm-cancel</button>
      </div>
    );
  },
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsPageClient } from '@/app/components/notifications-page-client';
import type { Notification, NotificationFilters, PaginatedResponse } from '@/lib/notifications/types';

const page = (overrides: Partial<PaginatedResponse<Notification>> = {}) =>
  ({ data: [], page: 1, pageSize: 20, hasMore: false, ...overrides }) as PaginatedResponse<Notification>;

const setup = (initialFilters: NotificationFilters = {}, initialData = page()) => {
  render(
    <NotificationsPageClient
      initialData={initialData}
      initialFilters={initialFilters}
      initialPage={initialData.page}
    />,
  );
  return userEvent.setup();
};

const click = async (interaction: ReturnType<typeof userEvent.setup>, name: string) =>
  interaction.click(screen.getByRole('button', { name }));

const lastReplace = () => new URLSearchParams(String(replace.mock.calls.at(-1)?.[0]).slice(1));

beforeEach(() => {
  jest.clearAllMocks();
  searchParams = new URLSearchParams();
  fetchNotifications.mockResolvedValue(page());
  cancelNotification.mockResolvedValue({ success: true });
});

describe('detail panel and dialogs', () => {
  it.each([
    ['row', 'detail', 'close-detail'],
    ['resend', 'resend', 'close-resend'],
    ['preview', 'preview', 'close-preview'],
    ['cancel', 'cancel', 'close-cancel'],
  ])('opens and closes the %s target', async (openLabel, testId, closeLabel) => {
    const interaction = setup();

    expect(screen.getByTestId(testId)).toHaveAttribute('data-id', '');

    await click(interaction, openLabel);
    expect(screen.getByTestId(testId)).toHaveAttribute('data-id', 'notif-1');

    await click(interaction, closeLabel);
    expect(screen.getByTestId(testId)).toHaveAttribute('data-id', '');
  });

  it('keeps the four targets independent of one another', async () => {
    const interaction = setup();

    await click(interaction, 'resend');

    expect(screen.getByTestId('resend')).toHaveAttribute('data-id', 'notif-1');
    expect(screen.getByTestId('detail')).toHaveAttribute('data-id', '');
    expect(screen.getByTestId('preview')).toHaveAttribute('data-id', '');
    expect(screen.getByTestId('cancel')).toHaveAttribute('data-id', '');
  });
});

describe('cancelling a notification', () => {
  it('cancels, confirms to the user, closes and refreshes the current page', async () => {
    searchParams = new URLSearchParams('status=PENDING_SEND');
    const interaction = setup({}, page({ page: 2, pageSize: 50 }));

    await click(interaction, 'cancel');
    await click(interaction, 'confirm-cancel');

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Notification cancelled successfully.'));
    expect(cancelNotification).toHaveBeenCalledWith('notif-1');
    expect(screen.getByTestId('cancel')).toHaveAttribute('data-id', '');
    // The refresh keeps the active filters and stays on the current page.
    expect(fetchNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING_SEND' }),
      2,
      50,
    );
  });

  it('reports a failed cancellation and leaves the dialog open', async () => {
    cancelNotification.mockResolvedValue({ success: false, error: 'already sent' });
    const interaction = setup();

    await click(interaction, 'cancel');
    await click(interaction, 'confirm-cancel');

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Failed to cancel notification: already sent'),
    );
    expect(screen.getByTestId('cancel')).toHaveAttribute('data-id', 'notif-1');
    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  it('still closes when the post-cancel refresh fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchNotifications.mockRejectedValue(new Error('API down'));
    const interaction = setup();

    await click(interaction, 'cancel');
    await click(interaction, 'confirm-cancel');

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalled();
    expect(screen.getByTestId('cancel')).toHaveAttribute('data-id', '');
    consoleError.mockRestore();
  });
});

describe('refreshing after a resend', () => {
  it('refetches the current page with the active filters', async () => {
    searchParams = new URLSearchParams('adapterUsed=mailgun');
    const interaction = setup({}, page({ page: 4, pageSize: 10 }));

    await click(interaction, 'did-resend');

    await waitFor(() =>
      expect(fetchNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ adapterUsed: 'mailgun' }),
        4,
        10,
      ),
    );
  });

  it('swallows a failed refresh rather than breaking the page', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchNotifications.mockRejectedValue(new Error('API down'));
    const interaction = setup();

    await click(interaction, 'did-resend');

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Error refreshing notifications after resend:',
        expect.any(Error),
      ),
    );
    expect(screen.getByTestId('table')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});

describe('pagination', () => {
  it('writes the new page to the URL and refetches it', async () => {
    searchParams = new URLSearchParams('status=SENT');
    const interaction = setup({}, page({ pageSize: 25 }));

    await click(interaction, 'page-3');

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(lastReplace().get('page')).toBe('3');
    expect(replace).toHaveBeenCalledWith(expect.any(String), { scroll: false });
    expect(fetchNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SENT' }),
      3,
      25,
    );
  });
});

describe('sorting', () => {
  it('records a sortable column and direction in the URL', async () => {
    const interaction = setup();

    await click(interaction, 'sort-sent-desc');

    await waitFor(() => expect(replace).toHaveBeenCalled());
    const params = lastReplace();
    expect(params.get('orderByField')).toBe('sentAt');
    expect(params.get('orderByDirection')).toBe('desc');
    // Re-sorting always returns to the first page.
    expect(params.get('page')).toBe('1');
  });

  it('records an ascending sort', async () => {
    const interaction = setup();

    await click(interaction, 'sort-sent-asc');

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(lastReplace().get('orderByDirection')).toBe('asc');
  });

  it.each(['sort-unsortable', 'sort-none'])(
    'drops the sort params for %s',
    async (label) => {
      searchParams = new URLSearchParams('orderByField=sentAt&orderByDirection=desc');
      const interaction = setup();

      await click(interaction, label);

      await waitFor(() => expect(replace).toHaveBeenCalled());
      const params = lastReplace();
      expect(params.get('orderByField')).toBeNull();
      expect(params.get('orderByDirection')).toBeNull();
    },
  );

  it('passes the current sort down to the table', () => {
    searchParams = new URLSearchParams('orderByField=createdAt&orderByDirection=asc');
    setup();

    expect(screen.getByTestId('table')).toHaveAttribute('data-order', 'createdAt');
    expect(screen.getByTestId('table')).toHaveAttribute('data-direction', 'asc');
  });
});

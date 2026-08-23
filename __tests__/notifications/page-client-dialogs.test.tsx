/**
 * Tests for the dialogs the notifications page owns.
 *
 * `page-client.test.tsx` covers the data path against the real core hooks.
 * This file is about the part the core has no opinion on: which row's id
 * reaches which panel, and what happens after a cancel. The core hooks are
 * mocked here so a dialog assertion cannot fail because of a query.
 */

const setFilters = jest.fn();
const setPage = jest.fn();
const setSort = jest.fn();
const refetch = jest.fn();
const mutateAsync = jest.fn();
const toastSuccess = jest.fn();
const toastError = jest.fn();

let listState: Record<string, unknown> = {};

jest.mock('vintasend-dashboard-core', () => ({
  ...jest.requireActual('vintasend-dashboard-core'),
  useFilteredNotifications: () => ({
    notifications: [],
    filters: {},
    page: 1,
    pageSize: 20,
    setFilters,
    setPage,
    setSort,
    hasNextPage: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch,
    ...listState,
  }),
  useCancelNotification: () => ({ mutateAsync, isPending: false }),
}));

jest.mock('vintasend-dashboard-core/next', () => ({
  useNextRouterAdapter: () => ({ searchParams: new URLSearchParams(), setSearchParams: jest.fn() }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...(args as [])),
    error: (...args: unknown[]) => toastError(...(args as [])),
  },
}));

jest.mock('@/app/components/notifications-filters', () => ({
  NotificationsFilters: () => <div data-testid="filters" />,
}));

jest.mock('@/app/components/notifications-table', () => ({
  NotificationsTable: (props: Record<string, never>) => {
    const p = props as unknown as {
      onRowClick: (id: string) => void;
      onResend: (id: string) => void;
      onPreviewRender: (id: string) => void;
      onCancel: (id: string) => void;
      onSortingChange: (sorting: { id: string; desc: boolean }[]) => void;
    };
    return (
      <div data-testid="table">
        <button type="button" onClick={() => p.onRowClick('notif-1')}>row</button>
        <button type="button" onClick={() => p.onSortingChange([{ id: 'sentAt', desc: true }])}>
          sort-sentAt
        </button>
        <button type="button" onClick={() => p.onSortingChange([{ id: 'sentAt', desc: false }])}>
          sort-sentAt-asc
        </button>
        <button type="button" onClick={() => p.onSortingChange([{ id: 'title', desc: false }])}>
          sort-unsupported
        </button>
        <button type="button" onClick={() => p.onSortingChange([])}>sort-none</button>
        <button type="button" onClick={() => p.onResend('notif-1')}>resend</button>
        <button type="button" onClick={() => p.onPreviewRender('notif-1')}>preview</button>
        <button type="button" onClick={() => p.onCancel('notif-1')}>cancel</button>
      </div>
    );
  },
}));

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
    const p = props as unknown as { notificationId: string | null; onClose: () => void };
    return (
      <div data-testid="resend" data-id={p.notificationId ?? ''}>
        <button type="button" onClick={p.onClose}>close-resend</button>
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

const setup = () => {
  render(<NotificationsPageClient />);
  return userEvent.setup();
};

const click = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('button', { name }));

beforeEach(() => {
  jest.clearAllMocks();
  listState = {};
  mutateAsync.mockResolvedValue({ data: { id: 'notif-1', status: 'CANCELLED' } });
});

describe('opening and closing panels', () => {
  it.each([
    ['row', 'detail', 'close-detail'],
    ['resend', 'resend', 'close-resend'],
    ['preview', 'preview', 'close-preview'],
    ['cancel', 'cancel', 'close-cancel'],
  ])('routes the %s action to the %s panel', async (open, panel, close) => {
    const user = setup();

    expect(screen.getByTestId(panel)).toHaveAttribute('data-id', '');

    await click(user, open);
    expect(screen.getByTestId(panel)).toHaveAttribute('data-id', 'notif-1');

    await click(user, close);
    expect(screen.getByTestId(panel)).toHaveAttribute('data-id', '');
  });

  it('keeps the four panels independent', async () => {
    const user = setup();

    await click(user, 'preview');

    expect(screen.getByTestId('preview')).toHaveAttribute('data-id', 'notif-1');
    expect(screen.getByTestId('detail')).toHaveAttribute('data-id', '');
    expect(screen.getByTestId('resend')).toHaveAttribute('data-id', '');
    expect(screen.getByTestId('cancel')).toHaveAttribute('data-id', '');
  });
});

describe('cancelling a notification', () => {
  it('sends the cancel in the shape the generated client expects', async () => {
    const user = setup();

    await click(user, 'cancel');
    await click(user, 'confirm-cancel');

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ params: { path: { id: 'notif-1' } } }),
    );
  });

  it('confirms to the user and closes, without refetching by hand', async () => {
    const user = setup();

    await click(user, 'cancel');
    await click(user, 'confirm-cancel');

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Notification cancelled successfully.'),
    );
    expect(screen.getByTestId('cancel')).toHaveAttribute('data-id', '');
    // The mutation invalidates the notification lists itself.
    expect(refetch).not.toHaveBeenCalled();
  });

  it('reports the API message and leaves the dialog open on failure', async () => {
    mutateAsync.mockRejectedValue({
      error: { code: 'CONFLICT', message: 'Notification is no longer pending.' },
    });
    const user = setup();

    await click(user, 'cancel');
    await click(user, 'confirm-cancel');

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'Failed to cancel notification: Notification is no longer pending.',
      ),
    );
    expect(screen.getByTestId('cancel')).toHaveAttribute('data-id', 'notif-1');
  });

  it('still reports something useful when the failure is not from the API', async () => {
    mutateAsync.mockRejectedValue(new Error('Network request failed'));
    const user = setup();

    await click(user, 'cancel');
    await click(user, 'confirm-cancel');

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'Failed to cancel notification: Network request failed',
      ),
    );
  });
});

describe('list state', () => {
  it('shows the error panel instead of the table when the query fails', () => {
    listState = {
      isError: true,
      error: { error: { code: 'INTERNAL_ERROR', message: 'Backend exploded.' } },
    };

    render(<NotificationsPageClient />);

    expect(screen.getByTestId('notifications-error')).toBeInTheDocument();
    expect(screen.getByText('Backend exploded.')).toBeInTheDocument();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });
});

describe('sorting', () => {
  it('passes a sortable column and direction to the core hook', async () => {
    const user = setup();

    await click(user, 'sort-sentAt');

    expect(setSort).toHaveBeenCalledWith('sentAt', 'desc');
  });

  it('passes an ascending sort', async () => {
    const user = setup();

    await click(user, 'sort-sentAt-asc');

    expect(setSort).toHaveBeenCalledWith('sentAt', 'asc');
  });

  it('clears the sort for a column the contract cannot order by', async () => {
    const user = setup();

    await click(user, 'sort-unsupported');

    // Forwarding it would produce a 400; the contract lists what is sortable.
    expect(setSort).toHaveBeenCalledWith();
  });

  it('clears the sort when the table reports no sorting at all', async () => {
    const user = setup();

    await click(user, 'sort-none');

    expect(setSort).toHaveBeenCalledWith();
  });
});

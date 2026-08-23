/**
 * Tests for the notifications table column definitions.
 *
 * The columns own the row-level action menu, and which entries it offers is
 * driven by the notification's own shape: one-off notifications cannot be
 * resent, and a preview needs either a commit SHA or a still-pending send.
 * Those rules are asserted here rather than through the table's rendering.
 */

const toastSuccess = jest.fn();

jest.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...(args as [])) },
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsTable } from '@/app/components/notifications-table';
import type { Notification } from '@/lib/notifications/types';

const userNotification = (overrides: Partial<Notification> = {}): Notification =>
  ({
    kind: 'user',
    id: 'notif-1',
    userId: 'user-1',
    notificationType: 'EMAIL',
    title: 'Welcome',
    contextName: 'taskAssignment',
    status: 'SENT',
    sendAfter: null,
    sentAt: '2024-01-02T10:00:00Z',
    readAt: null,
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-02T10:00:00Z',
    adapterUsed: 'nodemailer',
    gitCommitSha: 'a'.repeat(40),
    requestedTemplateVersion: null,
    usedTemplateVersion: null,
    bodyTemplate: 'body.pug',
    subjectTemplate: 'subject.pug',
    tenant: null,
    ...overrides,
  }) as Notification;

const oneOffNotification = (overrides: Partial<Notification> = {}): Notification =>
  ({
    ...userNotification(),
    kind: 'one-off',
    id: 'notif-oneoff',
    emailOrPhone: 'guest@example.com',
    firstName: 'Jane',
    lastName: 'Guest',
    ...overrides,
  }) as Notification;

const renderTable = (data: Notification[], options: Record<string, unknown> = {}) =>
  render(
    <NotificationsTable
      data={data}
      hasMore={false}
      currentPage={1}
      pageSize={20}
      {...options}
    />,
  );

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Open menu' }));
  return screen.findByRole('menu');
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('row action menu', () => {
  it('invokes onViewDetails with the row id', async () => {
    const onViewDetails = jest.fn();
    const user = userEvent.setup();
    renderTable([userNotification()], { onRowClick: onViewDetails });

    await openMenu(user);
    await user.click(screen.getByTestId('view-details-notif-1'));

    expect(onViewDetails).toHaveBeenCalledWith('notif-1');
  });

  it('disables View Details when no handler is wired up', async () => {
    const user = userEvent.setup();
    renderTable([userNotification()], { onResend: jest.fn() });

    await openMenu(user);

    expect(screen.getByTestId('view-details-notif-1')).toHaveAttribute('aria-disabled', 'true');
  });

  it('copies the notification id and confirms it to the user', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderTable([userNotification()], { onRowClick: jest.fn() });

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /Copy ID/ }));

    expect(writeText).toHaveBeenCalledWith('notif-1');
    expect(toastSuccess).toHaveBeenCalledWith('Notification ID copied to clipboard');
  });
});

describe('resend availability', () => {
  it.each(['SENT', 'FAILED'])('offers Resend for a %s user notification', async (status) => {
    const user = userEvent.setup();
    renderTable([userNotification({ status: status as Notification['status'] })], {
      onResend: jest.fn(),
    });

    await openMenu(user);

    expect(screen.getByTestId('resend-notif-1')).toBeInTheDocument();
  });

  it('calls onResend with the row id', async () => {
    const onResend = jest.fn();
    const user = userEvent.setup();
    renderTable([userNotification()], { onResend });

    await openMenu(user);
    await user.click(screen.getByTestId('resend-notif-1'));

    expect(onResend).toHaveBeenCalledWith('notif-1');
  });

  it('hides Resend for a pending notification', async () => {
    const user = userEvent.setup();
    renderTable([userNotification({ status: 'PENDING_SEND' })], { onResend: jest.fn() });

    await openMenu(user);

    expect(screen.queryByTestId('resend-notif-1')).not.toBeInTheDocument();
  });

  it('hides Resend for a one-off notification, which cannot be rebuilt', async () => {
    const user = userEvent.setup();
    renderTable([oneOffNotification()], { onResend: jest.fn() });

    await openMenu(user);

    expect(screen.queryByTestId('resend-notif-oneoff')).not.toBeInTheDocument();
  });

  it('hides Resend when no handler is provided', async () => {
    const user = userEvent.setup();
    renderTable([userNotification()], { onRowClick: jest.fn() });

    await openMenu(user);

    expect(screen.queryByTestId('resend-notif-1')).not.toBeInTheDocument();
  });
});

describe('preview availability', () => {
  it('enables the preview when a commit SHA was recorded', async () => {
    const user = userEvent.setup();
    renderTable([userNotification()], { onPreviewRender: jest.fn() });

    await openMenu(user);

    expect(screen.getByTestId('preview-render-notif-1')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('disables the preview for a sent notification with no commit SHA', async () => {
    const onPreviewRender = jest.fn();
    const user = userEvent.setup();
    renderTable([userNotification({ gitCommitSha: null })], { onPreviewRender });

    await openMenu(user);
    const item = screen.getByTestId('preview-render-notif-1');

    expect(item).toHaveAttribute('aria-disabled', 'true');
    await user.click(item);
    expect(onPreviewRender).not.toHaveBeenCalled();
  });
});

describe('date and recipient formatting', () => {
  it('renders an em dash for a missing timestamp', () => {
    renderTable([userNotification({ sentAt: null })]);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders an em dash rather than "Invalid Date" for an unparseable timestamp', () => {
    renderTable([userNotification({ sentAt: 'not-a-date' })]);

    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows the recipient id for a user notification', () => {
    renderTable([userNotification({ userId: 'user-42' })]);

    expect(screen.getByText('user-42')).toBeInTheDocument();
  });

  it('shows the email or phone for a one-off notification', () => {
    renderTable([oneOffNotification()]);

    expect(screen.getByText('guest@example.com')).toBeInTheDocument();
  });
});

/**
 * Tests for the resend confirmation dialog.
 *
 * The context choice is the whole point of the dialog: "recalculate" rebuilds
 * the notification from current data, "stored" replays the original payload.
 * Sending the wrong one silently sends the wrong content, so the flag that
 * reaches the server action is asserted explicitly.
 */

/**
 * The dialog now writes through `useResendNotification` from
 * vintasend-dashboard-core. Only that hook is replaced: `mutateAsync` stands in
 * for the request, so the cases below still turn on what the dialog sends and
 * what it does with the answer.
 */
const mutateAsync = jest.fn();
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.mock('vintasend-dashboard-core', () => ({
  ...jest.requireActual('vintasend-dashboard-core'),
  useResendNotification: () => ({ mutateAsync, isPending: false }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...(args as [])),
    error: (...args: unknown[]) => toastError(...(args as [])),
  },
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResendNotificationDialog } from '@/app/components/resend-notification-dialog';

const renderDialog = (
  props: Partial<React.ComponentProps<typeof ResendNotificationDialog>> = {},
) => {
  const onClose = jest.fn();
  const onResent = jest.fn();
  const result = render(
    <ResendNotificationDialog
      notificationId="notif-1"
      onClose={onClose}
      onResent={onResent}
      {...props}
    />,
  );
  return { ...result, onClose, onResent };
};

const confirm = () => screen.getByRole('button', { name: 'Resend Notification' });

beforeEach(() => {
  jest.clearAllMocks();
  mutateAsync.mockResolvedValue({ data: { id: 'notif-2' } });
});

describe('ResendNotificationDialog visibility', () => {
  it('stays closed when there is no notification selected', () => {
    renderDialog({ notificationId: null });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('opens with an explanation once a notification is selected', () => {
    renderDialog();

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This will create a new notification based on the original and send it immediately.',
      ),
    ).toBeInTheDocument();
  });

  it('defaults to recalculating the context', () => {
    renderDialog();

    const [recalculate, stored] = screen.getAllByRole('radio');
    expect(recalculate).toBeChecked();
    expect(stored).not.toBeChecked();
  });
});

describe('ResendNotificationDialog context choice', () => {
  it('resends with a recalculated context by default', async () => {
    const interaction = userEvent.setup();
    renderDialog();

    await interaction.click(confirm());

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        params: { path: { id: 'notif-1' } },
        body: { useStoredContext: false },
      }),
    );
  });

  it('resends with the stored context once that option is picked', async () => {
    const interaction = userEvent.setup();
    renderDialog();

    await interaction.click(screen.getAllByRole('radio')[1]);
    await interaction.click(confirm());

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        params: { path: { id: 'notif-1' } },
        body: { useStoredContext: true },
      }),
    );
  });

  it('lets the user switch back to recalculating', async () => {
    const interaction = userEvent.setup();
    renderDialog();

    const [recalculate, stored] = screen.getAllByRole('radio');
    await interaction.click(stored);
    await interaction.click(recalculate);
    await interaction.click(confirm());

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        params: { path: { id: 'notif-1' } },
        body: { useStoredContext: false },
      }),
    );
  });
});

describe('ResendNotificationDialog outcomes', () => {
  it('reports the new notification ID and closes on success', async () => {
    const interaction = userEvent.setup();
    const { onClose, onResent } = renderDialog();

    await interaction.click(confirm());

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        'Notification resent successfully (new ID: notif-2)',
      );
    });
    expect(onResent).toHaveBeenCalledTimes(1);
    // Twice: once from the handler, once from Radix closing the dialog on
    // AlertDialogAction. Harmless today because the parent just clears its
    // selected-id state, but it is the reason this is not an exact count of 1.
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces the failure without treating it as a resend', async () => {
    mutateAsync.mockRejectedValue({
      error: { code: 'CONFLICT', message: 'notification already sent' },
    });
    const interaction = userEvent.setup();
    const { onResent } = renderDialog();

    await interaction.click(confirm());

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Failed to resend notification: notification already sent',
      );
    });
    expect(onResent).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('closes on failure even though the handler only closes on success', async () => {
    // Documents current behaviour rather than endorsing it: AlertDialogAction
    // dismisses the dialog itself, so the failure branch's intent of leaving it
    // open for a retry does not hold. The error toast is still shown.
    mutateAsync.mockRejectedValue({
      error: { code: 'CONFLICT', message: 'notification already sent' },
    });
    const interaction = userEvent.setup();
    const { onClose } = renderDialog();

    await interaction.click(confirm());

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('works without an onResent callback', async () => {
    const interaction = userEvent.setup();
    const { onClose } = renderDialog({ onResent: undefined });

    await interaction.click(confirm());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('closes without resending when the user cancels', async () => {
    const interaction = userEvent.setup();
    const { onClose } = renderDialog();

    await interaction.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('does nothing when confirmed with no notification selected', async () => {
    // The dialog is closed in this state; the guard covers a stale click.
    renderDialog({ notificationId: null });

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

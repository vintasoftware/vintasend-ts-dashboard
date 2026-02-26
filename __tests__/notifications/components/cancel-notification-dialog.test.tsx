import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CancelNotificationDialog } from '@/app/notifications/components/cancel-notification-dialog';

describe('CancelNotificationDialog', () => {
  it('does not call onConfirm before user confirmation', () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    render(
      <CancelNotificationDialog
        notificationId="notif-123"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm only after clicking confirm action', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    render(
      <CancelNotificationDialog
        notificationId="notif-123"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    const confirmButton = screen.getByTestId('confirm-cancel-notification');
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('notif-123');
  });
});
'use client';

import { useTransition } from 'react';
import { XCircle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CancelNotificationDialogProps {
  /**
   * The notification ID to cancel. When set, the dialog opens.
   */
  notificationId: string | null;

  /**
   * Callback fired when the dialog should close.
   */
  onClose: () => void;

  /**
   * Callback fired when cancellation is confirmed.
   */
  onConfirm: (id: string) => Promise<void>;
}

/**
 * Confirmation dialog for cancelling a pending notification.
 */
export function CancelNotificationDialog({
  notificationId,
  onClose,
  onConfirm,
}: CancelNotificationDialogProps) {
  const [isPending, startTransition] = useTransition();

  const isOpen = notificationId !== null;

  const handleConfirm = () => {
    if (!notificationId) {
      return;
    }

    startTransition(async () => {
      await onConfirm(notificationId);
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isPending) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Cancel Notification
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel the pending notification and it will no longer be sent. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep Notification</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="confirm-cancel-notification"
          >
            {isPending ? 'Cancelling…' : 'Cancel Notification'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
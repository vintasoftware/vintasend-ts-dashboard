'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
import { Label } from '@/components/ui/label';
import { resendNotification } from '../actions';

interface ResendNotificationDialogProps {
  /**
   * The notification ID to resend. When set, the dialog opens.
   */
  notificationId: string | null;

  /**
   * Callback fired when the dialog should close.
   */
  onClose: () => void;

  /**
   * Callback fired after a successful resend, with the new notification ID.
   */
  onResent?: () => void;
}

/**
 * Confirmation dialog for resending a notification.
 * Asks the user whether to reuse the stored context or recalculate it from the current database state.
 */
export function ResendNotificationDialog({
  notificationId,
  onClose,
  onResent,
}: ResendNotificationDialogProps) {
  const [useStoredContext, setUseStoredContext] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOpen = notificationId !== null;

  const handleResend = () => {
    if (!notificationId) return;

    startTransition(async () => {
      const result = await resendNotification(notificationId, useStoredContext);

      if (result.success) {
        toast.success(`Notification resent successfully (new ID: ${result.notification.id})`);
        onResent?.();
        onClose();
      } else {
        toast.error(`Failed to resend notification: ${result.error}`);
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isPending) {
      setUseStoredContext(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Resend Notification
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new notification based on the original and send it immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Context data</Label>
            <p className="text-sm text-muted-foreground">
              Choose how the notification context should be resolved:
            </p>
            <div className="space-y-2">
              <label
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                data-testid="context-option-recalculate"
              >
                <input
                  type="radio"
                  name="contextChoice"
                  checked={!useStoredContext}
                  onChange={() => setUseStoredContext(false)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Recalculate context</div>
                  <div className="text-xs text-muted-foreground">
                    Generate fresh context from the current database state. Use this if the underlying data has changed since the original notification was sent.
                  </div>
                </div>
              </label>
              <label
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                data-testid="context-option-stored"
              >
                <input
                  type="radio"
                  name="contextChoice"
                  checked={useStoredContext}
                  onChange={() => setUseStoredContext(true)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Use stored context</div>
                  <div className="text-xs text-muted-foreground">
                    Reuse the exact context from the original notification. Use this to send the same content again without any changes.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleResend} disabled={isPending}>
            {isPending ? 'Resending…' : 'Resend Notification'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

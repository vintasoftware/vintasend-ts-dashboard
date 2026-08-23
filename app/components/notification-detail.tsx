'use client';

import { format } from 'date-fns';
import { Copy, FileText } from 'lucide-react';
import { getApiErrorMessage, useNotification } from 'vintasend-dashboard-core';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  NotificationDetail,
  NotificationStatus,
  NotificationType,
} from 'vintasend-dashboard-core';

/** The detail variant addressed to a raw email or phone rather than a user. */
type OneOffNotificationDetail = Extract<NotificationDetail, { kind: 'one-off' }>;

/**
 * The context payloads are `unknown` in the contract — the API stores whatever
 * the notification was rendered with — and the dashboard only ever stringifies
 * them. This is the shape the display code assumes; values arriving as
 * `unknown` are narrowed to it at the call site.
 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Maps notification status to badge variant colors.
 */
const statusVariantMap: Record<
  NotificationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING_SEND: 'default',
  SENT: 'secondary',
  FAILED: 'destructive',
  READ: 'outline',
  CANCELLED: 'secondary',
};

/**
 * Maps notification type to badge variant colors.
 */
const typeVariantMap: Record<
  NotificationType,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  EMAIL: 'default',
  SMS: 'secondary',
  PUSH: 'outline',
  IN_APP: 'default',
};

/**
 * Formats a date string (ISO format) for display.
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return '—';
  }
}

/**
 * Describes the two template-version fields as a single line.
 *
 * They usually hold the same number, or both hold nothing, so two separate rows would be noise.
 * The cases where they differ are the ones worth reading: a notification pinned but not yet sent,
 * one sent before it was repointed at another version, or a pin the renderer could not honour.
 */
function formatTemplateVersion(
  requested: number | null | undefined,
  used: number | null | undefined,
): string {
  // Version 0 is a legal version, so these compare against null rather than testing truthiness.
  const requestedVersion = requested ?? null;
  const usedVersion = used ?? null;

  if (requestedVersion === null && usedVersion === null) return '—';
  if (usedVersion === null) return `v${requestedVersion} requested`;
  if (requestedVersion === null) return `v${usedVersion}`;
  if (requestedVersion === usedVersion) return `v${usedVersion} (pinned)`;
  return `v${usedVersion} sent, v${requestedVersion} requested`;
}

/**
 * Determines if a notification is one-off (has emailOrPhone instead of userId).
 */
function isOneOff(notification: NotificationDetail): notification is OneOffNotificationDetail {
  return notification.kind === 'one-off';
}

/**
 * Renders a single field row in the detail panel.
 */
function DetailField({
  label,
  value,
  className,
  monospace = false,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  monospace?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={`text-sm ${monospace ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

/**
 * Renders a code block for displaying JSON or template content.
 */
function CodeBlock({
  title,
  content,
  testId,
}: {
  title: string;
  content: JsonValue | undefined;
  testId?: string;
}) {
  const displayContent =
    typeof content === 'object' && content !== null
      ? JSON.stringify(content, null, 2)
      : String(content ?? '') || '—';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayContent);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {Boolean(content) && (
          <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 px-2">
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
        )}
      </div>
      <pre
        data-testid={testId}
        className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap break-all"
      >
        {displayContent}
      </pre>
    </div>
  );
}

/**
 * Renders the attachments list.
 */
function AttachmentsList({
  attachments,
}: {
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    description?: string;
  }>;
}) {
  if (!attachments || attachments.length === 0) {
    return <span className="text-sm text-muted-foreground">No attachments</span>;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="flex flex-col gap-2" data-testid="attachments-list">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-2 p-2 bg-muted rounded-md"
          data-testid={`attachment-${attachment.id}`}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{attachment.filename}</div>
            <div className="text-xs text-muted-foreground">
              {attachment.contentType} • {formatBytes(attachment.size)}
            </div>
            {attachment.description && (
              <div className="text-xs text-muted-foreground">{attachment.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface NotificationDetailProps {
  /**
   * ID of the notification to display. When set, the panel opens.
   */
  notificationId: string | null;

  /**
   * Callback fired when the panel should close.
   */
  onClose: () => void;
}

/**
 * Side panel component that displays full notification details.
 * Fetches notification data via server action when opened.
 */
export function NotificationDetail({ notificationId, onClose }: NotificationDetailProps) {
  // The query stays idle while the id is null, so a panel that has never been
  // opened does not fetch, and closing it does not need a manual state reset.
  const { data, isLoading, isError, error, refetch } = useNotification(notificationId);

  const notification = (data?.data ?? null) as NotificationDetail | null;
  const isOpen = notificationId !== null;

  const handleClose = () => {
    onClose();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 p-4" data-testid="notification-detail-loading">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Separator />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="p-4 text-center" data-testid="notification-detail-error">
          <p className="text-destructive mb-4">{getApiErrorMessage(error)}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    if (!notification) {
      return null;
    }

    const isOneOffNotification = isOneOff(notification);

    return (
      <div className="space-y-4 p-4 overflow-y-auto" data-testid="notification-detail-content">
        {/* Header section with badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={typeVariantMap[notification.notificationType]}>
            {notification.notificationType}
          </Badge>
          <Badge variant={statusVariantMap[notification.status]}>{notification.status}</Badge>
          {isOneOffNotification && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              One-off
            </Badge>
          )}
        </div>

        <Separator />

        {/* Basic info grid */}
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="ID" value={notification.id} monospace />
          <DetailField label="Context" value={notification.contextName || '—'} />

          {isOneOff(notification) ? (
            <>
              <DetailField label="Email/Phone" value={notification.emailOrPhone} />
              <DetailField
                label="Name"
                value={
                  [notification.firstName, notification.lastName].filter(Boolean).join(' ') || '—'
                }
              />
            </>
          ) : (
            <DetailField label="User ID" value={notification.userId} monospace />
          )}

          <DetailField label="Tenant" value={notification.tenant || '—'} />
          <DetailField label="Adapter Used" value={notification.adapterUsed || '—'} />
          <DetailField
            label="Git Commit SHA"
            value={
              notification.gitCommitSha ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs break-all">{notification.gitCommitSha}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => navigator.clipboard.writeText(notification.gitCommitSha ?? '')}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              ) : (
                '—'
              )
            }
          />
          <DetailField
            label="Template Version"
            value={formatTemplateVersion(
              notification.requestedTemplateVersion,
              notification.usedTemplateVersion,
            )}
          />
        </div>

        <Separator />

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Created At" value={formatDate(notification.createdAt)} />
          <DetailField label="Updated At" value={formatDate(notification.updatedAt)} />
          <DetailField label="Send After" value={formatDate(notification.sendAfter)} />
          <DetailField label="Sent At" value={formatDate(notification.sentAt)} />
          <DetailField label="Read At" value={formatDate(notification.readAt)} />
        </div>

        <Separator />

        {/* Templates */}
        {notification.subjectTemplate && (
          <CodeBlock
            title="Subject Template"
            content={notification.subjectTemplate}
            testId="subject-template"
          />
        )}

        <CodeBlock
          title="Body Template"
          content={notification.bodyTemplate}
          testId="body-template"
        />

        <Separator />

        {/* Context Data */}
        <CodeBlock
          title="Context Used"
          content={notification.contextUsed as JsonValue}
          testId="context-used"
        />

        <CodeBlock
          title="Context Parameters"
          content={notification.contextParameters as JsonValue}
          testId="context-parameters"
        />

        {Boolean(notification.extraParams) && (
          <CodeBlock
            title="Extra Parameters"
            content={notification.extraParams as JsonValue}
            testId="extra-params"
          />
        )}

        <Separator />

        {/* Attachments */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">Attachments</span>
          <AttachmentsList attachments={notification.attachments} />
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>{notification?.title || 'Notification Details'}</SheetTitle>
          <SheetDescription>
            {notification
              ? `${notification.notificationType} notification • ${notification.status}`
              : 'Loading notification details...'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
}

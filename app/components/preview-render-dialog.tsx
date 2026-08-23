'use client';

import { Copy, FileText } from 'lucide-react';
import {
  getApiErrorCode,
  getApiErrorMessage,
  useNotificationPreview,
} from 'vintasend-dashboard-core';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface PreviewRenderDialogProps {
  notificationId: string | null;
  onClose: () => void;
}

function RenderedHtmlBlock({
  title,
  html,
  testId,
}: {
  title: string;
  html: string;
  testId: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => navigator.clipboard.writeText(html)}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
      </div>
      <div
        data-testid={testId}
        className="bg-background border border-border rounded-md p-3 text-sm overflow-x-auto max-h-72 whitespace-pre-wrap break-all"
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
    </div>
  );
}

export function PreviewRenderDialog({ notificationId, onClose }: PreviewRenderDialogProps) {
  const { data, isLoading, isError, error } = useNotificationPreview(notificationId);

  const previewResult = data?.data ?? null;
  const isOpen = notificationId !== null;

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onClose();
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="py-6 text-sm text-muted-foreground" data-testid="preview-render-loading">
          Loading template preview...
        </div>
      );
    }

    if (isError) {
      // A notification with no recorded commit cannot have its templates
      // resolved. That is an expected state for older rows rather than a
      // failure, so it reads as an explanation instead of an error.
      if (getApiErrorCode(error) === 'PREVIEW_UNAVAILABLE') {
        return (
          <div className="py-2" data-testid="preview-render-missing-sha">
            <p className="text-sm text-muted-foreground">{getApiErrorMessage(error)}</p>
          </div>
        );
      }

      return (
        <div className="py-2" data-testid="preview-render-error">
          <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p>
        </div>
      );
    }

    if (!previewResult) {
      return null;
    }

    return (
      <div className="space-y-4" data-testid="preview-render-success">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Git Commit SHA:</span>
          <span className="font-mono text-xs break-all">{previewResult.gitCommitSha}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => navigator.clipboard.writeText(previewResult.gitCommitSha)}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
        </div>

        {previewResult.subjectTemplatePath && (
          <RenderedHtmlBlock
            title="Rendered Subject (HTML)"
            html={previewResult.renderedSubjectHtml}
            testId="preview-render-subject-html"
          />
        )}

        <RenderedHtmlBlock
          title="Rendered Body (HTML)"
          html={previewResult.renderedBodyHtml}
          testId="preview-render-body-html"
        />
      </div>
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preview render
          </AlertDialogTitle>
          <AlertDialogDescription>
            Displays rendered HTML generated with template files fetched from GitHub at the
            notification&apos;s tracked commit.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1">{renderContent()}</div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

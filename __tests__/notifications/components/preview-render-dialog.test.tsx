import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';

import { PreviewRenderDialog } from '@/app/notifications/components/preview-render-dialog';

const mockFetchNotificationPreview = jest.fn();

jest.mock('@/app/notifications/actions', () => ({
  fetchNotificationPreview: (...args: unknown[]) => mockFetchNotificationPreview(...args),
}));

describe('PreviewRenderDialog — Phase 7', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads preview data by notification ID and renders success state', async () => {
    mockFetchNotificationPreview.mockResolvedValueOnce({
      state: 'success',
      gitCommitSha: 'a'.repeat(40),
      bodyTemplatePath: 'templates/body.pug',
      subjectTemplatePath: 'templates/subject.pug',
      renderedBodyHtml: '<p>Body</p>',
      renderedSubjectHtml: '<strong>Subject</strong>',
    });

    render(<PreviewRenderDialog notificationId="notif-1" onClose={jest.fn()} />);

    await waitFor(() => {
      expect(mockFetchNotificationPreview).toHaveBeenCalledWith('notif-1');
      expect(screen.getByTestId('preview-render-success')).toBeInTheDocument();
      expect(screen.getByTestId('preview-render-body-html')).toHaveTextContent('Body');
      expect(screen.getByTestId('preview-render-subject-html')).toHaveTextContent('Subject');
      expect(screen.getByTestId('preview-render-body-html')).toHaveClass(
        'bg-background',
        'border',
        'border-border',
      );
    });
  });

  it('renders missing_sha state', async () => {
    mockFetchNotificationPreview.mockResolvedValueOnce({
      state: 'missing_sha',
      message: 'SHA missing',
    });

    render(<PreviewRenderDialog notificationId="notif-2" onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-render-missing-sha')).toBeInTheDocument();
      expect(screen.getByText('SHA missing')).toBeInTheDocument();
    });
  });

  it('renders error state', async () => {
    mockFetchNotificationPreview.mockResolvedValueOnce({
      state: 'error',
      message: 'Fetch failed',
    });

    render(<PreviewRenderDialog notificationId="notif-3" onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-render-error')).toBeInTheDocument();
      expect(screen.getByText('Fetch failed')).toBeInTheDocument();
    });
  });

  it('renders loading state while request is pending', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchNotificationPreview.mockReturnValueOnce(pendingPromise);

    render(<PreviewRenderDialog notificationId="notif-4" onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-render-loading')).toBeInTheDocument();
    });

    await act(async () => {
      resolvePromise!({
        state: 'missing_sha',
        message: 'SHA missing',
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('preview-render-loading')).not.toBeInTheDocument();
    });
  });
});

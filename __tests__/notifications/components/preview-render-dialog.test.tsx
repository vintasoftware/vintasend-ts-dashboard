import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PreviewRenderDialog } from '@/app/components/preview-render-dialog';

const mockFetchNotificationPreview = jest.fn();

jest.mock('@/app/actions', () => ({
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

  describe('copying and dismissing', () => {
    const writeText = jest.fn();

    const successPreview = {
      state: 'success',
      gitCommitSha: 'a'.repeat(40),
      bodyTemplatePath: 'templates/body.pug',
      subjectTemplatePath: 'templates/subject.pug',
      renderedBodyHtml: '<p>Body</p>',
      renderedSubjectHtml: '<strong>Subject</strong>',
    };

    beforeEach(() => {
      writeText.mockClear();
    });

    /**
     * userEvent.setup() installs its own clipboard stub, so the spy has to be
     * put in place afterwards to be the one the component actually calls.
     */
    const setupWithClipboard = () => {
      const user = userEvent.setup();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
      return user;
    };

    it('copies the rendered HTML and the commit SHA to the clipboard', async () => {
      const user = setupWithClipboard();
      mockFetchNotificationPreview.mockResolvedValueOnce(successPreview);

      render(<PreviewRenderDialog notificationId="notif-1" onClose={jest.fn()} />);
      await screen.findByTestId('preview-render-success');

      const copyButtons = screen.getAllByRole('button', { name: /Copy/ });
      for (const button of copyButtons) {
        await user.click(button);
      }

      const copied = writeText.mock.calls.map(([value]) => value);
      expect(copied).toContain('a'.repeat(40));
      expect(copied).toContain('<p>Body</p>');
      expect(copied).toContain('<strong>Subject</strong>');
    });

    it('closes when the dialog is dismissed', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      mockFetchNotificationPreview.mockResolvedValueOnce(successPreview);

      render(<PreviewRenderDialog notificationId="notif-1" onClose={onClose} />);
      await screen.findByTestId('preview-render-success');

      await user.keyboard('{Escape}');

      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('does not fetch anything while no notification is selected', () => {
      render(<PreviewRenderDialog notificationId={null} onClose={jest.fn()} />);

      expect(mockFetchNotificationPreview).not.toHaveBeenCalled();
    });
  });

});

/**
 * Tests for the template preview dialog.
 *
 * The three states the dialog distinguishes no longer come from a result object
 * the server action shaped for it — they are read off the API's own error
 * envelope. `PREVIEW_UNAVAILABLE` means the notification simply has no commit
 * recorded, which is an ordinary state for older rows, and must not be
 * presented as a failure. Anything else is.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PreviewRenderDialog } from '@/app/components/preview-render-dialog';

const mockFetchNotificationPreview = jest.fn();

jest.mock('vintasend-dashboard-core', () => {
  const actual = jest.requireActual('vintasend-dashboard-core');
  const react = jest.requireActual('react');

  return {
    ...actual,
    useNotificationPreview: (id: string | null | undefined) => {
      const [state, setState] = react.useState({
        isLoading: Boolean(id),
        isError: false,
        data: undefined as unknown,
        error: null as unknown,
      });

      react.useEffect(() => {
        if (!id) {
          setState({ isLoading: false, isError: false, data: undefined, error: null });
          return;
        }

        setState({ isLoading: true, isError: false, data: undefined, error: null });

        void Promise.resolve(mockFetchNotificationPreview(id)).then(
          (preview: unknown) =>
            setState({ isLoading: false, isError: false, data: { data: preview }, error: null }),
          (error: unknown) =>
            setState({ isLoading: false, isError: true, data: undefined, error }),
        );
      }, [id]);

      return state;
    },
  };
});

const successPreview = {
  gitCommitSha: 'a'.repeat(40),
  bodyTemplatePath: 'templates/body.pug',
  subjectTemplatePath: 'templates/subject.pug',
  renderedBodyHtml: '<p>Body</p>',
  renderedSubjectHtml: '<strong>Subject</strong>',
};

const apiError = (code: string, message: string) => ({ error: { code, message } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PreviewRenderDialog', () => {
  it('loads the preview by notification ID and renders both rendered templates', async () => {
    mockFetchNotificationPreview.mockResolvedValueOnce(successPreview);

    render(<PreviewRenderDialog notificationId="notif-1" onClose={jest.fn()} />);

    await waitFor(() => {
      expect(mockFetchNotificationPreview).toHaveBeenCalledWith('notif-1');
      expect(screen.getByTestId('preview-render-success')).toBeInTheDocument();
    });

    expect(screen.getByTestId('preview-render-body-html')).toHaveTextContent('Body');
    expect(screen.getByTestId('preview-render-subject-html')).toHaveTextContent('Subject');
    expect(screen.getByTestId('preview-render-body-html')).toHaveClass(
      'bg-background',
      'border',
      'border-border',
    );
  });

  it('omits the subject block when the notification has no subject template', async () => {
    mockFetchNotificationPreview.mockResolvedValueOnce({
      ...successPreview,
      subjectTemplatePath: null,
    });

    render(<PreviewRenderDialog notificationId="notif-1" onClose={jest.fn()} />);

    await screen.findByTestId('preview-render-success');
    expect(screen.queryByTestId('preview-render-subject-html')).not.toBeInTheDocument();
  });

  it('explains a missing commit rather than reporting it as an error', async () => {
    mockFetchNotificationPreview.mockRejectedValueOnce(
      apiError('PREVIEW_UNAVAILABLE', 'No commit SHA was recorded for this notification.'),
    );

    render(<PreviewRenderDialog notificationId="notif-2" onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-render-missing-sha')).toBeInTheDocument();
    });
    expect(
      screen.getByText('No commit SHA was recorded for this notification.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('preview-render-error')).not.toBeInTheDocument();
  });

  it('reports any other API failure as an error', async () => {
    mockFetchNotificationPreview.mockRejectedValueOnce(
      apiError('UPSTREAM_ERROR', 'GitHub could not be reached.'),
    );

    render(<PreviewRenderDialog notificationId="notif-3" onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-render-error')).toBeInTheDocument();
    });
    expect(screen.getByText('GitHub could not be reached.')).toBeInTheDocument();
    expect(screen.queryByTestId('preview-render-missing-sha')).not.toBeInTheDocument();
  });

  it('falls back to a readable message when the failure is not from the API', async () => {
    mockFetchNotificationPreview.mockRejectedValueOnce(new Error('Network request failed'));

    render(<PreviewRenderDialog notificationId="notif-4" onClose={jest.fn()} />);

    expect(await screen.findByText('Network request failed')).toBeInTheDocument();
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolvePreview: (value: typeof successPreview) => void = () => {};
    mockFetchNotificationPreview.mockReturnValueOnce(
      new Promise<typeof successPreview>((resolve) => {
        resolvePreview = resolve;
      }),
    );

    render(<PreviewRenderDialog notificationId="notif-5" onClose={jest.fn()} />);

    expect(screen.getByTestId('preview-render-loading')).toBeInTheDocument();

    resolvePreview(successPreview);
    await screen.findByTestId('preview-render-success');
  });

  it('does not fetch anything while no notification is selected', () => {
    render(<PreviewRenderDialog notificationId={null} onClose={jest.fn()} />);

    expect(mockFetchNotificationPreview).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('copying and dismissing', () => {
  const writeText = jest.fn();

  /**
   * userEvent.setup() installs its own clipboard stub, so the spy has to be put
   * in place afterwards to be the one the component actually calls.
   */
  const setupWithClipboard = () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    return user;
  };

  beforeEach(() => {
    writeText.mockClear();
  });

  it('copies the rendered HTML and the commit SHA to the clipboard', async () => {
    const user = setupWithClipboard();
    mockFetchNotificationPreview.mockResolvedValueOnce(successPreview);

    render(<PreviewRenderDialog notificationId="notif-1" onClose={jest.fn()} />);
    await screen.findByTestId('preview-render-success');

    for (const button of screen.getAllByRole('button', { name: /Copy/ })) {
      await user.click(button);
    }

    const copied = writeText.mock.calls.map(([value]) => value);
    expect(copied).toContain('a'.repeat(40));
    expect(copied).toContain('<p>Body</p>');
    expect(copied).toContain('<strong>Subject</strong>');
  });

  it('closes when the dialog is dismissed', async () => {
    const onClose = jest.fn();
    const user = setupWithClipboard();
    mockFetchNotificationPreview.mockResolvedValueOnce(successPreview);

    render(<PreviewRenderDialog notificationId="notif-1" onClose={onClose} />);
    await screen.findByTestId('preview-render-success');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

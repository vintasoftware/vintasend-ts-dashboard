/**
 * Tests for the NotificationDetail component.
 * Tests rendering, loading states, error handling, and detail display.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationDetail } from '@/app/notifications/components/notification-detail';

// Mock the fetchNotificationDetail server action
const mockFetchNotificationDetail = jest.fn();

jest.mock('@/app/notifications/actions', () => ({
  fetchNotificationDetail: (...args: unknown[]) => mockFetchNotificationDetail(...args),
}));

/**
 * Mock notification detail data for testing.
 */
const mockNotificationDetail = {
  id: 'notif-123',
  userId: 'user-456',
  notificationType: 'EMAIL' as const,
  title: 'Welcome Email',
  contextName: 'userWelcome',
  status: 'SENT' as const,
  sendAfter: '2024-01-01T10:00:00Z',
  sentAt: '2024-01-02T10:00:00Z',
  readAt: '2024-01-02T11:00:00Z',
  createdAt: '2024-01-01T09:00:00Z',
  updatedAt: '2024-01-02T11:00:00Z',
  adapterUsed: 'sendgrid',
  bodyTemplate: '<p>Welcome to our service, {{name}}!</p>',
  subjectTemplate: 'Welcome to VintaSend',
  contextUsed: { name: 'John Doe', email: 'john@example.com' },
  contextParameters: { userId: 'user-456' },
  extraParams: { campaign: 'onboarding' },
  attachments: [
    {
      id: 'attach-1',
      fileId: 'file-1',
      filename: 'welcome.pdf',
      contentType: 'application/pdf',
      size: 12345,
      checksum: 'abc123',
      createdAt: '2024-01-01T09:00:00Z',
      description: 'Welcome guide',
    },
  ],
};

/**
 * Mock one-off notification detail data for testing.
 */
const mockOneOffNotificationDetail = {
  id: 'notif-one-off',
  emailOrPhone: 'guest@example.com',
  firstName: 'Jane',
  lastName: 'Guest',
  notificationType: 'SMS' as const,
  title: 'Verification Code',
  contextName: 'verification',
  status: 'PENDING_SEND' as const,
  sendAfter: null,
  sentAt: null,
  readAt: null,
  createdAt: '2024-01-05T09:00:00Z',
  updatedAt: '2024-01-05T09:00:00Z',
  adapterUsed: null,
  bodyTemplate: 'Your verification code is: {{code}}',
  subjectTemplate: null,
  contextUsed: { code: '123456' },
  contextParameters: { phoneNumber: '+1234567890' },
  extraParams: null,
  attachments: [],
};

describe('NotificationDetail — Phase 6', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('6.1: Opening the detail panel', () => {
    it('opens the panel when notificationId is provided', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      // Sheet should be open (check for sheet content)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('does not render panel when notificationId is null', () => {
      render(<NotificationDetail notificationId={null} onClose={jest.fn()} />);

      // Sheet should not be open
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls fetchNotificationDetail with the correct ID', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(mockFetchNotificationDetail).toHaveBeenCalledWith('notif-123');
      });
    });

    it('shows loading state while fetching', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: typeof mockNotificationDetail) => void;
      const pendingPromise = new Promise<typeof mockNotificationDetail>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetchNotificationDetail.mockReturnValueOnce(pendingPromise);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      // Should show loading skeleton
      await waitFor(() => {
        expect(screen.getByTestId('notification-detail-loading')).toBeInTheDocument();
      });

      // Now resolve the promise
      await act(async () => {
        resolvePromise!(mockNotificationDetail);
      });

      // Should no longer show loading
      await waitFor(() => {
        expect(screen.queryByTestId('notification-detail-loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('6.2: Display bodyTemplate and contextUsed', () => {
    it('displays the notification title in the header', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeInTheDocument();
      });
    });

    it('displays the bodyTemplate content', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        const bodyTemplate = screen.getByTestId('body-template');
        expect(bodyTemplate).toBeInTheDocument();
        expect(bodyTemplate).toHaveTextContent('<p>Welcome to our service, {{name}}!</p>');
      });
    });

    it('displays the contextUsed content as JSON', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        const contextUsed = screen.getByTestId('context-used');
        expect(contextUsed).toBeInTheDocument();
        expect(contextUsed).toHaveTextContent('John Doe');
        expect(contextUsed).toHaveTextContent('john@example.com');
      });
    });

    it('displays status and type badges', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('EMAIL')).toBeInTheDocument();
        expect(screen.getByText('SENT')).toBeInTheDocument();
      });
    });

    it('displays extraParams when present', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        const extraParams = screen.getByTestId('extra-params');
        expect(extraParams).toBeInTheDocument();
        expect(extraParams).toHaveTextContent('onboarding');
      });
    });

    it('displays one-off notification with emailOrPhone', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockOneOffNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-one-off" onClose={jest.fn()} />
      );

      await waitFor(() => {
        // Should show one-off badge
        expect(screen.getByText('One-off')).toBeInTheDocument();
        // Should show emailOrPhone
        expect(screen.getByText('guest@example.com')).toBeInTheDocument();
        // Should show name
        expect(screen.getByText('Jane Guest')).toBeInTheDocument();
      });
    });
  });

  describe('6.3: Attachments list', () => {
    it('displays attachments list when present', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        const attachmentsList = screen.getByTestId('attachments-list');
        expect(attachmentsList).toBeInTheDocument();
        expect(screen.getByText('welcome.pdf')).toBeInTheDocument();
      });
    });

    it('displays attachment metadata (type, size, description)', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        const attachmentItem = screen.getByTestId('attachment-attach-1');
        expect(attachmentItem).toBeInTheDocument();
        expect(attachmentItem).toHaveTextContent('application/pdf');
        expect(attachmentItem).toHaveTextContent('Welcome guide');
      });
    });

    it('shows "No attachments" when attachments array is empty', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockOneOffNotificationDetail);

      render(
        <NotificationDetail notificationId="notif-one-off" onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('No attachments')).toBeInTheDocument();
      });
    });
  });

  describe('6.4: Closing the panel', () => {
    it('calls onClose when the close button is clicked', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);
      const onClose = jest.fn();

      render(<NotificationDetail notificationId="notif-123" onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-detail-content')).toBeInTheDocument();
      });

      // Find and click the close button (sr-only "Close" text)
      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('resets state when panel closes and reopens', async () => {
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);

      const { rerender } = render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId('notification-detail-content')).toBeInTheDocument();
      });

      // Close the panel
      rerender(<NotificationDetail notificationId={null} onClose={jest.fn()} />);

      // Panel should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Reopen with a different notification
      mockFetchNotificationDetail.mockResolvedValueOnce(mockOneOffNotificationDetail);
      rerender(<NotificationDetail notificationId="notif-one-off" onClose={jest.fn()} />);

      // Should fetch the new notification
      await waitFor(() => {
        expect(mockFetchNotificationDetail).toHaveBeenLastCalledWith('notif-one-off');
      });
    });
  });

  describe('Error handling', () => {
    it('displays error message when fetch fails', async () => {
      mockFetchNotificationDetail.mockRejectedValueOnce(new Error('Network error'));

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('notification-detail-error')).toBeInTheDocument();
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('provides a retry button on error', async () => {
      mockFetchNotificationDetail.mockRejectedValueOnce(new Error('Network error'));

      render(
        <NotificationDetail notificationId="notif-123" onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry
      mockFetchNotificationDetail.mockResolvedValueOnce(mockNotificationDetail);
      await userEvent.click(screen.getByText('Retry'));

      // Should have called fetchNotificationDetail again
      expect(mockFetchNotificationDetail).toHaveBeenCalledTimes(2);
    });
  });
});

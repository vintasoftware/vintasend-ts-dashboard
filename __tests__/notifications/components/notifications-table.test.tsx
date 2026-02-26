/**
 * Tests for the NotificationsTable component.
 * Tests rendering, pagination, loading states, and integration with TanStack Table.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsTable } from '@/app/notifications/components/notifications-table';
import type { AnyDashboardNotification } from '@/lib/notifications/types';

/**
 * Mock notification data for testing.
 */
const mockNotifications: AnyDashboardNotification[] = [
  {
    id: '1',
    userId: 'user-123',
    notificationType: 'EMAIL',
    title: 'Welcome Email',
    contextName: 'taskAssignment',
    status: 'SENT',
    sendAfter: '2024-01-01T10:00:00Z',
    sentAt: '2024-01-02T10:00:00Z',
    readAt: '2024-01-02T11:00:00Z',
    createdAt: '2024-01-01T09:00:00Z',
    adapterUsed: 'nodemailer',
    gitCommitSha: 'a'.repeat(40),
    bodyTemplate: '<p>Welcome!</p>',
    subjectTemplate: 'Welcome to our service',
  },
  {
    id: '2',
    emailOrPhone: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    notificationType: 'SMS',
    title: 'Verification Code',
    contextName: 'taskAssignment',
    status: 'PENDING_SEND',
    sendAfter: '2024-01-03T10:00:00Z',
    sentAt: null,
    readAt: null,
    createdAt: '2024-01-03T09:00:00Z',
    adapterUsed: 'twilio',
    gitCommitSha: null,
    bodyTemplate: 'Your code is: 123456',
    subjectTemplate: 'Verification Code',
  },
  {
    id: '3',
    userId: 'user-456',
    notificationType: 'PUSH',
    title: null,
    contextName: 'taskAssignment',
    status: 'FAILED',
    sendAfter: null,
    sentAt: null,
    readAt: null,
    createdAt: '2024-01-04T09:00:00Z',
    adapterUsed: null,
    gitCommitSha: null,
    bodyTemplate: 'Alert: Important update',
    subjectTemplate: 'Alert',
  },
];

describe('NotificationsTable — Phase 3', () => {
  describe('3.1: Rendering', () => {
    it('renders rows matching mock data count', () => {
      const { container } = render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
        />
      );

      // Get all table body rows (excluding header)
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(mockNotifications.length);
    });

    it('displays notification IDs in first column', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays notification titles', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
        />
      );

      expect(screen.getByText('Welcome Email')).toBeInTheDocument();
      expect(screen.getByText('Verification Code')).toBeInTheDocument();
    });

    it('shows "—" for missing titles', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
        />
      );

      // The third notification has null title, should display "—"
      const rows = screen.getAllByText('—');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('shows empty state when no data', () => {
      render(
        <NotificationsTable
          data={[]}
          hasMore={false}
          currentPage={1}
          pageSize={10}
        />
      );

      expect(screen.getByText('No notifications found.')).toBeInTheDocument();
    });
  });

  describe('3.2: Status Badges', () => {
    it('displays status badges with correct text', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
        />
      );

      expect(screen.getByText('SENT')).toBeInTheDocument();
      expect(screen.getByText('PENDING_SEND')).toBeInTheDocument();
      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });

    it('displays notification type badges', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
        />
      );

      expect(screen.getByText('EMAIL')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('PUSH')).toBeInTheDocument();
    });
  });

  describe('3.3: Pagination', () => {
    it('renders pagination controls when hasMore is true', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={true}
          currentPage={1}
          pageSize={10}
          onPaginationChange={jest.fn()}
        />
      );

      // Look for page indicator
      expect(screen.getByText(/Page 1/)).toBeInTheDocument();
    });

    it('does not render pagination when on first page with no more data', () => {
      const { container } = render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
        />
      );

      // Only one page, so pagination controls should not be rendered
      const paginationSection = container.querySelector('.flex.items-center.justify-between');
      expect(paginationSection).not.toBeInTheDocument();
    });

    it('calls onPaginationChange with page + 1 when clicking Next', async () => {
      const user = userEvent.setup();
      const handlePaginationChange = jest.fn();

      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={true}
          currentPage={1}
          pageSize={10}
          onPaginationChange={handlePaginationChange}
        />
      );

      // Find and click the Next button
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((btn) => btn.title === 'Next page');

      await user.click(nextButton!);

      expect(handlePaginationChange).toHaveBeenCalledWith(2);
    });

    it('calls onPaginationChange with page - 1 when clicking Previous', async () => {
      const user = userEvent.setup();
      const handlePaginationChange = jest.fn();

      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={true}
          currentPage={3}
          pageSize={10}
          onPaginationChange={handlePaginationChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      const prevButton = buttons.find((btn) => btn.title === 'Previous page');

      await user.click(prevButton!);

      expect(handlePaginationChange).toHaveBeenCalledWith(2);
    });

    it('disables Next button when hasMore is false', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={3}
          pageSize={10}
          onPaginationChange={jest.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((btn) => btn.title === 'Next page');

      expect(nextButton).toBeDisabled();
    });

    it('disables Previous button on first page', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={true}
          currentPage={1}
          pageSize={10}
          onPaginationChange={jest.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      const prevButton = buttons.find((btn) => btn.title === 'Previous page');

      expect(prevButton).toBeDisabled();
    });
  });

  describe('3.5: Loading State', () => {
    it('shows skeleton rows when isLoading={true}', () => {
      const { container } = render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
          isLoading={true}
        />
      );

      // Check for skeleton elements (div with h-4 w-full classes)
      const skeletons = container.querySelectorAll('.h-4.w-full');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('disables pagination buttons while loading', () => {
      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={true}
          currentPage={2}
          pageSize={10}
          isLoading={true}
          onPaginationChange={jest.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      // All pagination buttons should be disabled
      buttons.forEach((btn) => {
        if (btn.title && btn.title.includes('page')) {
          expect(btn).toBeDisabled();
        }
      });
    });

    it('shows normal rows when isLoading={false}', () => {
      const { container } = render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
          isLoading={false}
        />
      );

      // Should display notification text, not skeletons
      expect(screen.getByText('Welcome Email')).toBeInTheDocument();
      // Skeletons should not be present
      const skeletons = container.querySelectorAll('.h-4.w-full');
      expect(skeletons).toHaveLength(0);
    });
  });

  describe('Phase 7: Preview render action', () => {
    it('calls onPreviewRender when clicking Preview render in the actions menu', async () => {
      const user = userEvent.setup();
      const handlePreviewRender = jest.fn();

      render(
        <NotificationsTable
          data={mockNotifications}
          hasMore={false}
          currentPage={1}
          pageSize={10}
          onPreviewRender={handlePreviewRender}
        />,
      );

      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(actionButtons[0]);

      const previewRenderItem = await screen.findByTestId('preview-render-1');
      await user.click(previewRenderItem);

      expect(handlePreviewRender).toHaveBeenCalledWith('1');
    });
  });
});

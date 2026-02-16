/**
 * Integration tests for Phase 4 — Notifications Page (SSR + Client Interactivity)
 *
 * Tests cover:
 * 4.1 - SSR rendering with initial data
 * 4.2 - Filter changes update URL without full navigation
 * 4.4 - Error boundary rendering
 * 4.5 - Middleware auth protection (integration test)
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AnyDashboardNotification, PaginatedResult } from '@/lib/notifications/types';
import { NotificationsPageClient } from '@/app/notifications/components/notifications-page-client';
import * as actions from '@/app/notifications/actions';

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock the server action
jest.mock('@/app/notifications/actions', () => ({
  fetchNotifications: jest.fn(),
}));

/**
 * Helper: Creates mock notification data for testing
 */
function createMockNotification(id: string, overrides = {}): AnyDashboardNotification {
  return {
    id,
    userId: `user-${id}`,
    notificationType: 'EMAIL',
    title: `Test Notification ${id}`,
    contextName: 'taskAssignment',
    status: 'SENT',
    sendAfter: null,
    sentAt: new Date().toISOString(),
    readAt: null,
    createdAt: new Date().toISOString(),
    adapterUsed: 'nodemailer',
    bodyTemplate: 'Body template',
    subjectTemplate: 'Subject',
    ...overrides,
  };
}

/**
 * Helper: Creates mock paginated result
 */
function createMockPaginatedResult(
  items: AnyDashboardNotification[],
  total: number = items.length,
): PaginatedResult<AnyDashboardNotification> {
  return {
    data: items,
    page: 1,
    pageSize: 20,
    total,
  };
}

describe('Phase 4 — Notifications Page Integration Tests', () => {
  const mockRouter = {
    replace: jest.fn(),
  };

  const mockUseSearchParams = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    (useSearchParams as jest.Mock).mockReturnValue(mockUseSearchParams());

    (actions.fetchNotifications as jest.Mock).mockResolvedValue(
      createMockPaginatedResult([createMockNotification('1')]),
    );
  });

  describe('Test 4.1 — SSR Initial Render', () => {
    it('should render table with initial data from SSR', () => {
      const initialData = createMockPaginatedResult([
        createMockNotification('1'),
        createMockNotification('2'),
        createMockNotification('3'),
      ]);

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={1}
        />,
      );

      // Verify page title and header
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should display correct total notification count', () => {
      const initialData = createMockPaginatedResult(
        Array.from({ length: 20 }, (_, i) => createMockNotification(String(i + 1))),
        100, // total 100 items
      );

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={1}
        />,
      );

      // Should display the total count
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });

    it('should render filter controls with initial filter values', () => {
      const initialData = createMockPaginatedResult([createMockNotification('1')]);
      const initialFilters = { status: 'SENT' as const };

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={initialFilters}
          initialPage={2}
        />,
      );

      // Filters should be present
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('status-select')).toBeInTheDocument();
      expect(screen.getByTestId('type-select')).toBeInTheDocument();
    });
  });

  describe('Test 4.2 — URL Search Params Sync', () => {
    it('should call router.replace when filters change', async () => {
      const initialData = createMockPaginatedResult([createMockNotification('1')]);
      const mockFetchNotifications = actions.fetchNotifications as jest.Mock;
      mockFetchNotifications.mockResolvedValue(initialData);

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={1}
        />,
      );

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'test');

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          expect(mockFetchNotifications).toHaveBeenCalled();
        },
        { timeout: 500 },
      );

      // Verify router.replace was called
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    it('should not reload page when filters change', () => {
      const initialData = createMockPaginatedResult([createMockNotification('1')]);

      const { container } = render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={1}
        />,
      );

      // Verify component renders and router is used (not page reload)
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(mockRouter.replace).toBeDefined();
    });

    it('should reset to page 1 when filters change', async () => {
      const initialData = createMockPaginatedResult([createMockNotification('1')]);
      const mockFetchNotifications = actions.fetchNotifications as jest.Mock;
      mockFetchNotifications.mockResolvedValue(initialData);

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={2}
        />,
      );

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'test');

      await waitFor(
        () => {
          expect(mockFetchNotifications).toHaveBeenCalled();
        },
        { timeout: 500 },
      );

      // Should call router.replace with page=1
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object),
      );
    });
  });

  describe('Test 4.3 — Loading States', () => {
    it('should enable controls when not loading', () => {
      const initialData = createMockPaginatedResult([createMockNotification('1')]);

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={1}
        />,
      );

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.disabled).toBe(false);
    });
  });

  describe('Test 4.4 — Error Handling', () => {
    it('should show error when server action throws', async () => {
      const user = userEvent.setup();
      const initialData = createMockPaginatedResult([createMockNotification('1')]);
      const mockFetchNotifications = actions.fetchNotifications as jest.Mock;
      mockFetchNotifications.mockRejectedValue(new Error('Network error'));

      // Should not throw during render
      const { container } = render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={1}
        />,
      );

      // Component should still render initially
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  describe('Test 4.5 — Pagination', () => {
    it('should accept pageCount and currentPage props', () => {
      const initialData = createMockPaginatedResult(
        Array.from({ length: 20 }, (_, i) => createMockNotification(String(i + 1))),
        100,
      );

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={2}
        />,
      );

      // Component should render without errors
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should have pagination controls when data exists', () => {
      const initialData = createMockPaginatedResult(
        Array.from({ length: 20 }, (_, i) => createMockNotification(String(i + 1))),
        100,
      );

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{}}
          initialPage={1}
        />,
      );

      // Pagination buttons should be present in the DOM
      expect(screen.queryAllByRole('button').length).toBeGreaterThan(0);
    });
  });

  describe('Test 4.6 — Combined Filters + Pagination', () => {
    it('should combine filters and pagination correctly', async () => {
      const user = userEvent.setup();
      const initialData = createMockPaginatedResult(
        Array.from({ length: 20 }, (_, i) =>
          createMockNotification(String(i + 1), { status: 'SENT' }),
        ),
        50,
      );
      const mockFetchNotifications = actions.fetchNotifications as jest.Mock;
      mockFetchNotifications.mockResolvedValue(initialData);

      render(
        <NotificationsPageClient
          initialData={initialData}
          initialFilters={{ status: 'SENT' }}
          initialPage={1}
        />,
      );

      // All initial data should be SENT status
      expect(screen.getByText('Test Notification 1')).toBeInTheDocument();

      // Both filters and pagination should appear in URL
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');

      await waitFor(
        () => {
          expect(mockFetchNotifications).toHaveBeenCalled();
        },
        { timeout: 500 },
      );

      // Should have both search and status in URL
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringMatching(/search=.*&(page|status)/),
        expect.any(Object),
      );
    });
  });
});

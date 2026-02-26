/**
 * Tests for notification server actions.
 * Ensures the server actions return correctly shaped data and handle filters.
 */

// Mock the get-vintasend-service module to avoid ES module import issues with dependencies
jest.mock('@/lib/notifications/get-vintasend-service', () => ({
  getVintaSendService: jest.fn().mockResolvedValue({
    getNotifications: jest.fn().mockResolvedValue([]),
    filterNotifications: jest.fn().mockResolvedValue([]),
    getPendingNotifications: jest.fn().mockResolvedValue([]),
    getFutureNotifications: jest.fn().mockResolvedValue([]),
    getOneOffNotifications: jest.fn().mockResolvedValue([]),
    getNotification: jest.fn().mockResolvedValue(null),
    getOneOffNotification: jest.fn().mockResolvedValue(null),
    renderEmailTemplateFromContent: jest.fn(),
  }),
  validateBackendConfig: jest.fn().mockResolvedValue([]),
}));

const mockGitHubGetTemplateContentByCommit = jest.fn();

jest.mock('@/lib/notifications/github-template-client', () => ({
  createGitHubTemplateClientFromEnv: jest.fn(() => ({
    getTemplateContentByCommit: mockGitHubGetTemplateContentByCommit,
  })),
}));

import {
  fetchNotifications,
  fetchNotificationDetail,
  fetchPendingNotifications,
  fetchFutureNotifications,
  fetchOneOffNotifications,
  fetchNotificationPreview,
} from '@/app/notifications/actions';
import type {
  AnyDashboardNotification,
} from '@/lib/notifications/types';

// Import the mocked functions
const { getVintaSendService } = jest.requireMock('@/lib/notifications/get-vintasend-service');

// Create mock notification data for testing
const createMockNotification = (overrides = {}) => ({
  id: 'notif-1',
  userId: 'user-1',
  notificationType: 'EMAIL' as const,
  title: 'Test Notification',
  contextName: 'testContext',
  status: 'SENT' as const,
  sendAfter: null,
  sentAt: new Date('2024-01-15T10:00:00Z'),
  readAt: null,
  createdAt: new Date('2024-01-15T09:00:00Z'),
  adapterUsed: 'sendgrid',
  bodyTemplate: 'Test body',
  subjectTemplate: 'Test subject',
  contextUsed: { key: 'value' },
  contextParameters: { param: 'test' },
  extraParams: null,
  attachments: [],
  ...overrides,
});

describe('Notification Server Actions — Phase 2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGitHubGetTemplateContentByCommit.mockReset();
    const mockFilteredNotifications = [
      createMockNotification({ id: 'notif-1', status: 'SENT' }),
      createMockNotification({ id: 'notif-2', status: 'PENDING_SEND', notificationType: 'SMS' }),
      createMockNotification({ id: 'notif-3', status: 'SENT', notificationType: 'EMAIL' }),
    ];

    // Setup default mock responses
    const mockService = {
      getNotifications: jest.fn().mockResolvedValue(mockFilteredNotifications),
      filterNotifications: jest.fn().mockImplementation((filter) => {
        if (filter?.status === 'PENDING_SEND') {
          return Promise.resolve(
            // @ts-expect-error: TypeScript may complain about the shape of the filter object, but we're just simulating behavior here
            mockFilteredNotifications.filter((notification) => notification.status === 'PENDING_SEND'),
          );
        }

        return Promise.resolve(mockFilteredNotifications);
      }),
      getPendingNotifications: jest.fn().mockResolvedValue([
        createMockNotification({ id: 'notif-2', status: 'PENDING_SEND' }),
      ]),
      getFutureNotifications: jest.fn().mockResolvedValue([
        createMockNotification({ id: 'notif-4', sendAfter: new Date('2030-01-01T00:00:00Z') }),
      ]),
      getOneOffNotifications: jest.fn().mockResolvedValue([
        {
          ...createMockNotification({ id: 'oneoff-1' }),
          emailOrPhone: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      ]),
      getNotification: jest.fn().mockResolvedValue(createMockNotification()),
      getOneOffNotification: jest.fn().mockResolvedValue(null),
      renderEmailTemplateFromContent: jest.fn().mockResolvedValue({
        subject: '<strong>Subject</strong>',
        body: '<p>Body template</p>',
      }),
    };
    (getVintaSendService as jest.Mock).mockResolvedValue(mockService);
  });

  describe('fetchNotifications', () => {
    it('2.3: fetchNotifications returns PaginatedResult shape (mock)', async () => {
      const result = await fetchNotifications({}, 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('hasMore');

      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.page).toBe('number');
      expect(typeof result.pageSize).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('returns items with correct shape', async () => {
      const result = await fetchNotifications({}, 1, 10);
      const item = result.data[0];

      if (item) {
        // Should have either userId or emailOrPhone depending on type
        const hasUserId = 'userId' in item;
        const hasEmailOrPhone = 'emailOrPhone' in item;
        expect(hasUserId || hasEmailOrPhone).toBe(true);

        // Common fields
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('notificationType');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('contextName');
        expect(item).toHaveProperty('createdAt');
      }
    });

    it('respects pageSize parameter', async () => {
      const result = await fetchNotifications({}, 1, 5);
      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.pageSize).toBe(5);
    });

    it('respects page parameter', async () => {
      const page1 = await fetchNotifications({}, 1, 10);
      const page2 = await fetchNotifications({}, 2, 10);

      // Pages should have different data (unless we're on the last page)
      if (page1.hasMore) {
        expect(page1.data[0]?.id).not.toBe(page2.data[0]?.id);
      }
    });

    it('filters by status delegates to getPendingNotifications for PENDING_SEND', async () => {
      const result = await fetchNotifications({ status: 'PENDING_SEND' }, 1, 100);
      result.data.forEach((item: AnyDashboardNotification) => {
        expect(item.status).toBe('PENDING_SEND');
      });
    });

    it('passes filters through to backend without client-side filtering', async () => {
      const result = await fetchNotifications({ notificationType: 'EMAIL' }, 1, 100);
      // Without client-side filtering, all backend results are returned as-is
      expect(result.data.length).toBe(3);
    });

    it('passes combined filters to backend without client-side filtering', async () => {
      const result = await fetchNotifications(
        { status: 'SENT', notificationType: 'EMAIL' },
        1,
        100,
      );
      // Backend returns all results; no client-side filtering
      expect(result.data.length).toBe(3);
    });

    it('returns correct pagination info', async () => {
      const result = await fetchNotifications({}, 1, 10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(typeof result.hasMore).toBe('boolean');
    });
  });

  describe('fetchNotificationDetail', () => {
    it('returns detail with contextUsed and extraParams', async () => {
      const detail = await fetchNotificationDetail('test-id');

      expect(detail).toHaveProperty('id');
      expect(detail).toHaveProperty('status');
      expect(detail).toHaveProperty('contextUsed');
      expect(detail).toHaveProperty('extraParams');

      // contextUsed should be object or null
      expect(
        detail.contextUsed === null || typeof detail.contextUsed === 'object',
      ).toBe(true);
      expect(typeof detail.extraParams).toBe('object');
    });

    it('includes full bodyTemplate for detail view', async () => {
      const detail = await fetchNotificationDetail('test-id');
      expect(detail).toHaveProperty('bodyTemplate');
      expect(typeof detail.bodyTemplate).toBe('string');
      expect(detail.bodyTemplate.length).toBeGreaterThan(0);
    });
  });

  describe('fetchPendingNotifications', () => {
    it('returns only pending notifications', async () => {
      const result = await fetchPendingNotifications(1, 100);
      result.data.forEach((item: AnyDashboardNotification) => {
        expect(item.status).toBe('PENDING_SEND');
      });
    });
  });

  describe('fetchFutureNotifications', () => {
    it('returns only future notifications (sendAfter > now)', async () => {
      const result = await fetchFutureNotifications(1, 100);
      const now = new Date();

      result.data.forEach((item: AnyDashboardNotification) => {
        if (item.sendAfter) {
          const sendAfterDate = new Date(item.sendAfter);
          expect(sendAfterDate > now).toBe(true);
        }
      });
    });
  });

  describe('fetchOneOffNotifications', () => {
    it('returns only one-off notifications', async () => {
      const result = await fetchOneOffNotifications(1, 100);
      result.data.forEach((item: AnyDashboardNotification) => {
        expect(item.id.startsWith('oneoff-')).toBe(true);
        expect('emailOrPhone' in item).toBe(true);
      });
    });
  });

  describe('PaginatedResult type', () => {
    it('data elements have all required fields for list display', async () => {
      const result = await fetchNotifications({}, 1, 10);

      result.data.forEach((notification: AnyDashboardNotification) => {
        // All notifications should have these
        expect(notification.id).toBeDefined();
        expect(notification.notificationType).toBeDefined();
        expect(notification.status).toBeDefined();
        expect(notification.title).toBeDefined();
        expect(notification.contextName).toBeDefined();
        expect(notification.createdAt).toBeDefined();

        // Dates should be ISO strings
        if (notification.sentAt) {
          expect(typeof notification.sentAt).toBe('string');
          expect(notification.sentAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        }
        if (notification.readAt) {
          expect(typeof notification.readAt).toBe('string');
          expect(notification.readAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        }
      });
    });
  });

  describe('fetchNotificationPreview', () => {
    it('returns success payload with template content when notification has gitCommitSha', async () => {
      const mockService = {
        getNotification: jest.fn().mockResolvedValue(
          createMockNotification({
            id: 'notif-preview',
            gitCommitSha: 'a'.repeat(40),
            bodyTemplate: 'templates/body.pug',
            subjectTemplate: 'templates/subject.pug',
            contextUsed: { patientName: 'John' },
          }),
        ),
        getOneOffNotification: jest.fn().mockResolvedValue(null),
        renderEmailTemplateFromContent: jest.fn().mockResolvedValue({
          subject: '<strong>Rendered Subject</strong>',
          body: '<p>Rendered Body</p>',
        }),
      };
      (getVintaSendService as jest.Mock).mockResolvedValue(mockService);

      mockGitHubGetTemplateContentByCommit
        .mockResolvedValueOnce('<p>Body template</p>')
        .mockResolvedValueOnce('Subject template');

      const result = await fetchNotificationPreview('notif-preview');

      expect(result.state).toBe('success');
      if (result.state === 'success') {
        expect(result.gitCommitSha).toBe('a'.repeat(40));
        expect(result.renderedBodyHtml).toBe('<p>Rendered Body</p>');
        expect(result.renderedSubjectHtml).toBe('<strong>Rendered Subject</strong>');
      }
      expect(mockGitHubGetTemplateContentByCommit).toHaveBeenCalledTimes(2);
      expect(mockService.renderEmailTemplateFromContent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'notif-preview' }),
        {
          body: '<p>Body template</p>',
          subject: 'Subject template',
        },
        {
          context: { patientName: 'John' },
        },
      );
    });

    it('returns missing_sha when notification has no gitCommitSha', async () => {
      const mockService = {
        getNotification: jest.fn().mockResolvedValue(
          createMockNotification({
            id: 'notif-no-sha',
            gitCommitSha: null,
          }),
        ),
        getOneOffNotification: jest.fn().mockResolvedValue(null),
        renderEmailTemplateFromContent: jest.fn(),
      };
      (getVintaSendService as jest.Mock).mockResolvedValue(mockService);

      const result = await fetchNotificationPreview('notif-no-sha');

      expect(result.state).toBe('missing_sha');
      expect(mockGitHubGetTemplateContentByCommit).not.toHaveBeenCalled();
    });

    it('returns error state when GitHub fetch fails', async () => {
      const mockService = {
        getNotification: jest.fn().mockResolvedValue(
          createMockNotification({
            id: 'notif-github-error',
            gitCommitSha: 'b'.repeat(40),
            bodyTemplate: 'templates/body.pug',
          }),
        ),
        getOneOffNotification: jest.fn().mockResolvedValue(null),
      };
      (getVintaSendService as jest.Mock).mockResolvedValue(mockService);

      mockGitHubGetTemplateContentByCommit.mockRejectedValue(
        new Error('GitHub API rate limit exceeded while fetching template preview.'),
      );

      const result = await fetchNotificationPreview('notif-github-error');

      expect(result).toEqual({
        state: 'error',
        message: 'GitHub API rate limit exceeded while fetching template preview.',
      });
    });
  });
});

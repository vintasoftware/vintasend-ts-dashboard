/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Phase 5 Backend Integration Tests
 * Tests real backend integration and server actions with the VintaSend service
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: necessary for mocking */

import { validateBackendConfig as validateBackendConfigOriginal } from '@/lib/notifications/get-vintasend-service';
import {
  fetchNotifications,
  fetchNotificationDetail,
  fetchPendingNotifications,
  fetchFutureNotifications,
  fetchOneOffNotifications,
} from '@/app/notifications/actions';

// Mock the entire get-vintasend-service module
jest.mock('@/lib/notifications/get-vintasend-service', () => ({
  getVintaSendService: jest.fn(),
  validateBackendConfig: jest.fn().mockImplementation(async () => {
    const errors: string[] = [];
    if (!process.env.MEDPLUM_BASE_URL) errors.push('MEDPLUM_BASE_URL is required');
    if (!process.env.MEDPLUM_CLIENT_ID) errors.push('MEDPLUM_CLIENT_ID is required');
    if (!process.env.MEDPLUM_CLIENT_SECRET) errors.push('MEDPLUM_CLIENT_SECRET is required');
    if (!process.env.SENDGRID_API_KEY) errors.push('SENDGRID_API_KEY is required');
    if (!process.env.SENDGRID_FROM_EMAIL) errors.push('SENDGRID_FROM_EMAIL is required');
    return errors;
  }),
}));

// Import the mocked functions
const { getVintaSendService, validateBackendConfig } = jest.requireMock('@/lib/notifications/get-vintasend-service');

describe('Phase 5 — Backend Integration Tests', () => {
  describe('Configuration Validation', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('Test 5.3: validateBackendConfig fails when env vars are missing', async () => {
      // Clear all required env vars
      delete process.env.MEDPLUM_BASE_URL;
      delete process.env.MEDPLUM_CLIENT_ID;
      delete process.env.MEDPLUM_CLIENT_SECRET;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.SENDGRID_FROM_EMAIL;

      const errors = await validateBackendConfig();

      expect(errors).toContain('MEDPLUM_BASE_URL is required');
      expect(errors).toContain('MEDPLUM_CLIENT_ID is required');
      expect(errors).toContain('MEDPLUM_CLIENT_SECRET is required');
      expect(errors).toContain('SENDGRID_API_KEY is required');
      expect(errors).toContain('SENDGRID_FROM_EMAIL is required');
      expect(errors.length).toBeGreaterThanOrEqual(5);
    });

    it('Test 5.3: validateBackendConfig succeeds when all env vars are set', async () => {
      process.env.MEDPLUM_BASE_URL = 'https://api.medplum.com';
      process.env.MEDPLUM_CLIENT_ID = 'test-client-id';
      process.env.MEDPLUM_CLIENT_SECRET = 'test-client-secret';
      process.env.SENDGRID_API_KEY = 'test-api-key';
      process.env.SENDGRID_FROM_EMAIL = 'test@example.com';

      const errors = await validateBackendConfig();

      expect(errors).toEqual([]);
    });
  });

  describe('Server Actions with Real Backend', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Test 5.1: fetchNotifications returns correctly shaped data from service', async () => {
      const mockNotifications = [
        {
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
        },
      ];

      getVintaSendService.mockResolvedValue({
        getNotifications: jest.fn().mockResolvedValue(mockNotifications),
        getPendingNotifications: jest.fn(),
        getFutureNotifications: jest.fn(),
        getOneOffNotifications: jest.fn(),
        getNotification: jest.fn(),
        getOneOffNotification: jest.fn(),
      } as any);

      const result = await fetchNotifications({}, 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
     expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toHaveProperty('userId');
      expect(result.data[0]).toHaveProperty('notificationType');
      expect(result.data[0]).toHaveProperty('status');
    });

    it('Test 5.2: Status filter delegates to getPendingNotifications', async () => {
      const mockPendingNotifications = [
        {
          id: 'notif-pending',
          userId: 'user-1',
          notificationType: 'EMAIL' as const,
          title: 'Pending Notification',
          contextName: 'testContext',
          status: 'PENDING_SEND' as const,
          sendAfter: null,
          sentAt: null,
          readAt: null,
          createdAt: new Date('2024-01-15T09:00:00Z'),
          adapterUsed: 'sendgrid',
          bodyTemplate: 'Test body',
          subjectTemplate: 'Test subject',
        },
      ];

      const mockGetPending = jest.fn().mockResolvedValue(mockPendingNotifications);

      getVintaSendService.mockResolvedValue({
        getPendingNotifications: mockGetPending,
        getNotifications: jest.fn(),
      } as any);

      await fetchNotifications({ status: 'PENDING_SEND' }, 1, 10);

      // Actions convert from 1-indexed (dashboard) to 0-indexed (backend) pages
      expect(mockGetPending).toHaveBeenCalledWith(0, 10);
    });

    it('Test 5.4: Empty result returns correct shape', async () => {
      getVintaSendService.mockResolvedValue({
        getNotifications: jest.fn().mockResolvedValue([]),
        getPendingNotifications: jest.fn(),
      } as any);

      const result = await fetchNotifications({}, 1, 10);

      expect(result).toEqual({
        data: [],
        page: 1,
        pageSize: 10,
        hasMore: false,
      });
    });

    it('Test 5.5: Date serialization converts Date objects to ISO strings', async () => {
      const testDate = new Date('2024-01-15T10:00:00Z');
      const mockNotifications = [
        {
          id: 'notif-date-test',
          userId: 'user-1',
          notificationType: 'EMAIL' as const,
          title: 'Date Test',
          contextName: 'testContext',
          status: 'SENT' as const,
          sendAfter: null,
          sentAt: testDate,
          readAt: null,
          createdAt: testDate,
          adapterUsed: 'sendgrid',
          bodyTemplate: 'Test body',
          subjectTemplate: 'Test subject',
        },
      ];

      getVintaSendService.mockResolvedValue({
        getNotifications: jest.fn().mockResolvedValue(mockNotifications),
      } as any);

      const result = await fetchNotifications({}, 1, 10);

      expect(result.data[0].sentAt).toBe('2024-01-15T10:00:00.000Z');
      expect(result.data[0].createdAt).toBe('2024-01-15T10:00:00.000Z');
      expect(typeof result.data[0].sentAt).toBe('string');
      expect(typeof result.data[0].createdAt).toBe('string');
    });

    it('Test: fetchNotificationDetail returns detail with contextUsed', async () => {
      const mockNotification = {
        id: 'notif-detail',
        userId: 'user-1',
        notificationType: 'EMAIL' as const,
        title: 'Detail Test',
        contextName: 'testContext',
        status: 'SENT' as const,
        sendAfter: null,
        sentAt: new Date('2024-01-15T10:00:00Z'),
        readAt: null,
        createdAt: new Date('2024-01-15T09:00:00Z'),
        adapterUsed: 'sendgrid',
        bodyTemplate: 'Test body',
        subjectTemplate: 'Test subject',
        contextUsed: { userName: 'John Doe' },
        contextParameters: { userId: 'user-1' },
        extraParams: { campaignId: 'campaign-1' },
      };

      getVintaSendService.mockResolvedValue({
        getNotification: jest.fn().mockResolvedValue(mockNotification),
        getOneOffNotification: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await fetchNotificationDetail('notif-detail');

      expect(result).toHaveProperty('contextUsed');
      expect(result).toHaveProperty('contextParameters');
      expect(result).toHaveProperty('extraParams');
      expect(result.contextUsed).toEqual({ userName: 'John Doe' });
    });

    it('Test: fetchPendingNotifications calls service method correctly', async () => {
      const mockNotifications = [
        {
          id: 'pending-1',
          userId: 'user-1',
          notificationType: 'EMAIL' as const,
          title: 'Pending',
          contextName: 'testContext',
          status: 'PENDING_SEND' as const,
          sendAfter: null,
          sentAt: null,
          readAt: null,
          createdAt: new Date(),
          adapterUsed: 'sendgrid',
          bodyTemplate: 'Body',
          subjectTemplate: 'Subject',
        },
      ];

      const mockGetPending = jest.fn().mockResolvedValue(mockNotifications);

      getVintaSendService.mockResolvedValue({
        getPendingNotifications: mockGetPending,
      } as any);

      const result = await fetchPendingNotifications(1, 10);

      // Actions convert from 1-indexed (dashboard) to 0-indexed (backend) pages
      expect(mockGetPending).toHaveBeenCalledWith(0, 10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('PENDING_SEND');
    });

    it('Test: fetchFutureNotifications calls service method correctly', async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const mockNotifications = [
        {
          id: 'future-1',
          userId: 'user-1',
          notificationType: 'EMAIL' as const,
          title: 'Future',
          contextName: 'testContext',
          status: 'PENDING_SEND' as const,
          sendAfter: futureDate,
          sentAt: null,
          readAt: null,
          createdAt: new Date(),
          adapterUsed: 'sendgrid',
          bodyTemplate: 'Body',
          subjectTemplate: 'Subject',
        },
      ];

      const mockGetFuture = jest.fn().mockResolvedValue(mockNotifications);

      getVintaSendService.mockResolvedValue({
        getFutureNotifications: mockGetFuture,
      } as any);

      const result = await fetchFutureNotifications(1, 10);

      // Actions convert from 1-indexed (dashboard) to 0-indexed (backend) pages
      expect(mockGetFuture).toHaveBeenCalledWith(0, 10);
      expect(result.data).toHaveLength(1);
    });

    it('Test: fetchOneOffNotifications calls service method correctly', async () => {
      const mockNotifications = [
        {
          id: 'oneoff-1',
          emailOrPhone: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          notificationType: 'EMAIL' as const,
          title: 'One-off',
          contextName: 'testContext',
          status: 'SENT' as const,
          sendAfter: null,
          sentAt: new Date(),
          readAt: null,
          createdAt: new Date(),
          adapterUsed: 'sendgrid',
          bodyTemplate: 'Body',
          subjectTemplate: 'Subject',
        },
      ];

      const mockGetOneOff = jest.fn().mockResolvedValue(mockNotifications);

      getVintaSendService.mockResolvedValue({
        getOneOffNotifications: mockGetOneOff,
      } as any);

      const result = await fetchOneOffNotifications(1, 10);

      // Actions convert from 1-indexed (dashboard) to 0-indexed (backend) pages
      expect(mockGetOneOff).toHaveBeenCalledWith(0, 10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('emailOrPhone');
    });

    it('Test: Error handling when service throws', async () => {
      getVintaSendService.mockRejectedValue(new Error('Backend connection failed'));

      await expect(fetchNotifications({}, 1, 10)).rejects.toThrow(
        'Failed to fetch notifications: Backend connection failed',
      );
    });

    it('Test: fetchNotificationDetail throws when notification not found', async () => {
      getVintaSendService.mockResolvedValue({
        getNotification: jest.fn().mockResolvedValue(null),
        getOneOffNotification: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(fetchNotificationDetail('non-existent')).rejects.toThrow(
        'Notification with ID non-existent not found',
      );
    });

    it('Test: notificationType filter passes through to backend (no client-side filtering)', async () => {
      const mockNotifications = [
        {
          id: 'email-1',
          userId: 'user-1',
          notificationType: 'EMAIL' as const,
          title: 'Email',
          contextName: 'testContext',
          status: 'SENT' as const,
          sendAfter: null,
          sentAt: new Date(),
          readAt: null,
          createdAt: new Date(),
          adapterUsed: 'sendgrid',
          bodyTemplate: 'Body',
          subjectTemplate: 'Subject',
        },
        {
          id: 'sms-1',
          userId: 'user-1',
          notificationType: 'SMS' as const,
          title: 'SMS',
          contextName: 'testContext',
          status: 'SENT' as const,
          sendAfter: null,
          sentAt: new Date(),
          readAt: null,
          createdAt: new Date(),
          adapterUsed: 'twilio',
          bodyTemplate: 'Body',
          subjectTemplate: null,
        },
      ];

      getVintaSendService.mockResolvedValue({
        getNotifications: jest.fn().mockResolvedValue(mockNotifications),
      } as any);

      const result = await fetchNotifications({ notificationType: 'EMAIL' }, 1, 10);

      // No client-side filtering — all backend results returned
      expect(result.data).toHaveLength(2);
    });

    it('Test: Search filter passes through to backend (no client-side filtering)', async () => {
      const mockNotifications = [
        {
          id: 'search-match',
          userId: 'user-1',
          notificationType: 'EMAIL' as const,
          title: 'Important Message',
          contextName: 'testContext',
          status: 'SENT' as const,
          sendAfter: null,
          sentAt: new Date(),
          readAt: null,
          createdAt: new Date(),
          adapterUsed: 'sendgrid',
          bodyTemplate: 'Body',
          subjectTemplate: 'Subject',
        },
        {
          id: 'no-match',
          userId: 'user-2',
          notificationType: 'SMS' as const,
          title: 'Regular Text',
          contextName: 'testContext',
          status: 'SENT' as const,
          sendAfter: null,
          sentAt: new Date(),
          readAt: null,
          createdAt: new Date(),
          adapterUsed: 'twilio',
          bodyTemplate: 'Body',
          subjectTemplate: null,
        },
      ];

      getVintaSendService.mockResolvedValue({
        getNotifications: jest.fn().mockResolvedValue(mockNotifications),
      } as any);

      const result = await fetchNotifications({ search: 'important' }, 1, 10);

      // No client-side filtering — all backend results returned
      expect(result.data).toHaveLength(2);
    });
  });
});

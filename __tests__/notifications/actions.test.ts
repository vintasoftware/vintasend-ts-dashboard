/**
 * Tests for notification server actions.
 * Ensures the server actions return correctly shaped data and handle filters.
 */

import {
  fetchNotifications,
  fetchNotificationDetail,
  fetchPendingNotifications,
  fetchFutureNotifications,
  fetchOneOffNotifications,
} from '@/app/notifications/actions';
import type {
  AnyDashboardNotification,
  NotificationFilters,
  PaginatedResult,
} from '@/lib/notifications/types';

describe('Notification Server Actions — Phase 2', () => {
  describe('fetchNotifications', () => {
    it('2.3: fetchNotifications returns PaginatedResult shape (mock)', async () => {
      const result = await fetchNotifications({}, 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('total');

      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.page).toBe('number');
      expect(typeof result.pageSize).toBe('number');
      expect(typeof result.total).toBe('number');
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
      if (page1.total > 10) {
        expect(page1.data[0]?.id).not.toBe(page2.data[0]?.id);
      }
    });

    it('filters by status', async () => {
      const result = await fetchNotifications({ status: 'SENT' }, 1, 100);
      result.data.forEach((item: AnyDashboardNotification) => {
        expect(item.status).toBe('SENT');
      });
    });

    it('filters by notificationType', async () => {
      const result = await fetchNotifications({ notificationType: 'EMAIL' }, 1, 100);
      result.data.forEach((item: AnyDashboardNotification) => {
        expect(item.notificationType).toBe('EMAIL');
      });
    });

    it('filters by search term (title)', async () => {
      const result = await fetchNotifications({ search: 'notification' }, 1, 100);
      result.data.forEach((item: AnyDashboardNotification) => {
        const matches =
          (item.title?.toLowerCase().includes('notification') ?? false) ||
          item.id.toLowerCase().includes('notification') ||
          ('emailOrPhone' in item && item.emailOrPhone.toLowerCase().includes('notification'));
        expect(matches).toBe(true);
      });
    });

    it('combines multiple filters', async () => {
      const result = await fetchNotifications(
        { status: 'SENT', notificationType: 'EMAIL' },
        1,
        100,
      );
      result.data.forEach((item: AnyDashboardNotification) => {
        expect(item.status).toBe('SENT');
        expect(item.notificationType).toBe('EMAIL');
      });
    });

    it('returns correct pagination info', async () => {
      const result = await fetchNotifications({}, 1, 10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBeGreaterThan(0);
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
});

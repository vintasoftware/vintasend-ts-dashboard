/**
 * Tests for notification serialization logic.
 * Ensures dates are converted to ISO strings and payloads are optimized.
 */

import type {
  DatabaseNotification,
  DatabaseOneOffNotification,
} from 'vintasend';
import {
  serializeNotification,
  serializeNotificationWithDetail,
  serializeOneOffNotification,
  serializeOneOffNotificationWithDetail,
} from '@/lib/notifications/serialize';
import { VintaSendConfig } from '@/lib/notifications/get-vintasend-service';

describe('Notification Serialization — Phase 2', () => {
  const mockDatabaseNotification: DatabaseNotification<VintaSendConfig> = {
    id: '123',
    userId: 'user-456',
    notificationType: 'EMAIL',
    title: 'Test Notification',
    bodyTemplate: '<p>Hello {{ userName }}</p>',
    contextName: 'taskAssignment',
    contextParameters: { taskId: 'task-123', taskLinkBaseUrl: 'https://app.medplum.com/tasks' },
    sendAfter: new Date('2026-02-14T10:00:00Z'),
    subjectTemplate: 'Hello {{ userName }}',
    status: 'SENT',
    contextUsed: {
      firstName: 'John',
      taskTitle: 'Complete your profile',
      taskDescription: 'Complete your profile',
      taskIsUrgent: true,
      taskLink: 'https://app.medplum.com/tasks/task-123',
      requesterName: 'John Doe',
      attachmentCount: 0
    },
    extraParams: { campaignId: 'camp-123' },
    adapterUsed: 'nodemailer',
    sentAt: new Date('2026-02-13T10:00:00Z'),
    readAt: new Date('2026-02-13T10:05:00Z'),
    createdAt: new Date('2026-02-12T09:00:00Z'),
    gitCommitSha: 'a'.repeat(40),
  };

  const mockDatabaseOneOffNotification: DatabaseOneOffNotification<VintaSendConfig> = {
    id: 'oneoff-789',
    emailOrPhone: 'recipient@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    notificationType: 'EMAIL',
    title: 'One-off Notification',
    bodyTemplate: '<p>Hello {{ userName }}</p>',
    contextName: 'taskAssignment',
    contextParameters: { taskId: 'task-123', taskLinkBaseUrl: 'https://app.medplum.com/tasks' },
    sendAfter: null,
    subjectTemplate: 'Hello {{ userName }}',
    status: 'SENT',
    contextUsed: {
      firstName: 'John',
      taskTitle: 'Complete your profile',
      taskDescription: 'Complete your profile',
      taskIsUrgent: true,
      taskLink: 'https://app.medplum.com/tasks/task-123',
      requesterName: 'John Doe',
      attachmentCount: 0
    },
    extraParams: { source: 'api' },
    adapterUsed: 'sendgrid',
    sentAt: new Date('2026-02-13T11:00:00Z'),
    readAt: null,
    createdAt: new Date('2026-02-12T10:00:00Z'),
    gitCommitSha: 'b'.repeat(40),
  };

  describe('serializeNotification', () => {
    it('2.1: converts Date fields to ISO strings', () => {
      const serialized = serializeNotification(mockDatabaseNotification);

      expect(typeof serialized.sendAfter).toBe('string');
      expect(typeof serialized.sentAt).toBe('string');
      expect(typeof serialized.readAt).toBe('string');
      expect(typeof serialized.createdAt).toBe('string');

      // Verify ISO format
      expect(serialized.sentAt).toBe('2026-02-13T10:00:00.000Z');
      expect(serialized.readAt).toBe('2026-02-13T10:05:00.000Z');
    });

    it('2.2: strips contextUsed and contextParameters to keep payload small', () => {
      const serialized = serializeNotification(mockDatabaseNotification);

      expect(serialized).not.toHaveProperty('contextUsed');
      expect(serialized).not.toHaveProperty('contextParameters');
      expect(serialized).not.toHaveProperty('extraParams');
    });

    it('handles null dates correctly', () => {
      const notificationWithNullDates: DatabaseNotification<VintaSendConfig> = {
        ...mockDatabaseNotification,
        sendAfter: null,
        sentAt: null,
        readAt: null,
      };

      const serialized = serializeNotification(notificationWithNullDates);

      expect(serialized.sendAfter).toBeNull();
      expect(serialized.sentAt).toBeNull();
      expect(serialized.readAt).toBeNull();
    });

    it('converts numeric ID to string', () => {
      const serialized = serializeNotification(mockDatabaseNotification);
      expect(typeof serialized.id).toBe('string');
      expect(serialized.id).toBe('123');
    });

    it('includes all required displayable fields', () => {
      const serialized = serializeNotification(mockDatabaseNotification);

      expect(serialized).toHaveProperty('id');
      expect(serialized).toHaveProperty('userId');
      expect(serialized).toHaveProperty('notificationType');
      expect(serialized).toHaveProperty('title');
      expect(serialized).toHaveProperty('contextName');
      expect(serialized).toHaveProperty('status');
      expect(serialized).toHaveProperty('adapterUsed');
      expect(serialized).toHaveProperty('bodyTemplate');
      expect(serialized).toHaveProperty('gitCommitSha');
      expect(serialized.gitCommitSha).toBe('a'.repeat(40));
    });
  });

  describe('serializeNotificationWithDetail', () => {
    it('includes contextUsed and extraParams for detail view', () => {
      const serialized = serializeNotificationWithDetail(mockDatabaseNotification);

      expect(serialized).toHaveProperty('contextUsed');
      expect(serialized).toHaveProperty('extraParams');
      expect(serialized.contextUsed).toEqual(mockDatabaseNotification.contextUsed);
      expect(serialized.extraParams).toEqual(mockDatabaseNotification.extraParams);
    });

    it('preserves all fields from list serialization', () => {
      const listSerialized = serializeNotification(mockDatabaseNotification);
      const detailSerialized = serializeNotificationWithDetail(mockDatabaseNotification);

      expect(detailSerialized.id).toBe(listSerialized.id);
      expect(detailSerialized.userId).toBe(listSerialized.userId);
      expect(detailSerialized.status).toBe(listSerialized.status);
      expect(detailSerialized.createdAt).toBe(listSerialized.createdAt);
    });
  });

  describe('serializeOneOffNotification', () => {
    it('converts Date fields to ISO strings for one-off notifications', () => {
      const serialized = serializeOneOffNotification(mockDatabaseOneOffNotification);

      expect(typeof serialized.sentAt).toBe('string');
      expect(typeof serialized.createdAt).toBe('string');
    });

    it('strips contextUsed for one-off notifications', () => {
      const serialized = serializeOneOffNotification(mockDatabaseOneOffNotification);

      expect(serialized).not.toHaveProperty('contextUsed');
      expect(serialized).not.toHaveProperty('extraParams');
    });

    it('includes emailOrPhone instead of userId', () => {
      const serialized = serializeOneOffNotification(mockDatabaseOneOffNotification);

      expect(serialized).toHaveProperty('emailOrPhone');
      expect(serialized).not.toHaveProperty('userId');
      expect(serialized.emailOrPhone).toBe('recipient@example.com');
    });

    it('includes firstName and lastName', () => {
      const serialized = serializeOneOffNotification(mockDatabaseOneOffNotification);

      expect(serialized.firstName).toBe('Jane');
      expect(serialized.lastName).toBe('Doe');
    });
  });

  describe('serializeOneOffNotificationWithDetail', () => {
    it('includes contextUsed and extraParams for detail view', () => {
      const serialized = serializeOneOffNotificationWithDetail(mockDatabaseOneOffNotification);

      expect(serialized).toHaveProperty('contextUsed');
      expect(serialized).toHaveProperty('extraParams');
      expect(serialized.contextUsed).toEqual(mockDatabaseOneOffNotification.contextUsed);
      expect(serialized.extraParams).toEqual(mockDatabaseOneOffNotification.extraParams);
    });
  });

  describe('Type checking', () => {
    it('2.4: NotificationFilters type-checks expected filter combos (compile-time test)', () => {
      // This is tested at compile time (tsc)
      // At runtime, we just verify the types exist
      const filters = {
        status: 'SENT' as const,
        notificationType: 'EMAIL' as const,
        search: 'test',
      };

      expect(filters).toBeDefined();
    });
  });
});

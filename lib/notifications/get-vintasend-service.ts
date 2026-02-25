
import type { VintaSendFactory } from 'vintasend';
import type { NotificationTypeConfig as VintaSendConfig } from '../../../../examples/vintasend-medplum-example/lib/notification-service';
import { getNotificationService } from '../../../../examples/vintasend-medplum-example/lib/notification-service';
import { MedplumClient } from '@medplum/core';
import { MedplumSingleton } from '../../../../examples/vintasend-medplum-example/lib/medplum-singleton';

export type { VintaSendConfig };

/**
 * Gets a configured VintaSend instance.
 * Reads environment variables to configure the Medplum client and SendGrid adapter.
 *
 * @returns VintaSend service instance
 * @throws If required environment variables are missing or invalid
 */
export async function getVintaSendService(): Promise<ReturnType<VintaSendFactory<VintaSendConfig>['create']>> {
  // Validate required environment variables first
  const errors = await validateBackendConfig();
  if (errors.length > 0) {
    throw new Error(
      `VintaSend backend configuration is incomplete:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }

  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com',
    clientId: process.env.MEDPLUM_CLIENT_ID || '',
    clientSecret: process.env.MEDPLUM_CLIENT_SECRET || '',
  });

  MedplumSingleton.setInstance(medplum);

  return getNotificationService(medplum, {
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY || '',
    MAILGUN_FROM_EMAIL: process.env.MAILGUN_FROM_EMAIL || '',
    MAILGUN_FROM_NAME: process.env.MAILGUN_FROM_NAME || 'VintaSend Dashboard',
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || '',
  });
}

/**
 * Validates that the required environment variables are set for the backend.
 * Used at startup to catch configuration issues early.
 *
 * @returns Array of error messages for missing/invalid configuration
 */
export async function validateBackendConfig(): Promise<string[]> {
  const errors: string[] = [];

  // Medplum configuration
  if (!process.env.MEDPLUM_BASE_URL) {
    errors.push('MEDPLUM_BASE_URL is required');
  }
  if (!process.env.MEDPLUM_CLIENT_ID) {
    errors.push('MEDPLUM_CLIENT_ID is required');
  }
  if (!process.env.MEDPLUM_CLIENT_SECRET) {
    errors.push('MEDPLUM_CLIENT_SECRET is required');
  }

  // Mailgun configuration
  if (!process.env.MAILGUN_API_KEY) {
    errors.push('MAILGUN_API_KEY is required');
  }
  if (!process.env.MAILGUN_FROM_EMAIL) {
    errors.push('MAILGUN_FROM_EMAIL is required');
  }
  if (!process.env.MAILGUN_DOMAIN) {
    errors.push('MAILGUN_DOMAIN is required');
  }

  return errors;
}

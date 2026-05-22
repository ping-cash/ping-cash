/**
 * Push notification channel via Firebase Cloud Messaging.
 * For users who have the mobile app installed.
 *
 * Stub-mode-only in Phase 1 — full FCM integration deferred until mobile
 * app device-token registration is wired (per ROADMAP.md Wave 2).
 */
import { loadConfig } from '@ping/config';
import { logger } from '../utils/logger';
import type { ChannelResult } from './whatsapp.channel';

const _config = loadConfig();

export interface PushSendInput {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPush(input: PushSendInput): Promise<ChannelResult> {
  // Phase 1: stub only. Phase 2: full FCM via firebase-admin SDK.
  logger.info(
    { deviceTokenPrefix: input.deviceToken.slice(0, 8) },
    '[STUB MODE] Would send push notification (FCM integration pending)',
  );
  return {
    channel: 'push',
    delivered: true,
    providerMessageId: `push_stub_${Date.now()}`,
  };
}

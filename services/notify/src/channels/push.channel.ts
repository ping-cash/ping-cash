/**
 * Push notification channel — Expo Push API (#81).
 *
 * Expo provides a free push relay that delivers to APNs (iOS) + FCM
 * (Android) without us managing either credential set. Tokens are
 * issued by expo-notifications on the mobile app; backend POSTs to
 * https://exp.host/--/api/v2/push/send with { to, title, body, data }.
 *
 * In production we can swap in a direct APNs/.p8 path by setting
 * APNS_KEY_BASE64 — until then Expo's relay works in TestFlight
 * (Apple internal distribution) without any founder action.
 *
 * Stub fallback when EXPO_PUSH_URL is overridden to empty: logs the
 * intended send but does not network. Useful for unit tests + the
 * stub-mode dev cluster.
 */
import { logger } from '../utils/logger';

import type { ChannelResult } from './whatsapp.channel';

const EXPO_PUSH_URL =
  process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';

export interface PushSendInput {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoTicket | ExpoTicket[];
  errors?: Array<{ message: string }>;
}

export async function sendPush(input: PushSendInput): Promise<ChannelResult> {
  if (!EXPO_PUSH_URL) {
    logger.info(
      { deviceTokenPrefix: input.deviceToken.slice(0, 12) },
      '[STUB MODE] Expo push URL empty — skipping network send'
    );
    return {
      channel: 'push',
      delivered: true,
      providerMessageId: `push_stub_${Date.now()}`,
    };
  }

  // Expo tokens look like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
  // Refuse to send to obviously bad tokens early; saves a network call.
  if (
    !input.deviceToken.startsWith('ExponentPushToken[') &&
    !input.deviceToken.startsWith('ExpoPushToken[')
  ) {
    logger.warn(
      { deviceTokenPrefix: input.deviceToken.slice(0, 12) },
      'Push token does not look like an Expo token'
    );
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: input.deviceToken,
        title: input.title,
        body: input.body,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        data: input.data ?? {},
      }),
    });
    const body = (await res.json().catch(() => ({}))) as ExpoPushResponse;
    if (!res.ok || body.errors?.length) {
      logger.warn(
        { status: res.status, errors: body.errors },
        'Expo push returned non-OK'
      );
      return { channel: 'push', delivered: false };
    }
    const tickets = Array.isArray(body.data)
      ? body.data
      : body.data
        ? [body.data]
        : [];
    const first = tickets[0];
    if (first?.status === 'error') {
      logger.warn(
        { message: first.message, details: first.details },
        'Expo push ticket error'
      );
      return { channel: 'push', delivered: false };
    }
    return {
      channel: 'push',
      delivered: true,
      providerMessageId: first?.id ?? `expo_${Date.now()}`,
    };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Expo push fetch failed');
    return { channel: 'push', delivered: false };
  }
}

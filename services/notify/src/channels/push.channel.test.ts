/**
 * Unit tests for push.channel.ts — Expo Push API client + ticket
 * error handling + stub fallback (#81).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { sendPush } from './push.channel';

describe('sendPush (Expo)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns delivered:true when Expo returns ok ticket', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { status: 'ok', id: 'tk_abc123' } }),
        { status: 200 }
      )
    ) as never;

    const r = await sendPush({
      deviceToken: 'ExponentPushToken[validlooking]',
      title: 'Hello',
      body: 'world',
    });
    expect(r.channel).toBe('push');
    expect(r.delivered).toBe(true);
    expect(r.providerMessageId).toBe('tk_abc123');
  });

  it('handles Expo array response shape', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: [{ status: 'ok', id: 'tk_xyz' }] }),
        { status: 200 }
      )
    ) as never;

    const r = await sendPush({
      deviceToken: 'ExponentPushToken[token]',
      title: 't',
      body: 'b',
    });
    expect(r.delivered).toBe(true);
    expect(r.providerMessageId).toBe('tk_xyz');
  });

  it('returns delivered:false when ticket reports DeviceNotRegistered', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            status: 'error',
            message: 'not registered',
            details: { error: 'DeviceNotRegistered' },
          },
        }),
        { status: 200 }
      )
    ) as never;

    const r = await sendPush({
      deviceToken: 'ExponentPushToken[invalid]',
      title: 't',
      body: 'b',
    });
    expect(r.delivered).toBe(false);
  });

  it('returns delivered:false on non-200 from Expo', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'rate limited' }] }), {
        status: 429,
      })
    ) as never;

    const r = await sendPush({
      deviceToken: 'ExponentPushToken[token]',
      title: 't',
      body: 'b',
    });
    expect(r.delivered).toBe(false);
  });

  it('returns delivered:false when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('econnreset')) as never;

    const r = await sendPush({
      deviceToken: 'ExponentPushToken[token]',
      title: 't',
      body: 'b',
    });
    expect(r.delivered).toBe(false);
  });

  it('still sends with a non-Expo-looking token (warns but tries)', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { status: 'ok', id: 'tk_legacy' } }),
        { status: 200 }
      )
    ) as never;

    // FCM-style token, not Expo shape — channel logs a warn but
    // still POSTs (Expo's relay accepts both).
    const r = await sendPush({
      deviceToken: 'fcm_or_apns_legacy',
      title: 't',
      body: 'b',
    });
    expect(r.delivered).toBe(true);
    expect(r.providerMessageId).toBe('tk_legacy');
  });
});

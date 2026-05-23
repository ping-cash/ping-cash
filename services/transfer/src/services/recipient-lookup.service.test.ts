import { describe, it, expect, vi, beforeEach } from 'vitest';

import { lookupRecipientUserId } from './recipient-lookup.service';

const ORIGINAL_URL = process.env.USER_SERVICE_URL;
const PHONE_HASH = 'a'.repeat(64);

describe('lookupRecipientUserId', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_URL === undefined) delete process.env.USER_SERVICE_URL;
    else process.env.USER_SERVICE_URL = ORIGINAL_URL;
  });

  it('returns null when USER_SERVICE_URL unset (stub mode)', async () => {
    delete process.env.USER_SERVICE_URL;
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    const result = await lookupRecipientUserId(PHONE_HASH, spy as any);
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns userId when user-service returns 200 with body', async () => {
    process.env.USER_SERVICE_URL = 'http://user:3002';
    const spy = vi.fn(
      async () =>
        new Response(JSON.stringify({ userId: 'usr-xyz' }), { status: 200 })
    );
    const result = await lookupRecipientUserId(PHONE_HASH, spy as any);
    expect(result).toBe('usr-xyz');
  });

  it('returns null on 404 (recipient not registered)', async () => {
    process.env.USER_SERVICE_URL = 'http://user:3002';
    const spy = vi.fn(async () => new Response('not found', { status: 404 }));
    const result = await lookupRecipientUserId(PHONE_HASH, spy as any);
    expect(result).toBeNull();
  });

  it('returns null on network error (treats as unregistered)', async () => {
    process.env.USER_SERVICE_URL = 'http://user:3002';
    const spy = vi.fn(async () => {
      throw new Error('connection refused');
    });
    const result = await lookupRecipientUserId(PHONE_HASH, spy as any);
    expect(result).toBeNull();
  });
});

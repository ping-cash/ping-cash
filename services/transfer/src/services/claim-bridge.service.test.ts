import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createClaimForTransfer,
  type ClaimBridgeInput,
} from './claim-bridge.service';

const ORIGINAL = process.env.CLAIM_SERVICE_URL;
const INPUT: ClaimBridgeInput = {
  transferId: 'txn_xyz',
  senderId: '00000000-0000-0000-0000-000000000001',
  senderName: 'Maria from Dubai',
  recipientPhone: '+639171234567',
  claimCode: 'AbCdEf123456',
  amountValue: '50.00',
  amountCurrency: 'USDC',
  localValue: '2825.00',
  localCurrency: 'PHP',
  fxRate: 56.5,
};

describe('createClaimForTransfer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL === undefined) delete process.env.CLAIM_SERVICE_URL;
    else process.env.CLAIM_SERVICE_URL = ORIGINAL;
  });

  it('returns null when CLAIM_SERVICE_URL unset (stub mode)', async () => {
    delete process.env.CLAIM_SERVICE_URL;
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    const r = await createClaimForTransfer(
      INPUT,
      spy as unknown as typeof fetch
    );
    expect(r).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('POSTs to /claims/internal/create with canonical body', async () => {
    process.env.CLAIM_SERVICE_URL = 'http://claim:3006';
    let captured: { url: string; body?: unknown } = { url: '' };
    const spy = vi.fn(async (url: string, init?: RequestInit) => {
      captured = {
        url,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      };
      return new Response(
        JSON.stringify({
          code: 'AbCdEf123456',
          url: 'https://ping.openova.io/c/AbCdEf123456',
        }),
        { status: 201 }
      );
    });
    const r = await createClaimForTransfer(
      INPUT,
      spy as unknown as typeof fetch
    );
    expect(captured.url).toBe('http://claim:3006/claims/internal/create');
    expect((captured.body as { transferId: string }).transferId).toBe(
      'txn_xyz'
    );
    expect(r?.code).toBe('AbCdEf123456');
  });

  it('swallows 5xx — transfer stays persisted but bridge returns null', async () => {
    process.env.CLAIM_SERVICE_URL = 'http://claim:3006';
    const spy = vi.fn(async () => new Response('boom', { status: 500 }));
    const r = await createClaimForTransfer(
      INPUT,
      spy as unknown as typeof fetch
    );
    expect(r).toBeNull();
  });

  it('swallows network error — bridge returns null', async () => {
    process.env.CLAIM_SERVICE_URL = 'http://claim:3006';
    const spy = vi.fn(async () => {
      throw new Error('connection refused');
    });
    const r = await createClaimForTransfer(
      INPUT,
      spy as unknown as typeof fetch
    );
    expect(r).toBeNull();
  });
});

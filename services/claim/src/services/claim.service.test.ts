import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { ClaimRecord } from '../utils/redis';

const store = new Map<string, ClaimRecord>();

vi.mock('../utils/redis', () => ({
  storeClaim: async (code: string, record: ClaimRecord) => {
    store.set(code, record);
  },
  readClaim: async (code: string) => store.get(code) ?? null,
  updateClaim: async (code: string, updates: Partial<ClaimRecord>) => {
    const cur = store.get(code);
    if (!cur) return null;
    const next = { ...cur, ...updates };
    store.set(code, next);
    return next;
  },
  storeRateLimit: async () => {
    /* no-op */
  },
  checkClaimViewRateLimit: async () => true,
  CLAIM_TTL_SECONDS: 7 * 24 * 60 * 60,
}));

import * as claimService from './claim.service';

const BASE = {
  transferId: 'txn_abc',
  senderId: '00000000-0000-0000-0000-000000000001',
  senderName: 'Maria',
  recipientPhone: '+639171234567',
  amount: {
    value: '50.00',
    currency: 'USDC',
    localValue: '2825.00',
    localCurrency: 'PHP',
    fxRate: 56.5,
  },
};

describe('claim.service.create', () => {
  beforeEach(() => store.clear());

  it('generates a 12-char base62 code when none supplied', async () => {
    const r = await claimService.create(BASE);
    expect(r.code).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(store.has(r.code)).toBe(true);
  });

  it('honors a supplied claimCode (first time)', async () => {
    const r = await claimService.create({
      ...BASE,
      claimCode: 'AbCdEf123456',
    });
    expect(r.code).toBe('AbCdEf123456');
    expect(store.get('AbCdEf123456')?.transferId).toBe('txn_abc');
  });

  it('is idempotent: same claimCode + same transferId returns same record', async () => {
    const a = await claimService.create({ ...BASE, claimCode: 'CodE12345678' });
    const b = await claimService.create({ ...BASE, claimCode: 'CodE12345678' });
    expect(a.code).toBe(b.code);
    expect(a.expiresAt).toBe(b.expiresAt);
    expect(store.size).toBe(1);
  });

  it('rejects same claimCode bound to a DIFFERENT transferId', async () => {
    await claimService.create({ ...BASE, claimCode: 'Xyz123456789' });
    await expect(
      claimService.create({
        ...BASE,
        transferId: 'txn_OTHER',
        claimCode: 'Xyz123456789',
      })
    ).rejects.toThrow(/different transferId/);
  });
});

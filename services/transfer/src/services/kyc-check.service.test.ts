import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requiredTierForAmount,
  ensureKycForTransfer,
  KycTierInsufficientError,
  __resetKycClientForTests,
} from './kyc-check.service';

describe('requiredTierForAmount', () => {
  it('returns 0 for amounts < $200', () => {
    expect(requiredTierForAmount(0)).toBe(0);
    expect(requiredTierForAmount(50)).toBe(0);
    expect(requiredTierForAmount(199.99)).toBe(0);
  });

  it('returns 1 for amounts $200 - $999.99', () => {
    expect(requiredTierForAmount(200)).toBe(1);
    expect(requiredTierForAmount(500)).toBe(1);
    expect(requiredTierForAmount(999.99)).toBe(1);
  });

  it('returns 2 for amounts >= $1000', () => {
    expect(requiredTierForAmount(1000)).toBe(2);
    expect(requiredTierForAmount(10_000)).toBe(2);
  });
});

describe('ensureKycForTransfer (integration)', () => {
  const ORIGINAL_URL = process.env.KYC_SERVICE_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
    __resetKycClientForTests();
    if (ORIGINAL_URL === undefined) delete process.env.KYC_SERVICE_URL;
    else process.env.KYC_SERVICE_URL = ORIGINAL_URL;
  });

  it('does not call KYC service for amounts < $200', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await ensureKycForTransfer('user-1', 50);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws KycTierInsufficientError when amount $500 user tier 0', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ userId: 'u', kycTier: 0, records: [] }),
            { status: 200 }
          )
      )
    );
    await expect(ensureKycForTransfer('u', 500)).rejects.toBeInstanceOf(
      KycTierInsufficientError
    );
  });

  it('throws KycTierInsufficientError(1,2) for $5000 user tier 1', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ userId: 'u', kycTier: 1, records: [] }),
            { status: 200 }
          )
      )
    );
    try {
      await ensureKycForTransfer('u', 5000);
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(KycTierInsufficientError);
      const e = err as KycTierInsufficientError;
      expect(e.currentTier).toBe(1);
      expect(e.requiredTier).toBe(2);
    }
  });

  it('does not throw when amount $5000 user tier 2', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ userId: 'u', kycTier: 2, records: [] }),
            { status: 200 }
          )
      )
    );
    await expect(ensureKycForTransfer('u', 5000)).resolves.toBeUndefined();
  });

  it('stub-mode passthrough when KYC_SERVICE_URL unset', async () => {
    delete process.env.KYC_SERVICE_URL;
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await ensureKycForTransfer('u', 5000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

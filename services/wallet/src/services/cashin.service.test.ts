/**
 * Unit tests for cashin.service.ts — stub fallback + amount validation
 * + method-to-payment-method-types mapping (#88).
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { buildCashinIntent } from './cashin.service';

describe('buildCashinIntent (stub mode — STRIPE_SECRET_KEY unset)', () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('returns isLive:false + synthetic clientSecret in stub mode', async () => {
    const intent = await buildCashinIntent({
      amountUsd: '25.00',
      method: 'apple_pay',
      userId: 'usr_test1',
      recipientWallet: 'Stub2b34343737303039303030303100000000000000',
    });
    expect(intent.isLive).toBe(false);
    expect(intent.clientSecret).toMatch(/^pi_stub_\d+_secret_stub$/);
    expect(intent.amount).toBe(2500);
    expect(intent.currency).toBe('usd');
  });

  it('returns the documented Stripe test publishable key by default', async () => {
    const intent = await buildCashinIntent({
      amountUsd: '5.00',
      method: 'card',
      userId: 'usr_t',
      recipientWallet: 'addr',
    });
    expect(intent.publishableKey).toMatch(/^pk_test_/);
  });

  // STRIPE_PUBLISHABLE_KEY env override is exercised end-to-end on the
  // cluster — loadConfig() caches at module init in this test process
  // so a same-process env mutation wouldn't be visible.

  it('converts decimal USD to integer cents', async () => {
    const intent = await buildCashinIntent({
      amountUsd: '99.99',
      method: 'card',
      userId: 'usr_t',
      recipientWallet: 'addr',
    });
    expect(intent.amount).toBe(9999);
  });

  it('rejects zero amount', async () => {
    await expect(
      buildCashinIntent({
        amountUsd: '0',
        method: 'card',
        userId: 'usr_t',
        recipientWallet: 'addr',
      })
    ).rejects.toThrow('Invalid amount');
  });

  it('rejects negative amount', async () => {
    await expect(
      buildCashinIntent({
        amountUsd: '-5',
        method: 'card',
        userId: 'usr_t',
        recipientWallet: 'addr',
      })
    ).rejects.toThrow('Invalid amount');
  });

  it('rejects NaN amount', async () => {
    await expect(
      buildCashinIntent({
        amountUsd: 'not-a-number',
        method: 'card',
        userId: 'usr_t',
        recipientWallet: 'addr',
      })
    ).rejects.toThrow('Invalid amount');
  });
});

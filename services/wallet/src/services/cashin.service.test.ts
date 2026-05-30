/**
 * Unit tests for cashin.service.ts — Onramper adapter (ADR 0026).
 * Stub fallback + amount validation + new response shape.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { buildCashinIntent } from './cashin.service';

describe('buildCashinIntent (stub mode — ONRAMPER_API_KEY unset)', () => {
  beforeEach(() => {
    delete process.env.ONRAMPER_API_KEY;
    delete process.env.ONRAMPER_SIGNING_SECRET;
  });

  it('returns isLive:false + synthetic checkout URL in stub mode', async () => {
    const intent = await buildCashinIntent({
      amountUsd: '25.00',
      method: 'apple_pay',
      userId: 'usr_test1',
      recipientWallet: 'Stub2b34343737303039303030303100000000000000',
    });
    expect(intent.isLive).toBe(false);
    expect(intent.checkoutUrl).toMatch(/^https:\/\/buy\.onramper\.com\//);
    expect(intent.amount).toBe(2500);
    expect(intent.currency).toBe('USD');
    expect(intent.provider).toBe('topper');
    expect(intent.expectedUsdcAmount).toBeCloseTo(25 * 0.9838, 2);
  });

  it('discloses Ping-side fee around 1.62% in stub synthetic mode', async () => {
    const intent = await buildCashinIntent({
      amountUsd: '100',
      method: 'card',
      userId: 'usr_t',
      recipientWallet: 'addr',
    });
    expect(intent.feePercent).toBeCloseTo(1.62, 1);
  });

  it('returns a URL that bakes the user-locked amount + crypto', async () => {
    const intent = await buildCashinIntent({
      amountUsd: '99.99',
      method: 'card',
      userId: 'usr_t',
      recipientWallet: 'addr',
    });
    expect(intent.amount).toBe(9999);
    expect(intent.checkoutUrl).toMatch(/defaultAmount=99\.99/);
    expect(intent.checkoutUrl).toMatch(/defaultFiat=USD/);
    expect(intent.checkoutUrl).toMatch(/defaultCrypto=usdc_base/);
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

  it('supports google_pay as a new payment method', async () => {
    const intent = await buildCashinIntent({
      amountUsd: '50',
      method: 'google_pay',
      userId: 'usr_t',
      recipientWallet: 'addr',
    });
    expect(intent.isLive).toBe(false);
    expect(intent.checkoutUrl).toMatch(/^https:\/\/buy\.onramper\.com\//);
  });
});

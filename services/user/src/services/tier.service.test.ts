import { describe, it, expect } from 'vitest';

import {
  computeTier,
  discountForTier,
  computeFinalMarkup,
  PAY_IN_PING_FURTHER_DISCOUNT,
} from './tier.service';

// Simulate Prisma's Decimal — only toString() is required by DecimalLike interface.
const dec = (n: number) => ({ toString: () => String(n) });

describe('tier.service.computeTier', () => {
  it('returns bronze for 0 balance', () => {
    expect(computeTier(0, 0, 0)).toBe('bronze');
    expect(computeTier(dec(0), dec(0), dec(0))).toBe('bronze');
  });

  it('returns bronze just below silver threshold', () => {
    expect(computeTier(999, 0, 0)).toBe('bronze');
  });

  it('returns silver at threshold', () => {
    expect(computeTier(1000, 0, 0)).toBe('silver');
    // Total of 1200 across components (welcome stake scenario)
    expect(computeTier(200, 1000, 0)).toBe('silver');
    expect(computeTier(200, 0, 1000)).toBe('silver');
  });

  it('returns silver across the silver-gold range', () => {
    expect(computeTier(5000, 0, 0)).toBe('silver');
    expect(computeTier(9999, 0, 0)).toBe('silver');
  });

  it('returns gold at gold threshold', () => {
    expect(computeTier(10000, 0, 0)).toBe('gold');
    expect(computeTier(5000, 5000, 0)).toBe('gold');
  });

  it('returns platinum at platinum threshold', () => {
    expect(computeTier(100000, 0, 0)).toBe('platinum');
    expect(computeTier(50000, 50000, 0)).toBe('platinum');
  });
});

describe('tier.service.discountForTier', () => {
  it('returns 0% for Bronze', () => {
    expect(discountForTier('bronze')).toBe(0);
  });
  it('returns 50% for Silver', () => {
    expect(discountForTier('silver')).toBe(0.5);
  });
  it('returns 75% for Gold', () => {
    expect(discountForTier('gold')).toBe(0.75);
  });
  it('returns 90% for Platinum', () => {
    expect(discountForTier('platinum')).toBe(0.9);
  });
});

describe('tier.service.computeFinalMarkup', () => {
  // Standard fee on $400 = $2; provider cost $1.20; markup $0.80.
  // We compute markup-only here (per ADR 0013).
  const fullMarkup = 0.8;

  it('bronze + USDC: full markup', () => {
    expect(computeFinalMarkup(fullMarkup, 'bronze', false)).toBeCloseTo(0.8, 4);
  });

  it('bronze + pay-in-PING: 75% off', () => {
    expect(computeFinalMarkup(fullMarkup, 'bronze', true)).toBeCloseTo(0.2, 4);
  });

  it('silver + USDC: 50% off', () => {
    expect(computeFinalMarkup(fullMarkup, 'silver', false)).toBeCloseTo(0.4, 4);
  });

  it('silver + pay-in-PING: 50% off then 75% off', () => {
    expect(computeFinalMarkup(fullMarkup, 'silver', true)).toBeCloseTo(0.1, 4);
  });

  it('gold + pay-in-PING: 75% off then 75% off', () => {
    expect(computeFinalMarkup(fullMarkup, 'gold', true)).toBeCloseTo(0.05, 4);
  });

  it('platinum + pay-in-PING: 90% off then 75% off', () => {
    expect(computeFinalMarkup(fullMarkup, 'platinum', true)).toBeCloseTo(0.02, 4);
  });

  it('PAY_IN_PING_FURTHER_DISCOUNT is exactly 0.75', () => {
    expect(PAY_IN_PING_FURTHER_DISCOUNT).toBe(0.75);
  });
});

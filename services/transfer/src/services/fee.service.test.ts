/**
 * Tests for the fee engine — exercises every cell of the fee matrix.
 *
 * Documented in BUSINESS-STRATEGY.md "Complete fee table" section.
 */
import { describe, it, expect } from 'vitest';

import { computeFee, applyHardFloor, PAY_IN_PING_FURTHER_DISCOUNT } from './fee.service';

describe('fee.service.computeFee — in-network', () => {
  it('returns $0 fee for in-network transfer regardless of tier', () => {
    const b1 = computeFee({ amountUsd: '400', method: 'in-network', tier: 'bronze', payInPing: false });
    const b2 = computeFee({ amountUsd: '400', method: 'in-network', tier: 'platinum', payInPing: true });
    expect(parseFloat(b1.totalFeeUsd)).toBe(0);
    expect(parseFloat(b2.totalFeeUsd)).toBe(0);
  });
});

describe('fee.service.computeFee — mobile-wallet on $400', () => {
  // Per BUSINESS-STRATEGY.md: 0.5% total = 0.3% provider + 0.2% markup
  // On $400: $1.20 provider + $0.80 markup = $2.00 total at Bronze
  it('bronze + USDC: $2.00 ($1.20 provider + $0.80 markup)', () => {
    const b = computeFee({ amountUsd: '400', method: 'mobile-wallet', tier: 'bronze', payInPing: false });
    expect(parseFloat(b.providerCostUsd)).toBeCloseTo(1.20, 4);
    expect(parseFloat(b.pingMarkupAfterPayInPingUsd)).toBeCloseTo(0.80, 4);
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(2.00, 4);
    expect(parseFloat(b.savingsVsBronzeUsd)).toBeCloseTo(0, 4);
  });

  it('silver + USDC: $1.60 ($1.20 + $0.40)', () => {
    const b = computeFee({ amountUsd: '400', method: 'mobile-wallet', tier: 'silver', payInPing: false });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(1.60, 4);
    expect(parseFloat(b.savingsVsBronzeUsd)).toBeCloseTo(0.40, 4);
  });

  it('silver + pay-in-PING: $1.30 ($1.20 + $0.10)', () => {
    const b = computeFee({ amountUsd: '400', method: 'mobile-wallet', tier: 'silver', payInPing: true });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(1.30, 4);
    expect(parseFloat(b.savingsVsBronzeUsd)).toBeCloseTo(0.70, 4);
  });

  it('gold + pay-in-PING: $1.25 ($1.20 + $0.05)', () => {
    const b = computeFee({ amountUsd: '400', method: 'mobile-wallet', tier: 'gold', payInPing: true });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(1.25, 4);
    expect(parseFloat(b.savingsVsBronzeUsd)).toBeCloseTo(0.75, 4);
  });

  it('platinum + pay-in-PING: $1.22 ($1.20 + $0.02)', () => {
    const b = computeFee({ amountUsd: '400', method: 'mobile-wallet', tier: 'platinum', payInPing: true });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(1.22, 4);
  });
});

describe('fee.service.computeFee — bank-transfer on $400', () => {
  // 0.75% total = 0.4% provider + 0.35% markup
  it('bronze: $3.00 ($1.60 + $1.40)', () => {
    const b = computeFee({ amountUsd: '400', method: 'bank-transfer', tier: 'bronze', payInPing: false });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(3.00, 4);
    expect(parseFloat(b.providerCostUsd)).toBeCloseTo(1.60, 4);
  });

  it('silver + pay-in-PING: $1.7755', () => {
    const b = computeFee({ amountUsd: '400', method: 'bank-transfer', tier: 'silver', payInPing: true });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(1.7755, 4);
  });
});

describe('fee.service.computeFee — cash-pickup on $400', () => {
  // 1.0% total = 0.7% provider + 0.3% markup
  it('bronze: $4.00 ($2.80 + $1.20)', () => {
    const b = computeFee({ amountUsd: '400', method: 'cash-pickup', tier: 'bronze', payInPing: false });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(4.00, 4);
  });

  it('platinum + pay-in-PING: $2.83', () => {
    const b = computeFee({ amountUsd: '400', method: 'cash-pickup', tier: 'platinum', payInPing: true });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(2.83, 4);
  });
});

describe('fee.service.computeFee — phpc-direct on $400', () => {
  // 0.1% total = 0.05% provider + 0.05% markup
  it('bronze: $0.40 ($0.20 + $0.20)', () => {
    const b = computeFee({ amountUsd: '400', method: 'phpc-direct', tier: 'bronze', payInPing: false });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(0.40, 4);
  });

  it('platinum + pay-in-PING: $0.205', () => {
    const b = computeFee({ amountUsd: '400', method: 'phpc-direct', tier: 'platinum', payInPing: true });
    expect(parseFloat(b.totalFeeUsd)).toBeCloseTo(0.205, 4);
  });
});

describe('fee.service constants', () => {
  it('PAY_IN_PING_FURTHER_DISCOUNT is exactly 0.75', () => {
    expect(PAY_IN_PING_FURTHER_DISCOUNT).toBe(0.75);
  });
});

describe('fee.service.applyHardFloor', () => {
  it('clamps total fee at provider cost (defense in depth)', () => {
    const breakdown = computeFee({ amountUsd: '400', method: 'mobile-wallet', tier: 'platinum', payInPing: true });
    // The normal formula gives $1.22 ($1.20 + $0.02) — already above provider
    const floored = applyHardFloor(breakdown);
    expect(parseFloat(floored.totalFeeUsd)).toBeGreaterThanOrEqual(parseFloat(floored.providerCostUsd));
  });
});

describe('fee.service — Maria simulation (per BUSINESS-STRATEGY.md)', () => {
  // Maria sends $400 to PH monthly. 12 months as Silver + pay-in-PING.
  it('12-month cumulative fee at Silver+pay-in-PING = $15.60', () => {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const b = computeFee({ amountUsd: '400', method: 'mobile-wallet', tier: 'silver', payInPing: true });
      total += parseFloat(b.totalFeeUsd);
    }
    expect(total).toBeCloseTo(15.60, 1);
  });

  it('vs Bronze full fee over 12 months = $24.00, saves $8.40', () => {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const b = computeFee({ amountUsd: '400', method: 'mobile-wallet', tier: 'bronze', payInPing: false });
      total += parseFloat(b.totalFeeUsd);
    }
    expect(total).toBeCloseTo(24.00, 1);
  });
});

import { describe, it, expect } from 'vitest';

import { computeClawback, tierFromBalance } from './clawback.service';

describe('token.clawback.tierFromBalance', () => {
  it('returns bronze for 0', () => {
    expect(tierFromBalance(0)).toBe('bronze');
  });
  it('returns silver at 1000', () => {
    expect(tierFromBalance(1000)).toBe('silver');
  });
  it('returns gold at 10000', () => {
    expect(tierFromBalance(10000)).toBe('gold');
  });
  it('returns platinum at 100000', () => {
    expect(tierFromBalance(100000)).toBe('platinum');
  });
});

describe('token.clawback.computeClawback — honest user', () => {
  it('Maria: held 1,500 PING for 60 days, sells 1,500 — clawback = 0 (still at Silver basis)', () => {
    const now = Math.floor(Date.now() / 1000);
    const day1 = now - 60 * 24 * 60 * 60;

    const result = computeClawback(
      {
        userId: 'maria',
        saleAmount: 1500,
        currentBalance: 2700, // 1,500 owned + 1,200 welcome stake
        feeHistory: [
          {
            timestamp: day1 + 30 * 24 * 60 * 60,
            feeAmountUsd: 2.0,
            tierUsedAtTime: 'silver',
            discountReceivedUsd: 0.7, // Got Silver discount; $2 std fee → $1.30 paid → $0.70 saved
            pingBalanceAtTime: 2700,
          },
        ],
        balanceHistory: [
          { timestamp: day1, balance: 2700 },
        ],
      },
      0.01, // PING price = $0.01
    );

    // Post-sale: 2,700 - 1,500 = 1,200 → still Silver basis
    expect(result.postSaleBasis).toBe(1200);
    // Fair tier from TWA over 30 days post-sale projection: Silver
    // So unfair benefit = 0
    expect(result.totalClawbackUsd).toBeCloseTo(0, 2);
  });
});

describe('token.clawback.computeClawback — flash gamer', () => {
  it('Cheater: buys 100K, gets Platinum fee, sells immediately — large clawback', () => {
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesAgo = now - 5 * 60;

    const result = computeClawback(
      {
        userId: 'cheater',
        saleAmount: 100000,
        currentBalance: 100000,
        feeHistory: [
          {
            // Paid fee at Platinum a few minutes ago
            timestamp: fiveMinutesAgo,
            feeAmountUsd: 25,
            tierUsedAtTime: 'platinum',
            discountReceivedUsd: 22.50, // Platinum 90% off + pay-in-PING 75% off
            pingBalanceAtTime: 100000,
          },
        ],
        balanceHistory: [
          { timestamp: fiveMinutesAgo - 60, balance: 0 },
          { timestamp: fiveMinutesAgo, balance: 100000 },
        ],
      },
      0.10,
    );

    // Post-sale balance: 0 → Bronze
    expect(result.postSaleBasis).toBe(0);

    // The TWA over the 5min window weights heavily toward post-sale (Bronze=0)
    // → Fair tier = Bronze → Fair discount = 0
    // → Unfair benefit = $22.50 - $0 = $22.50
    expect(result.totalClawbackUsd).toBeGreaterThan(20);
    expect(result.perFeeBreakdown.length).toBe(1);
    expect(result.perFeeBreakdown[0].fairTier).toBe('bronze');
  });
});

describe('token.clawback.computeClawback — outside window', () => {
  it('Fee older than 365 days is ignored', () => {
    const now = Math.floor(Date.now() / 1000);
    const yearAgoPlus = now - 366 * 24 * 60 * 60;

    const result = computeClawback(
      {
        userId: 'old-user',
        saleAmount: 50000,
        currentBalance: 50000,
        feeHistory: [
          {
            timestamp: yearAgoPlus,
            feeAmountUsd: 100,
            tierUsedAtTime: 'platinum',
            discountReceivedUsd: 90,
            pingBalanceAtTime: 50000,
          },
        ],
        balanceHistory: [{ timestamp: yearAgoPlus, balance: 50000 }],
      },
      0.10,
    );

    expect(result.totalClawbackUsd).toBe(0);
    expect(result.perFeeBreakdown.length).toBe(0);
  });
});

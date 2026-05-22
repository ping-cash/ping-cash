/**
 * 365-day tier clawback engine per ADR 0013.
 *
 * On every sell of $PING (or proposed sell), this engine:
 *   1. Loads the user's benefits ledger (fees paid in last 365 days)
 *   2. For each fee, computes the time-weighted-average tier basis
 *      from the fee timestamp to NOW (after the proposed sale)
 *   3. Determines "fair tier" at that average
 *   4. Computes unfair_benefit = actual_discount_taken - fair_discount
 *   5. Sum → clawback amount, deducted from sale + burned
 *
 * For the demo / stub, this exposes the math; the live integration
 * with on-chain $PING balance comes in Phase 2.
 */

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

const TIER_THRESHOLDS: Array<{ tier: Tier; min: number }> = [
  { tier: 'platinum', min: 100_000 },
  { tier: 'gold', min: 10_000 },
  { tier: 'silver', min: 1_000 },
  { tier: 'bronze', min: 0 },
];

const TIER_DISCOUNT: Record<Tier, number> = {
  bronze: 0,
  silver: 0.5,
  gold: 0.75,
  platinum: 0.9,
};

export interface FeeRecord {
  timestamp: number;            // unix seconds when fee was paid
  feeAmountUsd: number;         // full standard fee (before any discount)
  tierUsedAtTime: Tier;
  discountReceivedUsd: number;  // standard - actual_paid
  pingBalanceAtTime: number;
}

export interface BalanceSnapshot {
  timestamp: number;
  balance: number;
}

export interface ClawbackInput {
  userId: string;
  saleAmount: number;            // PING being sold
  currentBalance: number;        // pre-sale total $PING balance
  feeHistory: FeeRecord[];       // last 365 days
  balanceHistory: BalanceSnapshot[]; // for TWA computation
}

export interface ClawbackResult {
  totalClawbackUsd: number;
  totalClawbackPing: number;
  pingPriceAtSale: number;
  perFeeBreakdown: Array<{
    timestamp: number;
    tierUsed: Tier;
    fairTier: Tier;
    discountActual: number;
    discountFair: number;
    unfairBenefit: number;
  }>;
  postSaleBasis: number;
}

function tierFromBalance(balance: number): Tier {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (balance >= min) return tier;
  }
  return 'bronze';
}

/**
 * Compute time-weighted average balance from a starting timestamp to NOW,
 * given a history of balance snapshots + the projected post-sale balance.
 */
function timeWeightedAverage(
  startTime: number,
  endTime: number,
  history: BalanceSnapshot[],
  postSaleBalance: number,
): number {
  if (startTime >= endTime) return postSaleBalance;

  // Filter history to entries within the window
  const inWindow = history
    .filter((h) => h.timestamp >= startTime && h.timestamp <= endTime)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (inWindow.length === 0) return postSaleBalance;

  let weightedSum = 0;
  let totalDuration = 0;
  let lastTime = startTime;
  let lastBalance = inWindow[0].balance;

  for (const point of inWindow) {
    const duration = point.timestamp - lastTime;
    if (duration > 0) {
      weightedSum += lastBalance * duration;
      totalDuration += duration;
    }
    lastTime = point.timestamp;
    lastBalance = point.balance;
  }

  // Final segment: from last snapshot to endTime, at post-sale balance
  const finalDuration = endTime - lastTime;
  if (finalDuration > 0) {
    weightedSum += postSaleBalance * finalDuration;
    totalDuration += finalDuration;
  }

  return totalDuration > 0 ? weightedSum / totalDuration : postSaleBalance;
}

/**
 * Compute clawback for a proposed sale.
 *
 * If the user has never used a higher tier (or sold so long ago all fees
 * are outside the 365-day window), clawback = 0.
 */
export function computeClawback(input: ClawbackInput, pingPriceAtSale: number): ClawbackResult {
  const now = Math.floor(Date.now() / 1000);
  const postSaleBasis = input.currentBalance - input.saleAmount;

  const perFeeBreakdown: ClawbackResult['perFeeBreakdown'] = [];
  let totalClawbackUsd = 0;

  for (const fee of input.feeHistory) {
    const ageSeconds = now - fee.timestamp;
    if (ageSeconds > 365 * 24 * 60 * 60) continue; // outside window

    const fairBasis = timeWeightedAverage(
      fee.timestamp,
      now,
      input.balanceHistory,
      postSaleBasis,
    );

    const fairTier = tierFromBalance(fairBasis);

    // Did the user actually get a higher discount than fair?
    const actualDiscountUsd = fee.discountReceivedUsd;
    const fairDiscountUsd = fee.feeAmountUsd * TIER_DISCOUNT[fairTier];
    const unfairBenefit = Math.max(0, actualDiscountUsd - fairDiscountUsd);

    if (unfairBenefit > 0) {
      perFeeBreakdown.push({
        timestamp: fee.timestamp,
        tierUsed: fee.tierUsedAtTime,
        fairTier,
        discountActual: actualDiscountUsd,
        discountFair: fairDiscountUsd,
        unfairBenefit,
      });
      totalClawbackUsd += unfairBenefit;
    }
  }

  const totalClawbackPing = pingPriceAtSale > 0 ? totalClawbackUsd / pingPriceAtSale : 0;

  return {
    totalClawbackUsd,
    totalClawbackPing,
    pingPriceAtSale,
    perFeeBreakdown,
    postSaleBasis,
  };
}

export { tierFromBalance, TIER_DISCOUNT };

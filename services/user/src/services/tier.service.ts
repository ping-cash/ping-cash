/**
 * Tier mechanics per ADR 0013 (Tier + 365-day clawback).
 *
 * Phase 1: Ping Points balance drives tier.
 * Phase 2: On-chain $PING balance drives tier.
 *
 * Both phases share this calc — they just feed it different inputs.
 */

// Accept Decimal (from Prisma) OR plain number — interface kept open
// so the calc is testable without a generated Prisma client.
export interface DecimalLike {
  toString(): string;
}

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Thresholds per ADR 0008 + 0013
const TIER_THRESHOLDS: Array<{ tier: Tier; min: number }> = [
  { tier: 'platinum', min: 100_000 },
  { tier: 'gold', min: 10_000 },
  { tier: 'silver', min: 1_000 },
  { tier: 'bronze', min: 0 },
];

/**
 * Compute tier from total Ping Points balance.
 * Total = free + welcome_locked + welcome_unlocked.
 */
export function computeTier(
  pingPointsFreeBalance: DecimalLike | number,
  welcomeLocked: DecimalLike | number,
  welcomeUnlocked: DecimalLike | number
): Tier {
  const total =
    toNumber(pingPointsFreeBalance) +
    toNumber(welcomeLocked) +
    toNumber(welcomeUnlocked);
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (total >= min) return tier;
  }
  return 'bronze';
}

/**
 * Get the discount on Ping markup at a given tier.
 * Returns a number in [0, 1] — e.g., 0.5 = 50% off.
 *
 * Note: pay-in-PING stacks ANOTHER 75% off on top, per ADR 0013.
 */
export function discountForTier(tier: Tier): number {
  switch (tier) {
    case 'bronze':
      return 0;
    case 'silver':
      return 0.5;
    case 'gold':
      return 0.75;
    case 'platinum':
      return 0.9;
  }
}

/**
 * Determine the discount for paying-in-PING.
 * Per ADR 0013: pay-in-PING gets 75% off the (tier-discounted) markup.
 *
 * Stacked discount on a markup of $0.80:
 *   - Bronze + pay-in-PING:    $0.80 × 1.0 × 0.25 = $0.20
 *   - Silver + pay-in-PING:    $0.80 × 0.5 × 0.25 = $0.10
 *   - Gold + pay-in-PING:      $0.80 × 0.25 × 0.25 = $0.05
 *   - Platinum + pay-in-PING:  $0.80 × 0.10 × 0.25 = $0.02
 */
export const PAY_IN_PING_FURTHER_DISCOUNT = 0.75;

export function computeFinalMarkup(
  fullMarkup: number,
  tier: Tier,
  payInPing: boolean
): number {
  const tierDiscount = discountForTier(tier);
  let markup = fullMarkup * (1 - tierDiscount);
  if (payInPing) {
    markup = markup * (1 - PAY_IN_PING_FURTHER_DISCOUNT);
  }
  return markup;
}

function toNumber(value: DecimalLike | number): number {
  return typeof value === 'number' ? value : Number(value.toString());
}

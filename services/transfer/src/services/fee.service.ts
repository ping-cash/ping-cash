/**
 * Fee calculation engine.
 *
 * Per ADR 0008 ($PING tokenomics) + ADR 0013 (tier + clawback) +
 * ADR 0016 (FX cost-covering).
 *
 * Standard fee structure for cash-out (per BUSINESS-STRATEGY.md):
 *
 *   Mobile wallet (GCash, M-Pesa, etc.):  0.5% total  = 0.3% provider + 0.2% Ping markup
 *   Bank transfer (UPI, NEFT, etc.):     0.75% total  = 0.4% provider + 0.35% Ping markup
 *   Cash pickup (Cebuana, Thunes):       1.0% total   = 0.7% provider + 0.3% Ping markup
 *   PHPC direct (Coins.ph):              0.1% total   = 0.05% provider + 0.05% Ping markup
 *   In-network (USDC → USDC):            FREE         (Solana network fee absorbed)
 *
 * Provider cost is ALWAYS pass-through USDC; cannot be discounted.
 * Ping markup is discountable via tier + pay-in-PING.
 * Hard floor: never settle below provider cost.
 */

export type CashOutMethod =
  | 'in-network'
  | 'phpc-direct'
  | 'mobile-wallet'
  | 'bank-transfer'
  | 'cash-pickup';

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface FeeRates {
  totalPercent: number;     // 0.005 = 0.5%
  providerPercent: number;  // 0.003 = 0.3%
  markupPercent: number;    // 0.002 = 0.2%
}

const FEE_TABLE: Record<CashOutMethod, FeeRates> = {
  'in-network':     { totalPercent: 0,      providerPercent: 0,      markupPercent: 0 },
  'phpc-direct':    { totalPercent: 0.001,  providerPercent: 0.0005, markupPercent: 0.0005 },
  'mobile-wallet':  { totalPercent: 0.005,  providerPercent: 0.003,  markupPercent: 0.002 },
  'bank-transfer':  { totalPercent: 0.0075, providerPercent: 0.004,  markupPercent: 0.0035 },
  'cash-pickup':    { totalPercent: 0.01,   providerPercent: 0.007,  markupPercent: 0.003 },
};

// Per ADR 0013 — pay-in-PING discount on the (tier-discounted) markup
export const PAY_IN_PING_FURTHER_DISCOUNT = 0.75;

const TIER_DISCOUNT: Record<Tier, number> = {
  bronze:   0,
  silver:   0.5,
  gold:     0.75,
  platinum: 0.9,
};

export interface FeeBreakdown {
  method: CashOutMethod;
  amountUsd: string;
  providerCostUsd: string;     // Pass-through USDC
  pingMarkupFullUsd: string;   // Before discounts
  pingMarkupAfterTierUsd: string;
  pingMarkupAfterPayInPingUsd: string; // What user actually pays in $PING (Phase 2) / Ping Points (Phase 1)
  totalFeeUsd: string;
  totalFeeAtBronze: string;    // What it would be with no discount
  savingsVsBronzeUsd: string;
  payInPing: boolean;
  tier: Tier;
}

/**
 * Compute the fee breakdown for a single cash-out.
 *
 * - `payInPing`: whether the user is paying the markup portion in $PING (Phase 1: Ping Points).
 *   Even if true, the provider portion is always USDC pass-through.
 */
export function computeFee(input: {
  amountUsd: string;
  method: CashOutMethod;
  tier: Tier;
  payInPing: boolean;
}): FeeBreakdown {
  const amount = parseFloat(input.amountUsd);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount');
  }

  const rates = FEE_TABLE[input.method];
  const providerCost = amount * rates.providerPercent;
  const fullMarkup = amount * rates.markupPercent;

  // Apply tier discount on markup
  const markupAfterTier = fullMarkup * (1 - TIER_DISCOUNT[input.tier]);

  // If pay-in-PING, apply additional discount
  const markupAfterPayInPing = input.payInPing
    ? markupAfterTier * (1 - PAY_IN_PING_FURTHER_DISCOUNT)
    : markupAfterTier;

  const totalFee = providerCost + markupAfterPayInPing;
  const totalFeeAtBronze = providerCost + fullMarkup;
  const savings = totalFeeAtBronze - totalFee;

  return {
    method: input.method,
    amountUsd: amount.toFixed(2),
    providerCostUsd: providerCost.toFixed(4),
    pingMarkupFullUsd: fullMarkup.toFixed(4),
    pingMarkupAfterTierUsd: markupAfterTier.toFixed(4),
    pingMarkupAfterPayInPingUsd: markupAfterPayInPing.toFixed(4),
    totalFeeUsd: totalFee.toFixed(4),
    totalFeeAtBronze: totalFeeAtBronze.toFixed(4),
    savingsVsBronzeUsd: savings.toFixed(4),
    payInPing: input.payInPing,
    tier: input.tier,
  };
}

/**
 * Cap helper — never charge a user below the provider cost.
 *
 * If somehow the computed total fee drops below provider cost (which the
 * normal formula already prevents — but defense in depth), clamp it.
 */
export function applyHardFloor(breakdown: FeeBreakdown): FeeBreakdown {
  const total = parseFloat(breakdown.totalFeeUsd);
  const provider = parseFloat(breakdown.providerCostUsd);
  if (total < provider) {
    return {
      ...breakdown,
      totalFeeUsd: provider.toFixed(4),
      pingMarkupAfterPayInPingUsd: '0.0000',
    };
  }
  return breakdown;
}

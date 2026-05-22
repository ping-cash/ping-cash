# ADR 0016: FX Cost-Covering Pricing (0.4% spread)

**Status:** Accepted
**Date:** 2026-05-23

## Context

Cross-border remittance providers silently pocket 2-5% in FX spread between the interbank mid-market rate and the rate they offer customers. For migrant workers sending $200-500 home monthly, this hidden cost compounds to hundreds of dollars per year per user — far more than the visible "fee."

| Provider | Typical FX margin |
|---|---|
| Banks | 2-4% |
| Western Union | 2-4% |
| MoneyGram | 2-3% |
| Remitly | 1-2% |
| Wise | 0.5-1% |

Founder explicit direction (2026-05-23):
> "I think FX is the biggest profit margin silently milking the customers, I saw with my own eyes 5% remittance, this is insane. But we have to be merciful, we just need to compensate the real costs such as cash-in cash-out."

This is a brand-defining decision. Most users will never read the FX rate disclosure, but the ones who DO compare rates (and tell their friends) will create the viral story that defines us against the incumbents.

## Decision

**Ping charges 0.4% FX spread — covering real cost only, no extractive margin.**

| Spread component | Cost |
|---|---|
| Real liquidity provider cost (Jupiter routing on Raydium / Orca / Phoenix) | 0.10-0.20% |
| Local-currency-stablecoin swap cost (e.g., USDC ↔ PHPC) | 0.10-0.20% |
| Provider FX margin (when route hits TransFi / Wise / Bitso) | 0.15-0.25% |
| **Real cost total** | **~0.20-0.40%** |
| **Ping's user-facing FX spread** | **0.40% (at the high end of real cost)** |

We capture ZERO margin on FX in normal operations. If real cost drops (e.g., better liquidity), we don't reduce the 0.40% — we capture the difference. If real cost rises (e.g., volatile market), we eat the difference (don't pass through to user).

The 0.40% is a stable, predictable, transparent commitment.

## Comparison to Industry

```
                                          What user pays:
                                          ────────────────
Western Union                             2-4% FX margin
Banks (correspondent rails)               2-4%
MoneyGram                                 2-3%
Remitly                                   1-2%
Wise                                      0.5-1%
─────────────────────────────────────────────────────────────
Ping                                      0.40% (cost-covering)
```

On a $500 transfer, this delta:
- vs Western Union (3% FX): saves $13
- vs Wise (0.7% FX): saves $1.50

Per month for a $500 sender: $13/month saved vs Western Union. **$156/year per user**.

## Communication Strategy

Most users never see the FX spread. We make it visible:

```
┌──────────────────────────────────────┐
│   Send $500 to Maria in PH           │
├──────────────────────────────────────┤
│                                      │
│   Interbank rate:    1 USD = ₱56.25  │
│   Ping rate:         1 USD = ₱56.03  │
│                                      │
│   Maria receives:    ₱28,015         │
│   FX spread:         0.40%           │
│                                      │
│   Wise charges:      0.7%            │
│   Western Union:     3.0%            │
│                                      │
└──────────────────────────────────────┘
```

Transparency = competitive weapon. Show the comparison directly.

## Mechanical Implementation

```
Cash-out flow:
  1. User initiates $500 transfer to GCash (PHP destination)
  2. fx-service:
       a. Fetch interbank USD/PHP from Pyth oracle (real-time)
       b. Compute Ping rate = interbank × (1 - 0.004)  ← 0.40% spread
       c. Return quote: $500 → ₱28,015
  3. User confirms
  4. transfer-service executes:
       a. Debit $500 + $1.30 fee from user wallet
       b. fx-service: swap USDC → PHPC via Jupiter (Raydium pool)
          Real cost: ~0.10-0.20%
       c. claim-service: deliver ₱28,015 to recipient (PHPC → Coins.ph → GCash)
       d. Settlement (TransFi or direct PHPC route)
  5. Ping retains: spread captured (0.40%) - real cost (~0.20-0.30%) = ~0.10-0.20% margin
```

The 0.10-0.20% margin is razor-thin but non-negative. We never lose money on the FX leg.

## Revenue Impact

Per BUSINESS-STRATEGY.md, FX was projected at 30% of total revenue (0.5% spread baseline). At 0.4% spread:

| Year | Volume | FX revenue (0.5% baseline) | FX revenue (0.4% actual) | Delta |
|---|---|---|---|---|
| Year 1 | $2M | $10,000 | $8,000 | -$2,000 |
| Year 2 | $30M | $150,000 | $120,000 | -$30,000 |
| Year 3 | $150M | $750,000 | $600,000 | -$150,000 |

We give up ~$180K over 3 years in FX revenue. We make this up via:

1. **Treasury yield grows faster** because customer trust → larger float deposits
2. **Viral word-of-mouth** → lower CAC → faster MAU growth (compounds revenue)
3. **Brand premium** when we later add B2B products

**Strategic logic:** $180K is a rounding error compared to the brand value of being THE remittance app that doesn't silently mark up FX.

## Hard Floor

We never settle below cost. If real FX cost spikes above 0.40% (unusual market conditions), we either:
1. Eat the loss for low-volume transfers (acceptable absorption)
2. Pause the route and route via alternative (TransFi instead of direct Jupiter swap, or vice-versa)

In no case do we increase the 0.40% spread to compensate. The 0.40% commitment is fixed brand-promise; market conditions are our problem, not the user's.

## Operational Safeguards

- **Real-time monitoring** of effective spread vs target (alert if real cost > 0.40% for >15 minutes)
- **Hedge mechanism:** for large transfers ($1K+), batch with similar trades to reduce slippage
- **Local-stablecoin preference:** route via PHPC / cKES / EURC where available (lower cost than fiat-rail FX)
- **Pyth oracle redundancy:** secondary Switchboard feed for reference price; reject FX quote if oracles disagree by >0.3%

## Consequences

**Good:**
- Brand-defining transparency — single biggest competitive moat
- Builds trust with migrant-worker target users (they feel respected, not milked)
- Viral story: word-of-mouth conversion of skeptics
- Aligns with "merciful" pricing philosophy (founder principle)
- Drives users to send larger amounts more frequently (lower per-transfer FX cost = more volume)

**Bad / trade-offs:**
- Foregoes ~$180K cumulative FX revenue over 3 years (above)
- Razor-thin margin on FX leg (0.10-0.20%) — vulnerable to market shocks
- Operational complexity in maintaining sub-cost routing in volatile markets
- Competitors may copy this once they see it succeed (mitigation: brand first-mover advantage)

## What This Is NOT

- Not "free FX" — we still charge 0.40%, just transparently
- Not a promotional / time-limited rate — this is the permanent commitment
- Not subsidized by tokenomics — the deflation cycle is separate
- Not zero-margin — there's still 0.10-0.20% baked in for stability + operational risk

## Implementation Sequencing

- **Day 1 of platform launch:** 0.40% spread is the published rate
- **Phase 1 (Ping Points era):** Spread captured in USDC, contributes to platform revenue
- **Phase 2 (token live):** 0.40% spread still operates; 5% of FX revenue → Layer 1 deflation buyback
- **Year 2+:** if market matures and real cost drops to 0.20%, we capture the wider margin without changing user-facing rate

## Alternatives Considered

- **0.30% spread (lower):** Rejected — too thin a margin; vulnerable to market shocks; could lose money on bad days
- **0.50% spread (industry-Wise-level):** Rejected — doesn't differentiate from Wise; doesn't create brand story
- **0% spread, profit only on fees + treasury yield:** Rejected — no buffer for real cost variation; operational risk
- **Variable spread based on volume:** Rejected — confusing to users; defeats "transparent" promise

## See Also

- [BUSINESS-STRATEGY.md § Fee Structure](../BUSINESS-STRATEGY.md#fee-structure)
- [BUSINESS-STRATEGY.md § FX Spread Revenue](../BUSINESS-STRATEGY.md#2-fx-spread-30)
- [ARCHITECTURE.md § Cash-In / Cash-Out Integration](../ARCHITECTURE.md#cash-in--cash-out-integration)

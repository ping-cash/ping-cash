# ADR 0009: Protocol-Owned Market Making (POMM) + Internal Swap with Spread Capture

**Status:** Accepted
**Date:** 2026-05-23

## Context

Ping's target users — migrant workers in GCC, families in PH/IN/BD — **cannot tolerate token price volatility.** If `$PING` swings 10× up then 5× down, the brand is destroyed. They are not crypto speculators; they hold $PING as a utility tier badge + fee-payment medium.

We must:

1. Dampen volatility within a corridor (no pump-and-dump)
2. Provide a continuous buy floor that grows with the platform
3. Capture forex spread on $PING buy/sell flows (revenue line)
4. Do all of this algorithmically (no human discretion) for legal defensibility

This is solved by combining two mechanisms: **POMM** (Protocol-Owned Market Making) for price stability, and **Internal Swap** for spread capture on user-initiated $PING trades.

## Decision

### Part 1: POMM (Protocol-Owned Market Making)

A smart contract that algorithmically intervenes in the Raydium CLMM $PING/USDC pool when price moves outside acceptable bands.

```
Reference price: Pyth oracle USDC/$PING + 7-day exponential moving average (EMA)

Acceptable band:  EMA × 0.85  ───  EMA × 1.15   (±15%)

Heartbeat:        Once per hour (cron-style on-chain trigger)

If current_price > EMA × 1.15:
  ▸ "Overheated" → POMM sells small slug of Foundation $PING
    into Raydium CLMM at market price
  ▸ Proceeds (USDC) added to Stability Reserve
  ▸ Cap: 0.5% of pool liquidity per intervention
  ▸ Cap: 5% of pool liquidity per 24h (anti-bot-frontrun)

If current_price < EMA × 0.85:
  ▸ "Distressed" → POMM buys $PING from Raydium CLMM
    using Stability Reserve USDC
  ▸ Bought $PING is added to Foundation reserve (NOT burned —
    available for future overheated-band selling)
  ▸ Same caps as overheated direction

Else:
  ▸ Within band — no action.

Pause: 3-of-5 Squads multisig can pause POMM (emergency only).
       No human can change direction or amount of any intervention.

Public dashboard: pomm.ping.cash — every intervention logged on-chain.
```

### Part 2: Internal Swap with Spread Capture

When a user wants to buy or sell $PING (e.g., to upgrade tier, to pay fees, to cash out), the swap routes through Ping's internal market-maker contract rather than directly hitting Jupiter / Raydium.

```
USER BUYS $PING:
  Quote price = Pyth oracle USDC/$PING × (1 + 0.3% spread)
  ├── If Ping inventory has $PING: fill from inventory, keep 100% spread
  └── Else: route via Jupiter, pass-through (we make 0% on these — rare)

USER SELLS $PING:
  Quote price = Pyth oracle USDC/$PING × (1 - 0.3% spread)
  ├── If Ping inventory has USDC: fill from inventory, keep 100% spread
  └── Else: route via Jupiter, pass-through

Inventory management (background, hourly):
  ├── If $PING inventory < 20% of target: buy via Jupiter (hedge)
  ├── If USDC inventory < 20% of target: sell $PING via Jupiter (hedge)
  └── Net: we capture ~99% of spread on user trades, pay Jupiter only
            on the residual rebalance volume
```

## Reserves Architecture

```
Stability Reserve (USDC pool)
├── Funded by:
│     ▸ 50% of Layer 3 daily treasury-yield buyback proceeds (sold $PING → USDC)
│     ▸ POMM overheated-band sales proceeds
│     ▸ 50% of internal-swap spread revenue (the other 50% goes to operating treasury)
├── Spent by:
│     ▸ POMM distressed-band buys
│     ▸ Internal-swap inventory replenishment when USDC short
└── Custody: Squads 3-of-5 + 50% deployed to Circle Yield (instant redemption)

Foundation $PING Reserve (for selling spikes)
├── Funded by:
│     ▸ 50% of Layer 3 daily buyback ($PING bought, held not burned)
│     ▸ POMM distressed-band buys (acquired $PING held in reserve)
├── Spent by:
│     ▸ POMM overheated-band sales
│     ▸ Internal-swap inventory replenishment when $PING short
└── Custody: Squads 3-of-5 + 10-year Streamflow vest on the long-term portion
```

## MEV Protection

Both POMM and Internal Swap use Jupiter's protected swap routing when accessing the open pool. This prevents sandwich attacks on POMM interventions and inventory hedging trades.

Internal user-facing swaps execute against Ping's own inventory (no DEX hop), so MEV is structurally impossible.

## Revenue Capture Math

| Source                                           | Rate     | At $1M monthly $PING swap volume | At $50M monthly       |
| ------------------------------------------------ | -------- | -------------------------------- | --------------------- |
| Internal-swap spread (buy side)                  | 0.3%     | $3,000                           | $150,000              |
| Internal-swap spread (sell side)                 | 0.3%     | $3,000                           | $150,000              |
| POMM net positive (sells > buys in growth phase) | variable | growing                          | growing significantly |
| **Total monthly**                                |          | **$6,000+**                      | **$300,000+**         |

Plus the Stability Reserve USDC itself earns ~5% APY via Circle Yield → compounding secondary revenue line.

## Legal Defensibility

POMM is structured to mirror Frax's AMO (Algorithmic Market Operations) pattern, which has operated since 2021 without SEC enforcement:

| Property                     | How POMM achieves it                                                              |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Algorithmic, no discretion   | Smart contract code — Pyth oracle in, action out, no human can override direction |
| On-chain transparent         | Every intervention public on Solana explorer + `pomm.ping.cash` dashboard         |
| Serves transactional utility | Volatility damping for user fee predictability, not investor returns              |
| No price guarantee promise   | Marketing language explicitly: "we damp extremes, we don't peg"                   |
| Stability Reserve is locked  | Cannot be drained as profit; serves stability function                            |
| Multisig can only pause      | Cannot redirect or skim                                                           |

## Consequences

**Good:**

- User price stability — Filipino aunties won't get rugged at $0.01 or FOMOd at $5
- Continuous buy floor from treasury-yield buybacks (Layer 3 of deflation stack)
- Spread revenue line scales with $PING velocity (5th revenue line alongside treasury yield, FX, cash-out, B2B)
- POMM-acquired Stability Reserve USDC itself earns yield → compounding revenue

**Bad / trade-offs:**

- Stability Reserve must be funded sufficiently to absorb attack volumes — Year 1 it's small (~$4K), grows annually. Mitigation: capital injection from Foundation Treasury (Squads multisig) if attacked
- 0.5%/day intervention cap could be exceeded by determined attackers — they can technically push price beyond band briefly. Mitigation: 24h cap of 5% limits how much we can be drained
- Pyth oracle dependency — if Pyth is compromised, POMM mis-fires. Mitigation: secondary oracle (Switchboard) cross-check before acting

## Implementation

- Anchor program (Rust) implementing POMM + Internal Swap state machine
- Pyth + Switchboard price oracle integration
- Jupiter swap integration for hedging
- Public dashboard: `pomm.ping.cash` (Next.js, reads on-chain state)
- OtterSec or Halborn audit pre-mainnet
- 7-day timelock on parameter changes (band width, cap percentages)

## Alternatives Considered

- **No POMM, free-market price:** Rejected — target users can't tolerate volatility; brand damage from pump-and-dump
- **Manual market making by team:** Rejected — discretionary intervention = securities risk (insider trading framing)
- **Pegged stablecoin model:** Rejected — defeats the deflationary mechanic; $PING is utility, not stable
- **Reserve-backed soft-peg (Frax-style fractional):** Rejected — over-engineered for our use case; we want a price-stability mechanism, not a synthetic stablecoin

## See Also

- [ADR 0008 — $PING tokenomics](0008-ping-tokenomics.md)
- [ADR 0012 — Earn Vault (yield buyback feeds POMM reserves)](0012-earn-vault.md)
- [ARCHITECTURE.md § Caching + Eventing](../ARCHITECTURE.md)
- iogrid/docs/TOKENOMICS.md § "Pool-concentration adjustment protocol" — symmetric pattern for $GRID

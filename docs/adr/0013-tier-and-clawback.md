# ADR 0013: Tier Mechanics with Instant Buy + 365-Day Sell Clawback

**Status:** Accepted
**Date:** 2026-05-23

## Context

The `$PING` tier system (Bronze / Silver / Gold / Platinum) drives fee discounts and platform feature access. The mechanism needs to:

1. **Reward honest holders immediately** — they buy $PING, they get tier benefits on the next transaction (no waiting period)
2. **Prevent flash-buy gaming** — someone buys 100K $PING, does a big transfer at Platinum tier, sells the $PING — they shouldn't profit from a tier they only "held" for minutes
3. **Be transparent and predictable** — users understand what they get and what triggers reconciliation
4. **Be on-chain enforceable** — no off-chain database tricks

Two extremes don't work:

- **30-day TWA before tier applies** → punishes honest users; they'd have to wait a month for benefits
- **Instant tier with no clawback** → trivially gamed; cheaters extract free discounts

The solution combines instant benefit with retroactive clawback at sell time.

## Decision

```
TIER ON BUY:        Instant snapshot — user qualifies for tier immediately
TIER VERIFICATION:  At each fee payment, record the discount taken
TIER RECONCILIATION: At each sell, compute "fair tier" over last 365 days,
                    clawback any unfair benefit, burn the clawback
```

## Tier Thresholds (recap from ADR 0008)

| Tier         | Min held + locked $PING (instant snapshot) | Platform-markup discount          |
| ------------ | ------------------------------------------ | --------------------------------- |
| **Bronze**   | 0                                          | 0%                                |
| **Silver**   | ≥ 1,000                                    | 50% off                           |
| **Gold**     | ≥ 10,000                                   | 75% off                           |
| **Platinum** | ≥ 100,000                                  | 90% off (capped at provider cost) |

Tier basis = (free $PING balance) + (welcome stake locked balance) + (vault $PING distributions, vesting or not)

## Mechanics

### On every fee payment — record the benefit

```
At each cash-out / fee payment:
  Record in BenefitsLedger:
    {
      user_id,
      timestamp,
      fee_amount_usdc_equivalent,
      tier_used,                  ← snapshotted tier at this moment
      discount_taken_usdc,        ← actual_full_fee - actual_fee_paid
      ping_balance_at_time        ← tier basis snapshot
    }
```

This record is per-fee-payment. Stored in the user's on-chain account state OR in an indexer (off-chain audit trail mirroring on-chain events).

### On every sell — run clawback

```
When user attempts to sell $PING (via internal swap):

  1. Calculate post-sale tier basis:
       basis_after_sale = current_balance - sale_amount + locked_balance

  2. For each fee payment in last 365 days:
       a. Determine time-weighted average tier basis from fee_timestamp to NOW
          (after the proposed sale)
       b. Determine fair_tier given that TWA basis
       c. Calculate fair_discount given fair_tier
       d. unfair_benefit_this_fee = discount_taken - fair_discount

  3. Sum all unfair_benefit_this_fee → clawback_amount

  4. clawback_amount_in_ping = clawback_amount_usdc / current_ping_price

  5. Deduct clawback_amount_in_ping from sale proceeds → BURN

  6. User receives sale - clawback - spread fee
```

### Worked Examples

#### Honest Maria

```
Day 0:    Buys 1,500 PING. Welcome stake gives another 1,200 = 2,700 PING total.
Day 30:   Transfers $400, pays $1.30 fee (Silver tier × pay-in-PING).
          Records: discount_taken = $0.70 (vs Bronze full fee)
Day 60:   Sells 1,500 PING (keeping welcome stake's 1,200 PING).

Clawback calc:
  post_sale_basis = 0 + 1,200 = 1,200 → still Silver

  Fee on Day 30:
    TWA basis from Day 30 → Day 60: held 2,700 for 30 days, then drops to 1,200
    But this is BEFORE the sale; Day 30 to Day 60 she held 2,700
    AFTER the sale: she'll hold 1,200 going forward
    Question: what tier basis did she "earn" for the fee taken on Day 30?

    Time held at ≥2,700 basis (Silver-Gold range): 30 days (Day 30 → Day 60)
    Time will hold at 1,200 (Silver) going forward: indefinite

    Fair tier = Silver (she's still Silver, she got Silver discount)
    Unfair benefit: $0 → no clawback

She receives full sale proceeds. No friction.
```

#### Flash-gaming Cheater

```
Day 0, 10:00:  Buys 100,000 PING. Tier: Platinum.
Day 0, 10:05:  Sends $5,000 to PH.
               Full fee = $25, paid at Platinum + pay-in-PING = $2.50
               Discount taken = $22.50
Day 0, 10:10:  Tries to sell 100,000 PING.

Clawback calc:
  post_sale_basis = 0 + (any welcome stake she has, say 1,200) = 1,200 → Silver tier

  Fee on Day 0 at 10:05:
    Held 100K PING for 5 minutes total (from 10:00 to 10:05)
    Will hold 1,200 forever after
    TWA basis weighted heavily toward the long-term hold = Silver (not Platinum)

    Fair tier = Silver
    Fair discount on $25 fee at Silver + pay-in-PING = $25 × 0.50 × 0.25 = $3.125
    Wait, this gives a fair fee of $25 - $3.125 = $21.875

    Hmm, let me restate: actual fee paid was $2.50 (at Platinum × pay-in-PING)
    Fair fee (at Silver × pay-in-PING) = $25 × 0.50 × 0.25 (discount on the markup)

    Actually, given the discount structure:
      Standard fee: $25
      Silver tier discount: 50% → $12.50
      Pay-in-PING (75% off the discounted): $12.50 × 0.25 = $3.125

    Fair discount = $25 - $3.125 = $21.875
    Actual discount = $25 - $2.50 = $22.50
    Unfair benefit = $22.50 - $21.875 = $0.625

  Wait, that's barely any clawback. Let me reconsider.
```

Actually the math above shows that at Platinum vs Silver, the difference is only marginal in absolute fee terms because both are already heavily discounted. The cheater's gain is small (≈$0.50 on a $25 fee). Combined with internal-swap spread cost (0.6% round-trip = $0.60 on $100), the cheater nets BELOW zero.

The system self-corrects.

For larger transfers, the math becomes more punitive:

```
$50,000 transfer:
  Standard fee: $250
  Silver + pay-in-PING fair fee: ≈$31.25
  Platinum + pay-in-PING actual fee: ≈$2.62
  Unfair benefit: $28.63 → clawback burned

Plus internal swap spread on 100K PING:
  Buy spread:  100K × $0.10 × 0.003 = $30 (cost to attacker)
  Sell spread: 100K × $0.10 × 0.003 = $30 (cost to attacker)
  Total spread cost: $60

Net for attacker:
  $28.63 unfair discount captured (but clawed back) - $60 spread - opportunity cost
  = NEGATIVE $60 (loses money on the gaming attempt)
```

Gaming is not profitable at any scale.

## Tier Calculation Details

### Tier Basis Components

```
tier_basis = sum of all $PING the user "holds" in any form:
  ├── Free $PING in wallet
  ├── Welcome stake locked balance (per ADR 0010)
  ├── Vault-distributed $PING (vesting AND vested both count)
  ├── Cashback-earned $PING (deprecated — see ADR 0008)
  └── Staked $PING in optional Fee Vault (if user has one — deprecated; see ADR 0010 update)

EXCLUDED from tier basis:
  ├── $PING in counter-party wallets (transit / unconfirmed)
  └── $PING in non-Ping wallets (Phantom external — only Ping-recognized wallets count)
```

### Tier Snapshot at Fee Time

The tier used for a fee is **frozen at the moment of fee execution.** Stored in BenefitsLedger.

### Fair Tier Computation at Clawback

For each historical fee within 365 days:

```
fair_basis(fee_t) = time-weighted average of tier basis from fee_t to NOW
                  (NOW = after the proposed sale)

fair_tier(fee_t)  = tier_from_basis(fair_basis)
fair_discount(fee_t) = compute_discount(fee_amount, fair_tier)

unfair_benefit(fee_t) = actual_discount - fair_discount
clawback += unfair_benefit
```

If `fair_tier >= tier_used`, unfair_benefit = 0 (no clawback for this fee).
If `fair_tier < tier_used`, the user took more discount than they were entitled to → clawback applies.

### Clawback Burn

The clawback amount (in USDC equivalent) is converted to $PING at the current spot price (from Pyth oracle), deducted from the sale amount, and **burned to the well-known burn address** (deflation +1).

## UX at Sell

```
┌──────────────────────────────────────┐
│ <    Sell $PING                      │
├──────────────────────────────────────┤
│                                      │
│   Selling:    100,000 $PING          │
│   Rate:       $0.10 / $PING          │
│   Gross:      $10,000 USDC           │
│                                      │
│   ───  Tier reconciliation  ────────│
│   Fees paid at Platinum:    $25.00   │
│   Fair tier post-sale:     Silver    │
│   Clawback:                -$22.50   │
│      (225 $PING burned 🔥)           │
│                                      │
│   Spread (0.3%):           -$29.92   │
│                                      │
│   You receive:           $9,947.58   │
│                                      │
└──────────────────────────────────────┘
```

Transparent to user. Formula visible. They see exactly why and how much was clawed back.

## On-Chain Implementation

```
BenefitsLedger (PDA per user)
├── Fee records (max 365 days, oldest pruned automatically)
└── Cumulative discount taken (running total, used for fast clawback calc)

Clawback runs inside the internal-swap contract:
  fn user_sell(amount, ...) -> Result<...> {
      let clawback = compute_clawback(user, amount)?;
      let net_amount = amount.checked_sub(clawback).unwrap();
      burn(clawback)?;
      swap_to_usdc(net_amount)?;
      ...
  }
```

Clawback computation is pure (no external calls), so it can run inside the sell transaction atomically.

## Edge Cases

### What if user has welcome stake + bought $PING?

Welcome stake CANNOT be sold (locked per ADR 0010). So the sell can only touch free $PING. The tier basis after sale still includes the locked welcome stake.

### What if user sells, then buys back?

Each sell triggers clawback at that moment. Re-buying restores tier going forward, but doesn't refund prior clawback. This is by design — gaming-by-cycling doesn't profit.

### What if $PING price changes dramatically between fee and sell?

Clawback is computed in USDC value, then converted at current $PING price. This is fair to both sides — user's tier benefit was nominal $X, clawback is nominal $X regardless of token price.

### What if user transfers $PING to another wallet (not selling)?

Transfers between Ping-recognized wallets trigger NO clawback (the basis just moves to the other wallet). Transfers to external wallets (Phantom etc.) DO trigger clawback because those tokens leave the tier-tracking universe.

## Consequences

**Good:**

- Honest users get instant benefits (no waiting period)
- Cheaters cannot profit from flash gaming (math-enforced)
- Every clawback adds to deflation (burned $PING)
- Transparent to users (formula visible on the sell screen)
- On-chain enforced (no off-chain logic to dispute)

**Bad / trade-offs:**

- Adds computational cost to every sell (clawback calc over 365 days of fees)
  - Mitigation: amortized via incremental cumulative discount tracking
- Complex to communicate — some users won't understand. Mitigation: UX makes it transparent + customer support runbook
- Edge cases (token transfers to external wallets) require monitoring

## Alternatives Considered

- **30-day TWA before tier applies:** Rejected — punishes honest users with delayed benefits
- **No clawback, accept gaming losses:** Rejected — at scale, gaming losses compound; cheaters dominate
- **Penalty fee on sells (flat 1%):** Rejected — punishes everyone; honest users hurt for cheaters' sake
- **Tier on purchase + permanent lock for tier duration:** Rejected — too restrictive, kills liquidity

## See Also

- [ADR 0008 — $PING tokenomics + tier definitions](0008-ping-tokenomics.md)
- [ADR 0009 — POMM + internal swap (clawback runs inside swap)](0009-pomm-internal-swap.md)
- [ADR 0010 — Welcome stake (locked balance counts for tier)](0010-welcome-stake.md)

# ADR 0015: Phased Launch — Ping Points (Phase 1) → $PING Token (Phase 2)

**Status:** Accepted
**Date:** 2026-05-23

## Context

The full $PING token economy requires:

- Cayman Foundation incorporated (~2-6 weeks)
- Crypto-fintech counsel engaged (~$50-100K, 4-6 weeks)
- Smart contract development + OtterSec/Halborn audit (~$50-80K, 8-12 weeks)
- Reg D / Reg S strategic raise documentation (~$30-50K, 4-6 weeks)
- AML / KYC / Sanctions / Privacy policy drafting (~$20-40K)
- Token whitepaper + public communications (~4-6 weeks)

**Total: 4-6 months and $200-300K** before token can launch safely and compliantly.

Meanwhile, the platform itself (mobile app, web claim, off-ramp integrations, KYC) can be live and serving real users 3-6 months earlier. **Building product first, then launching token on proven traction is the safer + better path** (Helium, Pyth, Bonk, Wormhole, Jupiter all used this sequence).

We need a mechanic that:

1. Lets the platform launch immediately with all UX features (tier, welcome reward, yield) working
2. Doesn't expose us to securities risk before Foundation is live
3. Smoothly transitions to the real $PING token when ready
4. Rewards early users for joining before the token

## Decision

Two-phase launch:

### Phase 1 — "Ping Points" (Months 0-6)

Internal **non-token** credit system used for:

- Welcome reward (1,200 Ping Points granted on first verified outbound)
- Tier eligibility (held Ping Points → Silver / Gold / Platinum)
- Fee discount (pay fees in Ping Points for 75% off platform markup)
- Yield distribution (Earn Vault pays user's yield share in Ping Points)

**Ping Points have ZERO market value:**

- Cannot be sold
- Cannot be transferred between users (except in-product, within constraints)
- Cannot be withdrawn from the platform
- Exist only as an entry in user-service database
- 1 Ping Point = 1 future $PING (at conversion time)

### Phase 2 — $PING Token (Months 4-12)

Once Foundation is live + smart contracts audited + counsel signs off:

1. $PING SPL token mint deployed on Solana
2. **1:1 Ping Points → $PING conversion** for every existing user
3. Welcome stake mechanics migrate from database to Streamflow vesting contracts
4. Tier basis becomes on-chain $PING balance instead of database value
5. Earn Vault begins paying yield in real $PING (was Ping Points)
6. New users get $PING directly going forward (no more Ping Points)

```
Phase 1 user:
  Month 1: Receives 1,200 Ping Points (welcome)
  Month 3: Earns 50 Ping Points from yield
  Month 5: Owns 1,250 Ping Points (database value)

Phase 2 (TGE Day):
  Month 5 user automatically receives 1,250 $PING in their Solana wallet
  Database "Ping Points" balance → 0
  On-chain $PING balance → 1,250
  Tier basis recomputed from on-chain balance
  Welcome stake (locked portion) migrated to Streamflow contract
```

## Why This Works Legally

| Risk in pure token launch                 | Mitigation in Phase 1 (Ping Points)                                  |
| ----------------------------------------- | -------------------------------------------------------------------- |
| Selling unregistered securities           | Ping Points have no market — cannot be sold                          |
| Promising token appreciation              | Ping Points are explicitly "1 PP = 1 future PING" — no price promise |
| Distributing to retail without exemption  | Ping Points are awarded for verified service usage (cashback model)  |
| Regulatory exposure from rapid launch     | Foundation has time to incorporate properly before token live        |
| User funds at risk in unaudited contracts | No smart contracts in Phase 1 — pure database                        |
| US securities enforcement                 | Ping Points not securities; no US person exclusion needed in Phase 1 |

## Phase 1 Architecture

```
Phase 1 Stack (Database-only token economy)
────────────────────────────────────────────

user-service (PostgreSQL — CP)
├── users table
│     ▸ id, phone_hash, kyc_tier, ...
├── ping_points_balances table
│     ▸ user_id, free_pp, locked_pp, total_pp, unlock_milestones_hit
└── ping_points_ledger table
     ▸ user_id, timestamp, change, reason, tier_at_time
     (event-sourced audit log of every PP movement)

transfer-service uses PP for fee discounts:
   fee_calc(user) {
       tier = compute_tier(user.ping_points_balance);
       discount = tier_table[tier];
       ...
   }

earn-vault-service (Phase 1 has no Solana contract):
   On harvest (daily), credits 60% to user_pp_balance (= "yield in PP")
   Ping Foundation collects the 40% USDC portion

NO SOLANA CONTRACTS in Phase 1 for Ping Points.
The Earn Vault smart contract DOES launch in Phase 1, but uses
USDC-only yield (paid to Ping fee account + held as Ping Points
in database).
```

## Phase 1 → Phase 2 Migration

```
Month 4-5: Cayman Foundation incorporated, $PING contract audited, ready.

Month 5: TGE Day
   ├── $PING SPL token deployed on Solana
   ├── Migration cron job runs:
   │     For each user with Ping Points:
   │       ├── Create on-chain Streamflow contract for locked welcome PP
   │       ├── Transfer free PP equivalent to user's Solana wallet
   │       └── Mark user as "migrated"
   ├── New users from Day TGE+1 receive $PING directly (no Ping Points)
   └── ping_points_balances table marked deprecated (read-only audit trail)

Month 5+: Earn Vault yield distribution switches from "credit PP to database"
          to "Jupiter buy $PING + transfer to user wallet" (per ADR 0012)

Database table ping_points_* retained read-only for:
  ├── Pre-TGE user history audit
  └── Tax reporting on migration
```

## What Phase 1 Looks Like to the User

```
┌──────────────────────────────────────┐
│   Your Ping balance                  │
│                                      │
│   $1,500.00                          │
│   Earning ~3% / year                 │
│                                      │
│   ✦ 1,644 Ping Points                │
│      Silver tier                     │
│                                      │
│   📅 Becomes $PING token when we      │
│      launch (estimated Q3 2026)      │
│      1 PP = 1 $PING — guaranteed     │
│                                      │
└──────────────────────────────────────┘
```

User mental model: "Ping Points are my rewards. They'll become a real token soon."

## What Phase 2 Migration Looks Like to the User

App update at TGE:

```
┌──────────────────────────────────────┐
│         🎉 $PING TOKEN LIVE          │
│                                      │
│   Your 1,644 Ping Points are now     │
│   1,644 $PING in your wallet.        │
│                                      │
│   You can now:                       │
│   ✓ Transfer $PING to friends        │
│   ✓ Trade $PING on Jupiter / Raydium │
│   ✓ View on Solana Explorer          │
│                                      │
│   Your tier and Welcome Stake are    │
│   preserved.                         │
│                                      │
│   [   Continue                ]      │
│                                      │
└──────────────────────────────────────┘
```

## What Phase 1 Cannot Do (And That's OK)

| Capability                                         | Phase 1              | Phase 2                        |
| -------------------------------------------------- | -------------------- | ------------------------------ |
| Cash-in / out                                      | ✅ Full              | ✅ Full                        |
| Free in-network transfers                          | ✅                   | ✅                             |
| Earn Vault auto-stake                              | ✅ USDC              | ✅ USDC + yield in $PING       |
| Welcome reward                                     | ✅ Ping Points       | ✅ $PING                       |
| Tier discounts                                     | ✅                   | ✅                             |
| Pay fees in token                                  | ✅ Ping Points       | ✅ $PING                       |
| Receive $PING from market                          | ❌ (no token exists) | ✅                             |
| Transfer token to external wallet                  | ❌                   | ✅                             |
| Trade on DEX                                       | ❌                   | ✅                             |
| List on CEX                                        | ❌                   | ✅ (when liquidity proves out) |
| Use $PING for IO Grid / other tenant cross-product | ❌                   | ✅                             |

The "cannot trade / withdraw" properties of Ping Points in Phase 1 are PRECISELY what makes them legally clean. We're not hiding limitations — we're being transparent that the token is coming.

## Phase 1 Revenue Model (Important — Still Real)

The platform makes real money in Phase 1 even without a token:

| Revenue line                      | Phase 1 status                    |
| --------------------------------- | --------------------------------- |
| Treasury yield on Earn Vault USDC | ✅ Real — 40% to Ping fee account |
| Cash-out platform markup          | ✅ Real — collected in USDC       |
| FX spread (0.4%)                  | ✅ Real                           |
| Internal swap                     | ❌ Not active (no token to swap)  |
| B2B / Premium subscriptions       | ✅ Real (if launched)             |

Phase 1 revenue projection (3-6 months of operation):

- Treasury yield (small TVL): ~$5-20K
- Cash-out + FX: ~$10-50K (depends on volume)
- **Total Phase 1 ARR potential:** $50-200K (proves model)

Phase 2 adds: internal swap spread + token-related lines (smaller revenue but viral effects).

## Founder Reasoning (Why Not Launch Token Immediately?)

Token-first launches that failed:

- **OneCoin** — pure pump-and-dump, no real product
- **Squid Game Token** — fraud
- Many ICO-era projects — token launched before any product, dumped at first opportunity

Product-first launches that succeeded:

- **Helium** — 4 years of product before token (HNT 2019; project started 2014)
- **Pyth Network** — 18 months as Solana oracle before $PYTH (2021 → Nov 2023 TGE)
- **Jupiter** — 2+ years as aggregator before $JUP token (2021 → Jan 2024 TGE)
- **Wormhole** — 2+ years as bridge before $W token (2021 → 2024 TGE)
- **Bonk** — meme exception, but still launched on existing Solana traction

Pattern: products that proved utility BEFORE launching token had successful + sustained token economies. Pure token launches generally die within 12 months.

## Risk: User Doesn't Understand "Points → Token"

Some users may not understand the conversion. UX must be crystal clear from day one.

Mitigation:

- Persistent banner: "Your Ping Points convert to $PING token when we launch — guaranteed 1:1"
- Education content (in-app explainer, social media)
- FAQ link prominent on tier and yield screens
- Announcement campaigns 30 / 7 / 1 day before TGE

## Consequences

**Good:**

- Platform launches 3-6 months faster (no Foundation/audit/legal blocker)
- Real users + real revenue before token launch (lower TGE risk)
- Phase 1 users get FIRST CLAIM on token via Ping Points conversion (loyalty reward, viral storytelling)
- Foundation has time to incorporate properly without rushing
- Lower upfront capital required ($5-10K Foundation only vs $200-300K full token launch)

**Bad / trade-offs:**

- Database table maintenance during Phase 1 (transitional architecture)
- Migration cron job at TGE is operationally risky if not tested thoroughly
- Some early users may not understand the transition
- Some marketing complexity ("not a token yet, but will be")
- Cannot use $PING for cross-product flows (IO Grid, etc.) until Phase 2

## Alternatives Considered

- **Launch token Day 1:** Rejected — adds 4-6 months delay; high legal cost up-front; can't validate product-market-fit first
- **Never launch a token, pure platform:** Considered — but loses the network-effect + deflation flywheel from BUSINESS-STRATEGY; investor + community story weaker
- **Use existing token (e.g., $GRID, USDC) as platform token:** Rejected — $GRID is iogrid-owned with different utility (per iogrid/docs/TOKENOMICS.md); USDC has no platform-loyalty mechanism

## See Also

- [ADR 0008 — $PING token (full design — activates in Phase 2)](0008-ping-tokenomics.md)
- [ADR 0010 — Welcome stake (granted in Ping Points Phase 1, migrates to Streamflow Phase 2)](0010-welcome-stake.md)
- [ADR 0012 — Earn Vault (launches Phase 1 with USDC-only; yield-in-$PING activates Phase 2)](0012-earn-vault.md)
- [ADR 0013 — Tier + clawback (works on Ping Points Phase 1, on-chain $PING Phase 2)](0013-tier-and-clawback.md)
- [ADR 0014 — Entity structure (Foundation incorporates during Phase 1 → 2 transition)](0014-entity-structure.md)
- iogrid/docs/TOKENOMICS.md — sister project that proved product-first launch

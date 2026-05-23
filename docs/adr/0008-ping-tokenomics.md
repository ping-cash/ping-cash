# ADR 0008: $PING Utility Token Design

**Status:** Accepted
**Date:** 2026-05-23

## Context

Ping operates a remittance + savings platform. To capture network-effect value and create a viral loyalty mechanism without inflated fees, we issue a utility token (`$PING`) that:

1. Gives users tier-based discounts on platform fees
2. Burns continuously to create deflationary supply pressure
3. Acts as the unification token for all platform benefits (welcome rewards, yield payouts, fee payments)
4. Is legally defensible as a utility token (not a security)

The design draws on the same playbook iogrid uses for `$GRID` (see `iogrid/docs/TOKENOMICS.md`) but specialized for Ping's consumer-fintech use case. Per that same document, `$PING` and `$GRID` are explicitly **separate tokens, separate Foundations, separate utility — never merged.**

## Decision

Issue `$PING` as an SPL Token-2022 on Solana with the following parameters.

### Headline parameters

| Parameter        | Value                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Symbol           | `$PING`                                                                                  |
| Network          | Solana (SPL Token-2022 with transfer hooks)                                              |
| Initial supply   | 1,000,000,000 (1B)                                                                       |
| Decimals         | 9 (Solana SPL standard)                                                                  |
| Issuer           | Ping Foundation (Cayman — see [ADR 0014](0014-entity-structure.md))                      |
| Treasury custody | Squads Protocol 3-of-5 multisig                                                          |
| TGE timing       | Phase 2 launch (Month 4-12) — see [ADR 0015](0015-phased-launch-ping-points-to-token.md) |

### Distribution (locked at TGE)

```
40% — Activity-earned community pool      ──── 400M $PING
       NOT a blanket airdrop. Earned per verified usage:
       - Welcome stake granted on first verified outbound transfer (1,200 PING)
       - Future growth incentives (referral bonuses, milestones)
       - 4-year emission schedule, halving curve

15% — B2B integration grants               ──── 150M $PING
       Companies embedding Ping for payroll/disbursement
       White-label partners
       4-year vest per grant

15% — Team                                 ──── 150M $PING
       4-year vest, 1-year cliff

10% — Treasury / governance                ──── 100M $PING
       Squads 3-of-5 multisig
       Max 1% sold per quarter (anti-rug, on-chain timelock)

10% — Strategic investors (Reg D / Reg S)  ──── 100M $PING
       12-month cliff, 24-month linear vest

 5% — Foundation reserve (perma-locked)    ────  50M $PING
       10-year Streamflow vest, then governance vote required

 5% — Initial DEX liquidity (Raydium CLMM) ────  50M $PING
       Paired with $250K USDC at TGE
       Range $0.05 – $5.00
       LP locked 4 years via Streamflow, then permanent burn
```

### Emission schedule (halving)

| Year | New emission to community pool        | Cumulative supply (of 1B cap) |
| ---- | ------------------------------------- | ----------------------------- |
| 1    | 200M (early-adopter activity bonuses) | 200M                          |
| 2    | 100M (halving)                        | 300M                          |
| 3    | 50M                                   | 350M                          |
| 4    | 25M                                   | 375M                          |
| 5    | 12.5M                                 | 387.5M                        |
| 5+   | 0 — only burns reduce supply          | converging downward           |

Total community-pool emission cap: 400M (40% of supply).

Hard-coded in the emission program. No governance can override.

## Tier System

### Tier thresholds (held $PING balance — TWA mechanic per ADR 0013)

| Tier         | Min held $PING | Platform-markup discount                            |
| ------------ | -------------- | --------------------------------------------------- |
| **Bronze**   | 0              | 0%                                                  |
| **Silver**   | ≥ 1,000        | 50% off                                             |
| **Gold**     | ≥ 10,000       | 75% off                                             |
| **Platinum** | ≥ 100,000      | 90% off (floor at provider cost — never goes below) |

### Pay-in-PING further discount

When paying fees, user can elect to pay the platform-markup portion in `$PING` (the provider-cost portion is always USDC pass-through). This adds an additional **75% off the tier-discounted markup**. The $PING used is **burned** to the well-known burn address `1nc1nerator1111...`.

### Tier behaviour

- **Instant on buy:** acquiring $PING upgrades tier immediately. No waiting period.
- **365-day clawback on sell:** see [ADR 0013](0013-tier-and-clawback.md) — sells trigger a fair-tier reconciliation across the last 365 days of fee benefits.
- **Welcome stake counts:** the locked welcome stake balance counts toward tier even while it's locked (per [ADR 0010](0010-welcome-stake.md)).

## Five-Layer Deflation Stack

| Layer                             | Mechanism                                                                                                                                      | Burn destination                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **1. Revenue buyback-burn**       | 5% of ALL platform revenue (fees + FX spread + treasury yield + B2B) → daily Jupiter swap → burn                                               | `1nc1nerator1111...`                                               |
| **2. Fee-payment burn**           | 100% of $PING used to pay platform fees                                                                                                        | Immediate burn                                                     |
| **3. Treasury-yield buyback**     | 10% of daily Earn Vault yield (40% portion that's Ping's) → Jupiter buy $PING → 50% burned, 50% to Foundation Stability Reserve (10y locked)   | Half burned, half reserved                                         |
| **4. Early-unstake penalty burn** | 50% of any $PING unstaked from purchased Fee Vault before maturity (welcome stake has NO early unlock — see [ADR 0010](0010-welcome-stake.md)) | `1nc1nerator1111...`                                               |
| **5. Hard supply cap + halving**  | 1B max supply, halving every 2 years, zero emissions after Y5                                                                                  | (prevents inflation; enforces deflation as community pool empties) |

## Yield Payout in $PING (Unification)

Per [ADR 0012](0012-earn-vault.md), the Earn Vault pays user yield in `$PING` (not USDC):

```
Vault earns yield in USDC from DeFi (Kamino, Marginfi, Aave, Drift)
              ▼
40% USDC → Ping fee account (Squads multisig)
60% USDC → Jupiter market-buy $PING → distributed to depositors

Effect: continuous on-chain buy pressure on $PING from platform growth.
```

This is the "bottom pressure" mechanism: every dollar of user yield converts to a dollar of $PING bought from the open market.

## Legal Mitigations (Required Before TGE)

Per the same playbook as $GRID:

1. **Geographic restrictions at launch.** No sales / airdrops / welcome stakes to US persons. Geo-block US IPs from the token-claim flow. (Welcome stakes themselves are activity-earned, not free distributions, but US persons are still excluded.)
2. **Token utility primacy in marketing.** Brand $PING as the network's unit of fee + discount + tier. Never marketing-promise price appreciation.
3. **Foundation structure.** Cayman Foundation (per [ADR 0014](0014-entity-structure.md)) holds treasury and governs the protocol.
4. **Liechtenstein TVTG token-issuance license OR EU MiCA registration** for European market — chosen at TGE based on cost.
5. **Reg D / Reg S exempt offering** for any pre-TGE strategic raise.
6. **Counsel.** Top-tier crypto lawyer for token legal opinion ($25-75K), Foundation structuring ($30-80K), provider ToS amended for token economics ($10-20K).
7. **No "earn yield by holding" language.** Yield comes from USDC staking, paid in $PING, but never "stake $PING to earn $PING."
8. **Whitepaper** published pre-TGE with clear utility narrative + risk factors.

## Cross-References

- $PING is NOT merged with $GRID; see `iogrid/docs/TOKENOMICS.md` § "$GRID vs $CASH — token positioning" (note: that doc references the pre-rebrand name "$CASH"; the substance applies to $PING)
- [ADR 0009](0009-pomm-internal-swap.md) — POMM keeps $PING price stable within ±15% band
- [ADR 0010](0010-welcome-stake.md) — Welcome stake mechanic
- [ADR 0012](0012-earn-vault.md) — Yield denominated in $PING
- [ADR 0013](0013-tier-and-clawback.md) — Tier instant-on-buy + 365-day clawback
- [ADR 0014](0014-entity-structure.md) — Cayman Foundation issues $PING
- [ADR 0015](0015-phased-launch-ping-points-to-token.md) — Pre-token "Ping Points" + Phase-2 conversion

## Consequences

**Good:**

- One token, one mental model — users see $PING for everything (welcome reward + yield + tier + fee payment)
- Mechanical buy pressure (Layer 3 treasury-yield buyback) creates predictable price floor
- 5-layer deflation aligns long-term holders' interests with platform growth
- Standard SPL Token-2022 = compatible with all Solana wallets + DEXes from day one

**Bad / trade-offs:**

- Launch requires $200-300K legal + audit spend (Foundation + OtterSec + counsel)
- 4-month TGE timeline post-Foundation incorporation
- Token-price volatility risk (mitigated by POMM, [ADR 0009](0009-pomm-internal-swap.md))
- Geo-blocking US persons reduces TAM but is non-negotiable for legal safety

## Alternatives Considered

- **No token, fee-discount based on USDC held:** Rejected — no buy pressure, no viral hook, no network-effect amplifier
- **Stake $PING to earn $PING (yield from holding):** Rejected — clearly a security under Howey
- **Fork an existing token:** Rejected — economics don't align (BNB / OKB are exchange-utility tokens, not remittance-aligned)
- **Re-brand $GRID as cross-product token:** Explicitly rejected per `iogrid/docs/TOKENOMICS.md` — separate Foundations, separate utility, no merger

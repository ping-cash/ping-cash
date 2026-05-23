# ADR 0010: Welcome Stake — Locked + Conditional Unlock via Gamification

**Status:** Accepted
**Date:** 2026-05-23

## Context

New users need an initial "wow" moment with `$PING` to feel like token-holders and engage with the tier system. But three failure modes must be prevented:

1. **Sybil farming** — fake accounts harvesting free $PING and consolidating
2. **Dump-and-leave** — real users receiving the grant, selling immediately for ~$15 cash, never returning
3. **No engagement incentive** — if the grant is too generous, users have no reason to buy more $PING and the gamification flywheel doesn't start

Founder rejected (correctly) the original "1,500 PING unlocked" design because at any reasonable $PING price, the grant becomes immediately sellable cash. The early-unlock penalty mechanism wasn't enough — cheaters still profited.

## Decision

Welcome stake is **1,200 $PING granted on first verified outbound transfer of ≥ $10**, structured as:

```
1,200 $PING TOTAL
├── 200 $PING — UNLOCKED FEE BUCKET
│     ▸ Spendable on platform fees from day 1
│     ▸ Burns down naturally as the user transacts
│     ▸ Visible in the wallet as "Welcome credit — 200 $PING"
│
└── 1,000 $PING — LOCKED RESERVE
      ▸ Counts toward tier from day 1 (so total 1,200 = Silver instantly)
      ▸ NOT spendable on fees, NOT transferable, NOT swappable
      ▸ NO EARLY UNLOCK — this is a gift, not the user's money
      ▸ Unlocks via gamification milestones (see below) or 2-year backstop
```

### Conditional unlock milestones (gamification)

Each milestone unlocks **200 $PING** of the locked reserve into the user's free balance:

| Milestone                                                               | Reward             | Why                       |
| ----------------------------------------------------------------------- | ------------------ | ------------------------- |
| Refer 3 active users (each completes ≥ 3 outbound transfers in 30 days) | 200 $PING unlocked | Drives viral acquisition  |
| Complete 50 successful outbound transfers                               | 200 $PING unlocked | Rewards platform usage    |
| 6 months of active usage (≥ 1 transfer/month)                           | 200 $PING unlocked | Retention reward          |
| 12 months of active usage                                               | 200 $PING unlocked | Long-term retention       |
| Reach Silver organically (own ≥ 1,000 $PING outside of welcome stake)   | 200 $PING unlocked | Rewards real $PING buyers |

Total: 5 milestones × 200 = 1,000 $PING potentially unlockable. Any milestones not achieved by year 2 unlock automatically at the 2-year backstop.

### Backstop

After 2 years from grant, **any remaining locked $PING unlocks automatically.** This prevents perpetual lock-up of grant tokens regardless of user activity.

## Mechanics

```
Day 0 — Maria registers, no $PING yet

Day 1 — Maria sends $10 to her cousin (first verified outbound)
        ├── Smart contract grants 1,200 $PING:
        │     ▸ 200 $PING → Maria's free balance (fee-only spend)
        │     ▸ 1,000 $PING → Streamflow contract (locked, 2y backstop)
        ├── Tier: instantly Silver (1,200 ≥ 1,000)
        └── Fees nearly free for her first ~30 transfers (welcome credit + Silver)

Day 30 — Welcome credit depleted (~10 PING/transfer × 30 transfers = 300 burned)
         Wait — only 200 was unlocked. So after ~20 transfers, fee bucket empty.
         She now sees: "Top up to keep Silver fees, or buy 8,800 more for Gold."

Day 90 — She's referred her sister, who completed 3 transfers.
         Milestone unlocked: 200 $PING moves from locked → free.

Day 180 — Active 6 months, milestone unlock: another 200 $PING.

Day 730 (2 years) — Whatever remains locked (e.g., she didn't refer anyone)
                    auto-unlocks to free balance.
```

## Anti-Sybil Defense (Mathematical, Not Artificial)

```
Sybil cost to set up:
  ├── Phone number with OTP:    ~$1-5 (real SIM)
  ├── KYC tier 1 (Persona):     ~$1-3 (real selfie + ID)
  ├── First $10 outbound send:  $10 + transfer cost
  └── Total cost:                ~$15-20 per fake account

Welcome stake value to a Sybil:
  ├── 200 unlocked PING:        Can be used for fees only (no cash extraction)
  ├── 1,000 locked PING:        Cannot be extracted, period
  ├── Cash extracted:           $0
  └── Net: Sybil PAYS $15-20 and gets NOTHING extractable.

The defense is mathematical, not arbitrary. We don't need "non-transferable"
flags or "minimum balance" rules — the welcome stake structurally cannot be
extracted as cash.
```

Note: the 200 unlocked PING is spendable on fees, which means a Sybil COULD spend their own real money sending transfers, paying the (discounted) fees from their welcome bucket. But this requires them to send real money, and the fee savings (at most ~$20-40 over the bucket's lifetime) are less than the Sybil setup cost.

## Consolidation Defense

A common attack: many Sybils, each gets welcome stake, all send to one master account.

```
Sybil 1 gets 1,200 PING — locked, fee-only. Cannot transfer.
Sybil 2 gets 1,200 PING — same restrictions.
...
Master account: receives nothing (Sybils can't send their welcome stake).
```

Because the locked reserve is non-transferable AND the unlocked bucket is fee-only, consolidation gains the attacker zero extractable value.

The only remaining attack vector — flash-buying $PING to game tier discounts — is handled by [ADR 0013](0013-tier-and-clawback.md) (365-day clawback at sell).

## Tier Calculation with Welcome Stake

Per [ADR 0013](0013-tier-and-clawback.md), the tier is based on **held + locked** $PING. Both the 200 unlocked + 1,000 locked count toward tier eligibility.

```
Day 1:    Maria's tier basis = 200 (free) + 1,000 (locked) = 1,200 → Silver ✓
Day 30:   After ~20 fee burns of 10 each, unlocked depleted to ~0
          Tier basis = 0 (free) + 1,000 (locked) = 1,000 → Silver edge
          UX shows: "Buy more $PING to maintain Silver"
```

When she buys her first 100 PING for fees:

- Free balance: 100 → +100 to tier basis = 1,100 → comfortably Silver
- Burning a fee of 10 → free goes to 90, tier basis 1,090 → still Silver
- This is the "spiral of bottom pressure": every fee paid in $PING is burned, depleting her balance, driving her to buy more.

## Implementation Details

### Smart contracts

```
WelcomeStake program (Solana, Anchor)
├── grant() — called by transfer-service after first verified outbound ≥ $10
│              transfers 200 PING to user free + 1,000 PING into Streamflow
├── unlock_milestone() — called by gamification service when milestone hit
│              transfers 200 PING from Streamflow to user free
└── claim_backstop() — claimable by user after 2y from grant
                       transfers all remaining locked PING to user free
```

### Backend services

- `transfer-service` — detects first qualifying outbound, calls grant()
- `user-service` — tracks milestone progress per user
- `gamification-service` (new) — monitors milestone conditions, calls unlock_milestone() when triggered
- `notify-service` — sends "Milestone unlocked!" push/SMS notifications

### Anti-fraud monitoring

- Velocity limits on welcome-stake grants per IP / device fingerprint
- KYC Tier 1+ required (real phone OTP + Persona selfie + ID for granting)
- Chainalysis screening on the receiving wallet address
- ML fraud scoring on the first transfer pattern (geographic anomalies, unusual amounts)

## Why "1,200" Specifically?

```
Silver threshold: 1,000 $PING

Welcome stake:    1,200 $PING (200 above Silver)
                  ▸ Generous enough to feel meaningful + give immediate Silver
                  ▸ But the 200 unlocked depletes fast → creates buy urgency
                  ▸ The 1,000 locked is exactly at Silver threshold
                  ▸ As locked is gradually unlocked via milestones, balance
                    only grows — never threatens the tier

If we'd picked 1,500:    Too generous; bucket lasts 10× longer; no urgency
If we'd picked 1,000:    No buffer above Silver; tier breaks fast
If we'd picked  800:     Doesn't reach Silver at all; tier broken from start
```

1,200 is the minimum value that hits all three goals: immediate Silver, fast urgency, no immediate tier-break.

## Consequences

**Good:**

- Sybil farming structurally impossible (nothing extractable)
- Dump-and-leave structurally impossible (locked + fee-only)
- Strong gamification: 5 milestones drive referrals, usage, retention
- Tier flywheel starts on Day 1 (instant Silver)
- Welcome bucket depletion creates natural CTA to buy more $PING

**Bad / trade-offs:**

- 5 milestones add complexity to gamification-service (manageable)
- Some users will never complete milestones; their locked PING sits dormant for 2 years (acceptable — eventually unlocks)
- Storage cost: per-user Streamflow vesting contracts cost ~$0.20 in Solana account rent. Mitigation: rent reclaimed when stake fully unlocks.

## Alternatives Considered

- **Free 1,500 PING airdrop (original proposal):** Rejected — users dump immediately for cash, no retention value
- **Non-token "Fee Credit" voucher (interim proposal):** Rejected — eliminated gamification + tier feel
- **Locked 2y with 50% early-unlock penalty:** Rejected — at any penalty < 100% the cheaters still profit
- **Conditional unlock with NO backstop:** Rejected — feels unfair if user becomes inactive due to life events
- **2,400 $PING (= immediate Gold):** Rejected — too generous; depletion takes years; no urgency

## See Also

- [ADR 0008 — $PING tokenomics](0008-ping-tokenomics.md)
- [ADR 0013 — Tier mechanics + 365-day clawback](0013-tier-and-clawback.md)
- [ADR 0015 — Phased launch (Welcome stake = Ping Points in Phase 1)](0015-phased-launch-ping-points-to-token.md)

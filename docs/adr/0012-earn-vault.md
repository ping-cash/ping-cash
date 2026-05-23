# ADR 0012: Earn Vault — Auto-Stake with $PING-Denominated Yield

**Status:** Accepted
**Date:** 2026-05-23

## Context

Per BUSINESS-STRATEGY.md, treasury yield is Ping's largest projected revenue line (45%). But [ADR 0004 — Privy MPC Wallets](0004-privy-mpc-wallets.md) commits to non-custodial wallets, which means user USDC sits in the user's own wallet — Ping cannot deploy it to yield-bearing instruments.

We need to capture treasury yield revenue **without becoming custodial.** The solution is a non-custodial DeFi vault smart contract that users delegate authority to, with on-chain-enforced split between user and platform.

This is the same pattern used by Marinade (mSOL), Lido (stETH), Jito (JitoSOL) — non-custodial yield aggregators with billions in TVL on Solana.

## Decision

Build the **Ping Earn Vault** — an open-source Anchor program on Solana that:

1. Accepts USDC deposits from users (auto-stake on receipt by default)
2. Deploys aggregated deposits across multiple Solana DeFi protocols
3. Harvests yield daily and atomically splits it 40/60 (Ping/user)
4. Pays user yield in `$PING` (market-bought via Jupiter)
5. Users keep custody — they can revoke delegated authority and withdraw anytime

## Mechanics

### Auto-stake (default behaviour)

At first wallet setup, user signs **one delegated-authority transaction** approving the Earn Vault contract to:

- Stake USDC from their wallet to the vault PDA
- Unstake USDC from the vault back to their wallet
- (Scope limited to USDC token account; no other token authority)

User can revoke this delegation at any time with one transaction.

```
User wallet receives 500 USDC
         ▼
Auto-stake trigger (background): wallet-service watches user's USDC account
         ▼
Vault.stake() called via delegated authority:
  ├── 500 USDC moved from user wallet → Vault user-deposits PDA
  ├── 500 vUSDC minted into user wallet (1:1 receipt token)
  └── Internal accounting updated: user shares vault pro-rata
         ▼
Vault.deployToYield() (separate, batched hourly):
  Aggregated vault USDC routed across:
    ├── Kamino Lend (USDC):       40% target weight
    ├── Marginfi (USDC):          25% target weight
    ├── Aave Solana (USDC):       20% target weight
    ├── Drift (USDC):             10% target weight
    └── Liquid buffer (idle):      5% (for instant redemptions)
```

### Atomic spend (unstake + transfer in one tx)

When user wants to send USDC, the wallet UI constructs an **atomic Solana transaction** with multiple instructions:

```
Solana transaction (atomic):
  Instruction 1: Vault.unstake(amount) → user wallet
  Instruction 2: Transfer(amount) → recipient
  Instruction 3: (if leftover) Vault.stake(remainder) → vault

If ANY instruction fails, the entire tx reverts. User sees an error, never a half-completed state.

Latency: ~1 second total (Solana 400ms block × 2-3 confirmations).
```

User experience: tap "Send $400" → 1 second → "Sent ✓". They never see the unstake step.

### Daily Harvest — On-Chain 40/60 Split

Daily, an automated keeper calls `vault.harvest()`:

```rust
pub fn harvest(ctx: Context<Harvest>) -> Result<()> {
    // 1. Withdraw accrued yield from each underlying protocol
    let kamino_yield = withdraw_yield(ctx.kamino, ...)?;
    let marginfi_yield = withdraw_yield(ctx.marginfi, ...)?;
    let aave_yield = withdraw_yield(ctx.aave, ...)?;
    let drift_yield = withdraw_yield(ctx.drift, ...)?;
    let total_yield = kamino_yield + marginfi_yield + aave_yield + drift_yield;

    // 2. SPLIT atomically — code-enforced, not policy
    let ping_split = total_yield.checked_mul(40).unwrap().checked_div(100).unwrap();
    let user_split = total_yield.checked_sub(ping_split).unwrap();

    // 3. Transfer 40% to Ping fee account (HARDCODED address, multisig-controlled)
    token::transfer_checked(
        ctx.accounts.vault_authority,
        ctx.accounts.ping_fee_account,  // ← hardcoded SquadsMultisig PDA
        ping_split,
    )?;

    // 4. Use 60% to buy $PING from market via Jupiter
    let ping_bought = jupiter_swap(user_split, USDC_MINT, PING_MINT)?;

    // 5. Distribute $PING pro-rata to vault depositors
    distribute_pro_rata(ping_bought, &ctx.accounts.depositor_shares)?;

    emit!(HarvestEvent {
        total_yield,
        ping_split,
        user_split,
        ping_bought,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
```

**The 40/60 split is enforced by code, not by policy.** Users can read the contract source on Solana Explorer and verify the math themselves.

### vUSDC Receipt Token

```
Property               vUSDC
─────────────────────────────────────────────────────────
Token program          SPL Token-2022
Mint authority         Vault program PDA
Redeemable for         1 vUSDC = 1 USDC always (1:1)
Transferable           Yes (secondary market possible)
Value appreciation     No (yield paid in $PING separately)
Burn on redeem         Yes (user burns vUSDC, gets USDC)
```

The 1:1 stability is critical — users see "my balance: $X" in the app, never need to understand pricing dynamics. The vault never changes the ratio because all yield is swept out daily (40% to fees, 60% to PING which is paid to depositors).

### Wallet UX (Hides vUSDC Entirely)

The app reads the user's vUSDC balance + free USDC balance + `$PING` and shows a single unified view:

```
┌──────────────────────────────────────┐
│   Your Ping balance                  │
│                                      │
│   $1,500.00                          │
│   Earning ~3% / year                 │
│                                      │
│   ✦ 1,644 $PING                      │
│      Silver tier                     │
│                                      │
└──────────────────────────────────────┘
```

The word "vUSDC" never appears in user-facing UI. Power users can see it via wallet inspector if desired.

## Underlying Protocol Selection

| Protocol          | Type                      | Target weight | Real APY (2026 est) | Liquidity | Risk                                           |
| ----------------- | ------------------------- | ------------- | ------------------- | --------- | ---------------------------------------------- |
| **Kamino Lend**   | USDC lending market       | 40%           | 4.5-5.5%            | Very high | Established, audited (OtterSec)                |
| **Marginfi**      | USDC lending market       | 25%           | 4.5-5.5%            | High      | Established, audited                           |
| **Aave Solana**   | USDC lending (Aave port)  | 20%           | 4.0-5.0%            | High      | Aave protocol mature on EVM, Solana port newer |
| **Drift**         | USDC lending in perps DEX | 10%           | 5.0-6.5%            | Medium    | Higher utilization                             |
| **Liquid buffer** | Idle USDC at vault        | 5%            | 0%                  | Instant   | None — instant redemption                      |

Total blended target APY: ~4.5% real, of which:

- 40% (1.8%) → Ping fee account
- 60% (2.7%) → user paid in $PING (market-bought)

Weights are governed by Squads multisig with 7-day timelock. Initial weights set at launch; rebalances quarterly.

## Risk Management

### Multi-Protocol Risk Distribution

Single-protocol concentration risk eliminated by spreading across 4 venues. No single protocol failure can lose more than 40% of vault TVL.

### Instant-Redemption Guarantee

Vault operates at **100% reserves at all times** (not fractional banking). All underlying protocols (Kamino, Marginfi, Aave, Drift) support instant USDC withdrawal. The 5% liquid buffer covers same-block redemptions before any underlying protocol needs to be tapped.

In extreme stress (mass-withdrawal event):

1. Liquid buffer covers first 5% of redemptions
2. Remaining underlying positions are unwound in 30-second windows
3. Worst-case redemption time: ~5 minutes if all 4 protocols hit simultaneously

### Smart Contract Risk

- **Audit:** OtterSec or Halborn pre-mainnet (~$50-80K, 6-8 weeks)
- **Bug bounty:** Immunefi program, $100K-$500K bounties post-launch
- **Upgrade safety:** 7-day timelock on all parameter changes
- **Insurance:** Nexus Mutual coverage of $1M+ on critical contracts (post-launch)
- **Formal verification:** Critical math (split, distribution) formally verified

### Oracle Risk

USDC price assumed = $1.00 for accounting. Real-time depeg monitoring via Pyth:

- Soft circuit breaker: if Pyth USDC/USD drops below $0.99 for >5 minutes, harvest() pauses; auto-resume when stable
- Hard circuit breaker: if drops below $0.95, all underlying yield positions liquidated to liquid USDC; vault enters "preservation mode"

### MEV Protection

- Daily harvest uses Jupiter's MEV-protected swap mode
- POMM operations also MEV-protected (see [ADR 0009](0009-pomm-internal-swap.md))
- User spending tx uses standard Solana (no MEV exposure on direct transfers)

## Auto-Stake Opt-Out

While the default is 100% auto-stake, power users can adjust via "Power user mode" in app settings:

| Setting                     | Default                        | Override                     |
| --------------------------- | ------------------------------ | ---------------------------- |
| Auto-stake percentage       | 100%                           | Slider 0-100%                |
| Auto-stake on incoming      | ON                             | Toggle per token             |
| Spending source priority    | "Best available" (vault first) | "Wallet only" / "Vault only" |
| Yield denomination          | $PING                          | Switch to USDC               |
| Auto-stake delay on deposit | 0 sec (immediate)              | Delay 1-24 hours             |

99% of users never see these settings. They exist for crypto-natives + developers + integration partners.

## Smart Contract Architecture

```
EarnVault Program (Anchor, Rust)
├── Accounts:
│   ├── VaultConfig (PDA)              # Governance parameters
│   ├── UserDepositsPda (PDA)          # Aggregate USDC + vUSDC supply
│   ├── PingFeeAccount (PDA)           # 40% fee accumulator
│   ├── ProtocolPosition × 4 (PDA)     # State per underlying protocol
│   └── HarvestLog (sliding window)    # Recent harvests on-chain
│
├── Instructions:
│   ├── stake(amount)
│   ├── unstake(amount)
│   ├── harvest()                      # Permissionless, anyone can call (incentive: 0.01% fee)
│   ├── rebalance(weights)             # Squads multisig + 7d timelock
│   ├── set_paused(bool)               # Squads multisig
│   └── upgrade_protocol_adapter()     # Squads multisig + 30d timelock
│
└── Events:
    ├── Stake { user, amount, vUSDC_minted }
    ├── Unstake { user, amount, vUSDC_burned }
    ├── Harvest { yield, ping_split, user_split, ping_bought, ping_distributed }
    └── Pause / Unpause
```

## Public Dashboard

Live at `vault.ping.cash` (post-launch):

- Current vault TVL
- Today's yield harvested
- Distribution: how much to Ping, how much to users
- Historical APY (rolling 30/90/365 day)
- Underlying protocol allocations
- Recent harvest events (on-chain)
- $PING price impact from yield buybacks

## Consequences

**Good:**

- Captures the largest projected revenue line (treasury yield) without becoming custodial
- Creates massive continuous buy pressure on `$PING` (60% of yield = market-bought $PING)
- Tier benefits accrue to users organically over time without them buying $PING explicitly
- Aligns with Solana ecosystem (Marinade / Lido / Jito pattern)
- Open-source, auditable, on-chain enforced — no trust required

**Bad / trade-offs:**

- Smart contract risk (mitigated by audit + insurance + multi-protocol split)
- DeFi protocol risk (mitigated by diversification across 4 venues)
- Daily harvest gas cost (~$0.05-0.20 per harvest, immaterial)
- User onboarding friction: must sign delegated-authority approval at signup (one-time)
- Power-user overrides add complexity to wallet UX (mitigated by hiding behind "Power user mode")

## Alternatives Considered

- **Custodial pool with off-chain ledger:** Rejected by founder — breaks chain-native promise + requires money-transmitter license
- **Pure non-custodial (no vault):** Rejected — loses 45% of projected revenue
- **Single-protocol staking (e.g., just Kamino):** Rejected — concentration risk
- **Yield paid in USDC:** Rejected — defeats the $PING unification + loses the buy-pressure flywheel
- **No auto-stake (manual opt-in only):** Rejected — friction kills adoption; most users will never opt in

## See Also

- [ADR 0004 — Privy MPC wallets (still primary, vault adds yield layer)](0004-privy-mpc-wallets.md)
- [ADR 0008 — $PING tokenomics (yield denominated in $PING)](0008-ping-tokenomics.md)
- [ADR 0009 — POMM (Stability Reserve fed from Ping's 40% portion)](0009-pomm-internal-swap.md)
- [ADR 0017 — Custody model (vault is delegated-authority, not custody)](0017-custody-model.md)
- [ARCHITECTURE.md § Wallet Service](../ARCHITECTURE.md)

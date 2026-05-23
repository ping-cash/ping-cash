# ADR 0017: Custody Model — Non-Custodial Wallets + Delegated-Authority Vault

**Status:** Accepted (Supersedes the brief consideration of an off-chain custodial pool)
**Date:** 2026-05-23

## Context

A custody model decision controls:

- Legal exposure (custodian vs technology platform)
- User trust (self-sovereignty vs convenience trade-off)
- Yield revenue capture (no custody = no float to deploy)
- Operational architecture (database ledger vs on-chain reconciliation)

During architectural design, we briefly considered an **off-chain custodial pool model** (pooled USDC in a single omnibus wallet, off-chain ledger tracks user balances). The founder rejected this categorically:

> "This is rubbish. This is complete against the chain. Users should be able to connect to their wallet at any time, we cannot create an offchain which dilutes the entire logic."

The correct model: **stay fully non-custodial. Yield revenue captured via a non-custodial DeFi vault with delegated authority.**

## Decision

### Default custody: Non-custodial Privy MPC wallet OR external Solana wallet

```
Every Ping user has a Solana wallet they control:
  ├── DEFAULT (most users): Privy MPC wallet (2-of-3 threshold per ADR 0004)
  │     Privy holds 1 shard, user device holds 1, recovery shard encrypted backup
  │     2-of-3 required to sign; Privy alone cannot move funds
  │
  └── ALTERNATIVE (crypto-natives): External wallet (Phantom, Solflare, Backpack)
        User holds the full key directly
        Ping never sees the key

Both options are SUPPORTED and PORTABLE at all times.
Users can disconnect Ping, take their wallet to any Solana app.
```

### Yield capture: Earn Vault smart contract (non-custodial, delegated authority)

Per [ADR 0012](0012-earn-vault.md), the Earn Vault captures yield without taking custody:

```
At signup:
  User signs ONE delegated-authority approval for the Earn Vault contract
  Scope: USDC token account only (cannot touch other assets)

  This authority lets the Earn Vault smart contract:
    ▸ Move user's USDC to the vault PDA (auto-stake)
    ▸ Move USDC back to user wallet (unstake on spend)

  User can REVOKE this approval at any time:
    ▸ One-click in Power User mode
    ▸ One Solana transaction
    ▸ Immediately effective
    ▸ Vault then cannot touch user's USDC at all
```

The user is the LEGAL OWNER of their USDC at all times:

- Their wallet holds vUSDC (receipt token = claim on vault)
- They can redeem vUSDC for USDC at any moment (instant on Solana)
- They can transfer vUSDC to anyone (it's just a token)
- If Ping disappears, the Earn Vault smart contract still works (open-source code), they can still redeem via direct contract interaction

### NO off-chain ledger

We do NOT maintain a database that says "Maria owns $X." That would be custodial.

What we DO maintain:

- An **indexer** that READS on-chain state (Maria's USDC + vUSDC + $PING balances) and presents it in the mobile app UX
- An audit log of transactions (sent for analytics + compliance, not authority)

If the indexer goes down, the user's on-chain balance is unaffected. They can still query Solana directly with a block explorer to see what they own.

### NO fractional reserve

This is NOT a bank.

```
Bank model:                        Ping model:
  Deposits:    $100M                 Vault TVL:    $100M
  Reserves:    $5M (5%)              Reserves:     $100M (100%)
  Loans out:   $95M (illiquid)       Deployed:     $100M (Kamino, Marginfi, Aave, Drift)
  Risk:        Bank run = crisis     Risk:         Mass withdrawal = no problem;
                                                   underlying protocols allow instant redemption
```

Every dollar deposited in the Earn Vault is 100% backed by an equivalent dollar in liquid Solana DeFi positions. We never lend out user money. We never have a "reserve ratio" below 100%.

## Two Compartments at the Smart Contract Level

```
EARN VAULT smart contract
│
├── User-Deposits PDA
│     ▸ Holds ALL aggregated user USDC
│     ▸ Deployed to underlying yield protocols
│     ▸ vUSDC supply == total USDC value (1:1 always)
│     ▸ Users own pro-rata shares via vUSDC holdings
│     ▸ ANYONE can verify aggregate USDC == vUSDC supply on-chain
│
└── Ping-Fee PDA (separate Solana account)
      ▸ Receives 40% of harvested yield
      ▸ Controlled by Squads 3-of-5 multisig
      ▸ Users have ZERO claim on this account (smart contract enforces)
```

These compartments are CODE-ENFORCED. The contract's harvest() function is the only thing that can move money between them. No human (including Ping team) can drain user deposits.

## What "Non-Custodial" Means Specifically

| Property                                                              | Holds for Ping?                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| User holds private key (or shard, with Privy)                         | ✅ Yes                                                    |
| User can withdraw to external wallet anytime                          | ✅ Yes                                                    |
| User can revoke vault delegation anytime                              | ✅ Yes                                                    |
| Smart contracts are open source                                       | ✅ Yes                                                    |
| Smart contracts cannot be unilaterally upgraded (timelock + multisig) | ✅ Yes                                                    |
| Database tracks user balance (rather than chain)                      | ❌ No (and that's the point)                              |
| User must trust Ping to honor their balance                           | ❌ No (chain is the source of truth)                      |
| Ping has access to user funds without their cooperation               | ❌ No (would require 2 of 3 MPC shards, only Privy has 1) |

## What Custodial Would Mean (We Are NOT Doing This)

| Property                                           | Holds for Cash App / Wise / Custodial Crypto Exchange? | Ping? |
| -------------------------------------------------- | ------------------------------------------------------ | ----- |
| Company holds all user keys / pooled wallet        | ✅                                                     | ❌    |
| Off-chain database is source of truth for balances | ✅                                                     | ❌    |
| Company can theoretically freeze withdrawals       | ✅                                                     | ❌    |
| Company needs Money Transmitter License            | ✅                                                     | ❌    |
| User cannot easily migrate to a competitor         | ✅                                                     | ❌    |
| Company can deploy user funds (fractional reserve) | ✅                                                     | ❌    |
| Bank-run risk                                      | ✅                                                     | ❌    |

We accept that this means we LOSE the option of fractional-reserve banking (yes-but per-platform discussion we explicitly do not want to be a bank). We GAIN the ability to operate without a money-transmitter license, which would cost $2-5M and 18-24 months in the US alone.

## Per-Wallet Portability

```
User decides to leave Ping:

Step 1: Open Privy app or Phantom (whichever they use)
Step 2: See full balance in their Solana wallet — USDC + vUSDC + $PING
Step 3: Optionally call Vault.unstake() to convert vUSDC → USDC
Step 4: Transfer all assets to any other Solana wallet
Step 5: Disconnect Ping app (revokes the vault delegation)

Total time: ~3 minutes
Total cost: ~$0.005 in Solana fees
Ping cannot block or delay this.
```

This portability is the core reason for the non-custodial model. **If users cannot leave with their money, they should not put it in.**

## Trade-Offs We Accept

| Cost                                                                                            | Benefit                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Cannot fractionally lend deposits (no bank-style yield from loans)                              | Don't need money-transmitter license; lower legal exposure                                                    |
| Higher Solana network costs (everything on-chain)                                               | True user sovereignty; no bank-run risk                                                                       |
| Cannot freeze funds on demand of authorities (without going through smart contract governance)  | Smart contracts are public; sanctions screening happens at fee-payment / cash-out gates, not at custody level |
| Indexer must work for app UX (but failure doesn't lock funds)                                   | If we shut down, users still have their assets                                                                |
| Privy outage blocks logins for users who don't have backup access (mitigated by recovery shard) | Privy alone cannot move funds                                                                                 |

These are deliberate trade-offs in favor of user sovereignty over operational convenience.

## Sanctions / AML / Compliance

Even with non-custodial wallets, Ping enforces compliance at gates:

| Gate                                           | What happens                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Sign-up                                        | KYC Tier 1 required to use Ping app (phone OTP via Twilio Verify)       |
| Cash-in via fiat rails (Stripe, Lean, Tarabut) | Provider's own KYC/AML applies + Ping's screening on receiving wallet   |
| Cash-out via TransFi / Wise / etc.             | Provider's KYC/AML + Chainalysis sanctions screening on outgoing wallet |
| Internal swap                                  | Chainalysis screening                                                   |
| Earn Vault deposit / withdrawal                | No additional screening (DeFi semantics)                                |

Crucial: we don't custody, so we don't have authority to freeze. We have authority to BLOCK service. If a sanctioned wallet tries to use Ping:

- KYC fails → no welcome stake, no tier, no fee discounts
- Cash-out fails → cannot exit Ping's licensed off-ramp partners
- The wallet still holds its USDC; we just don't service it further

This is the same model as Coinbase / Binance — they don't freeze your blockchain assets (they can't); they restrict service access.

## Insurance + Audit Posture

Since users self-custody, the threat model focuses on the smart contracts (where pooled funds sit):

| Risk                                                             | Mitigation                                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Vault contract exploit                                           | OtterSec/Halborn audit pre-mainnet + Immunefi bug bounty + Nexus Mutual coverage |
| Underlying DeFi protocol exploit (Kamino, Marginfi, Aave, Drift) | Multi-protocol diversification (max 40% in any single venue)                     |
| Privy MPC compromise                                             | 2-of-3 means Privy + user collusion needed; Privy is SOC 2 + AICPA audited       |
| User loses device + recovery shard                               | Privy has account-recovery flow; external wallet users use seed phrase backups   |

We do NOT insure individual user wallets — that's their responsibility. We DO insure the Earn Vault smart contract (~$1M Nexus Mutual coverage post-launch).

## Consequences

**Good:**

- Maximum user sovereignty (the founder's core requirement)
- No money-transmitter license needed at launch
- No off-chain ledger → simpler architecture
- 100% reserves at all times → no bank-run risk
- Provable on-chain integrity (anyone can audit aggregate USDC == vUSDC supply)
- Lower trust burden on users (they don't have to trust us with their money)

**Bad / trade-offs:**

- Lose fractional-reserve banking option
- Privy/Phantom dependency for wallet access (mitigated by multi-option)
- Cannot freeze funds for legal compliance (mitigated by gate-based service restrictions)
- Operational overhead of on-chain reconciliation vs database simplicity

## Alternatives Considered

- **Off-chain custodial pool** — Explicitly rejected by founder
- **Hybrid (custodial spendable + non-custodial savings)** — Rejected; user sovereignty must be uniform
- **Federated multi-sig custody (Ping + insurance + auditor)** — Rejected; still custodial in legal eyes
- **Fully self-custodial with no vault** — Rejected; loses 45% of projected revenue (treasury yield)

## See Also

- [ADR 0004 — Privy MPC wallets (still primary default, vault adds yield capability)](0004-privy-mpc-wallets.md)
- [ADR 0012 — Earn Vault (the non-custodial yield mechanism)](0012-earn-vault.md)
- [SECURITY.md § Identity & Authorization](../SECURITY.md#identity--authorization)
- iogrid model: providers self-custody $GRID, similar non-custodial principle

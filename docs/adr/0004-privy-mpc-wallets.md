# ADR 0004: Privy MPC for Embedded Wallets

**Status:** Accepted
**Date:** 2026-05-21

## Context

Ping users need a wallet to hold USDC, but they're not crypto-savvy — most don't know what a seed phrase is and will never download MetaMask. We need an "embedded" wallet that:

- Lives inside the Ping mobile app (no separate wallet app)
- Is created on phone-number login (no seed-phrase ceremony)
- Is recoverable via the user's phone (no "I lost my seed phrase" lockouts)
- Doesn't expose private keys to us (we don't want custody liability if our DB is compromised)
- Has audited cryptographic security

Options:

- **Custodial wallet** — we hold the keys server-side. Simple but we have full custody liability + regulator scrutiny + can drain users if compromised
- **Self-custody with seed phrase** — user holds the keys. Crypto-native but UX-hostile for our target user
- **MPC (Multi-Party Computation)** — key split into shards; signing requires threshold (2-of-3). User holds one shard, vendor holds one, recovery shard encrypted
- **Smart contract wallet (account abstraction)** — programmable accounts; great for advanced features but requires per-chain support

MPC providers: Privy, Web3Auth, Magic, Lit Protocol, Fireblocks (enterprise).

## Decision

Use **Privy** as the embedded-wallet provider.

- 2-of-3 threshold MPC: device shard + Privy shard + encrypted recovery shard
- Phone-number login (matches our auth flow exactly)
- SOC 2 Type II certified
- Solana support native (also covers Phase 2 chains)
- React Native SDK matures fast (we're React Native + Expo)
- Pricing scales linearly with MAU — predictable

## Consequences

**Good:**

- We NEVER see the private key — full DB compromise can't drain wallets
- Phone OTP recovery flow handled by Privy (we don't gatekeep)
- User mental model is "login with phone" — zero crypto jargon
- Solana signing is fast and cheap (matches our [ADR 0001](0001-stablecoin-rails-on-solana.md) choice)
- Audit + SOC 2 give us regulatory cover

**Bad / trade-offs:**

- Vendor lock-in to Privy — migrating users to another wallet system is non-trivial
- Privy outages directly degrade our signing path (mitigation: SLA + multi-region Privy infra)
- Cost per MAU adds up — at 500K MAU this is a material line item
- 2-of-3 means Privy can collude with us (theoretically) to sign without user — but they can't with us alone (good), and we can't without them (also good)

## Alternatives Considered

- **Custodial wallet:** Rejected — custody liability + regulatory exposure too high
- **Web3Auth:** Considered — competitive feature set, but React Native SDK was less mature when we evaluated (mid-2025)
- **Magic.link:** Considered — strong email-magic-link UX, but our user base is phone-first not email-first
- **Lit Protocol:** Considered — decentralized MPC, exciting tech, but operational maturity lags Privy
- **Fireblocks:** Considered — enterprise-grade but priced for institutions, overkill for consumer wallets
- **Smart contract wallets (ERC-4337):** Considered for Phase 2 — adds gasless UX but per-chain implementation is heavy; defer until we have a stable corridor with high enough volume

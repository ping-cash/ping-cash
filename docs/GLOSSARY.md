# Glossary

**WHAT:** Canonical terminology + banned terms for the Ping codebase, marketing copy, and operator communications.

**AUTHORITY:** 📐 PERMANENT.

---

## Brand & Product

| Term | Meaning | Notes |
|---|---|---|
| **Ping** | The product / company name | Always capitalized "Ping" in copy; lowercase `ping` only in code identifiers (package names, env vars) |
| **ping.cash** | Primary domain | Brand reads "Ping" — the `.cash` TLD is a domain-hack, not part of the spoken brand |
| **In-network transfer** | A transfer where both sender and recipient have Ping accounts (USDC → USDC on Solana); always FREE |
| **Claim link** | The unique URL sent to a recipient who doesn't have Ping; opens the web claim flow |
| **Claim code** | 12-character alphanumeric code embedded in claim links (`x7Kp2mN9qL4r`) |
| **Cash-in** | Funding a Ping wallet from fiat (Apple Pay, card, bank, USDC direct) |
| **Cash-out** | Withdrawing from a Ping wallet to fiat (GCash, M-Pesa, bank, cash pickup) |
| **Recipient** | The person receiving money; may or may not have a Ping account |
| **Sender** | The person initiating a transfer; always has a Ping account |
| **Off-ramp** | A provider that converts USDC → local fiat (TransFi is primary) |
| **On-ramp** | A provider that converts fiat → USDC (Stripe, Checkout.com, bank rails) |
| **Provider cost** | The portion of a fee that goes to an external partner (TransFi, Lean, Stripe, etc.). Always paid in USDC. Cannot be discounted. |
| **Ping markup** | The portion of a fee that Ping retains as margin. Discountable by tier + pay-in-PING. The only portion that gets burned as $PING. |
| **Merciful pricing** | Founder principle: charge only enough to cover real provider costs. FX spread fixed at 0.4% (per ADR 0016), not 2-5% like incumbents. |
| **Phase 1 / Phase 2** | Pre-token platform launch (Ping Points) vs. token-live platform ($PING) — per ADR 0015 |
| **Ping Points (PP)** | Phase-1 internal credit, database-tracked, non-token, 1 PP = 1 future $PING. Converts 1:1 to $PING at TGE. |
| **TGE** | Token Generation Event — the moment $PING is minted and distributed on Solana mainnet. |

## $PING Token + Tier System

| Term | Meaning |
|---|---|
| **$PING** | Solana SPL Token-2022, 1B supply cap, Ping's utility token. Issued by Ping Foundation (Cayman). |
| **Welcome stake** | 1,200 $PING granted on first verified outbound transfer ≥ $10. 200 unlocked + 1,000 conditionally locked. Per ADR 0010. |
| **Tier basis** | Sum of held $PING + locked welcome stake + vault-distributed $PING. Determines tier. |
| **Bronze / Silver / Gold / Platinum** | Tier names. Thresholds 0 / 1,000 / 10,000 / 100,000 $PING. Discounts 0% / 50% / 75% / 90% on Ping markup. |
| **Pay-in-PING** | Mode where user pays the Ping markup portion of a fee in $PING instead of USDC. Gets 75% off the (tier-discounted) markup. $PING used is burned. |
| **Clawback** | Reconciliation at sell-time: looks back 365 days of fees paid, computes fair tier, burns excess discount taken. Per ADR 0013. |
| **Conditional unlock** | Welcome stake locked portion (1,000 PING) unlocks 200 at a time when user hits milestones (referrals, transfers, retention). 2y backstop. |

## Earn Vault + Custody

| Term | Meaning |
|---|---|
| **Earn Vault** | Non-custodial Solana smart contract that auto-stakes user USDC into DeFi for yield. Per ADR 0012. |
| **vUSDC** | Receipt token issued 1:1 by Earn Vault when user deposits USDC. Hides from user UX — they see only USDC balance. |
| **Auto-stake** | Default ON for all users: incoming USDC is auto-staked into the Earn Vault (via one-time delegated authority). |
| **Atomic unstake-and-send** | When user sends USDC, the unstake + transfer happens in a single Solana transaction (~1 second). |
| **Delegated authority** | User signs once at signup giving the Earn Vault smart contract permission to move their USDC. Can be revoked anytime. |
| **Harvest** | Daily on-chain operation: vault collects yield from underlying DeFi, splits 40% Ping / 60% user, distributes $PING to depositors. |
| **Underlying protocols** | The DeFi protocols the vault deploys to: Kamino, Marginfi, Aave Solana, Drift. Plus 5% liquid buffer. |

## Market Making + Reserves

| Term | Meaning |
|---|---|
| **POMM** | Protocol-Owned Market Making — algorithmic on-chain contract that intervenes in $PING/USDC pool to dampen volatility within ±15% EMA band. Per ADR 0009. |
| **Stability Reserve** | USDC accumulated from POMM operations + 50% of treasury-yield buyback. Squads multisig + Streamflow-locked. Used to buy $PING dips. |
| **Foundation $PING Reserve** | $PING accumulated by POMM (when buying dips) + 50% of treasury-yield buyback. Used to sell $PING peaks (counter-cyclical). |
| **Internal swap** | Ping's market-maker contract that fills user $PING buy/sell orders against its own inventory at 0.3% spread (each side). Hedges via Jupiter. Per ADR 0009. |
| **Burn address** | `1nc1nerator1111111111111111111111111111111` — Solana's well-known burn address. Used for all $PING deflationary burns. |
| **5-layer deflation stack** | (1) 5% revenue buyback-burn, (2) Fee-payment burn, (3) Treasury-yield buyback, (4) Early-unstake penalty burn, (5) Hard supply cap + halving. Per ADR 0008. |

## Multi-Token + DEX

| Term | Meaning |
|---|---|
| **Multi-token receive** | Per ADR 0007: Ping wallets accept any SPL token; auto-swap non-USDC to USDC via Jupiter on receipt. Enables $GRID integration etc. |
| **Jupiter** | Solana's primary DEX aggregator. Ping uses for swap routing + inventory rebalancing. |
| **Raydium CLMM** | Concentrated-liquidity AMM where $PING/USDC pool is seeded. LP locked 4y then burned. |
| **Pyth** | Real-time price oracle on Solana. Used for $PING reference price + USDC depeg monitoring. |

## Entities

| Term | Meaning |
|---|---|
| **Ping Foundation (Cayman)** | Phase-2 entity that issues $PING token + holds Foundation Treasury. Squads multisig governance. Per ADR 0014. |
| **Ping Oman Entity** | Existing operating entity. Handles GCC corridor + TransFi/Lean/Tarabut KYB. |
| **Ping Turkey Entity** | Existing operating entity. Handles Turkish corridor + Stripe Turkey + EU rails. |
| **Squads multisig** | 3-of-5 multisig on Solana for governance. Controls Ping fee account, treasury, POMM pause. |
| **Streamflow** | Solana vesting contract used for LP lock + welcome stake conditional unlocks + team vesting. |

---

## Engineering

| Term | Meaning | Notes |
|---|---|---|
| **USDC** | USD Coin — fully-backed dollar stablecoin issued by Circle | Our primary value-bearing asset |
| **Solana** | Layer-1 blockchain hosting our USDC | Chosen for speed (400ms blocks) + cost (sub-cent fees) |
| **Privy** | MPC embedded-wallet provider | We never hold the private key; signing requires 2-of-3 shards |
| **MPC** | Multi-Party Computation | Cryptographic technique splitting a private key into shards |
| **TransFi** | Primary off-ramp provider | 70+ countries, mobile wallets + bank transfers |
| **Outbox pattern** | Atomically persist event + DB write in same transaction; background publisher drains | See [ARCHITECTURE.md § Outbox Pattern](ARCHITECTURE.md#5-outbox-pattern) |
| **CQRS** | Command Query Responsibility Segregation — separate write/read models | See [ARCHITECTURE.md § CQRS](ARCHITECTURE.md#1-cqrs-command-query-responsibility-segregation) |
| **Saga (choreography)** | Distributed transaction pattern; services react to events | See [ARCHITECTURE.md § Saga](ARCHITECTURE.md#3-saga-pattern-choreography) |
| **Istio** | Service mesh providing mTLS, traffic management, observability | Chosen over Kong/Traefik — see [ARCHITECTURE.md § Istio Service Mesh](ARCHITECTURE.md#6-istio-service-mesh) |
| **Redpanda** | Kafka-compatible streaming platform | Simpler ops than Kafka itself |
| **PHPC** | Philippine Peso Coin — stablecoin on Polygon | Used for 0.1%-fee route to Coins.ph in PH corridor |
| **Coins.ph** | Philippine crypto wallet + e-money platform | Direct USDC/PHPC delivery endpoint |
| **GCash, Maya, M-Pesa, JazzCash, bKash, Paytm, UPI** | Local mobile wallets / instant-payment systems | **NOT competitors** — we cash OUT to these (see [BUSINESS-STRATEGY.md § Why Domestic E-Wallets Aren't Competitors](BUSINESS-STRATEGY.md#why-domestic-e-wallets-arent-competitors)) |

---

## Operations & Process

| Term | Meaning |
|---|---|
| **DoD** | Definition of Done — operator walks the surface on a fresh prov + screenshot attached. See [DOD.md](DOD.md) |
| **Fresh prov** | A K8s cluster provisioned from scratch (vs a stable cluster that has accumulated state) |
| **Pillar walk** | The canonical 5-step end-to-end walk that verifies a Ping deployment works |
| **TRUST ledger** | [`ledger/TRUST.md`](ledger/TRUST.md) — verification state per surface |
| **TRACKER ledger** | [`ledger/TRACKER.md`](ledger/TRACKER.md) — open work + DoD progress |
| **ADR** | Architecture Decision Record — append-only docs in [`adr/`](adr/) |
| **Refs vs Closes** | PR-body convention — `Refs #N` keeps the issue open until operator walk; `Closes #N` reserved for CI-gate / docs-only |
| **Outbox publisher** | Background process draining the outbox table → Kafka |
| **Bounded context** | DDD term for a service grouping (Identity / Payment / Delivery) |

---

## Banned Terms (DO NOT USE)

| Banned | Use Instead | Reason |
|---|---|---|
| **Cash** (as product/brand name) | **Ping** | Legacy from pre-rebrand (2026-05-21). `cash-in`/`cash-out` are still valid as generic financial terms |
| **Sociable Cash** | **Ping** | Pre-rebrand brand name |
| **PayPal** (in any product naming) | n/a — never name anything PayPal-adjacent | PayPal Inc. is one of the most TM-aggressive fintechs; even `paypals.cash` is a UDRP target |
| **Venmo, Stripe, Wise, Klarna, Revolut** (in product naming) | n/a | Fintech TM minefield |
| **OneCoin** | n/a | Famous crypto Ponzi scheme — toxic brand association |
| **"kin"** (in marketing copy to migrant workers) | "family" or "loved ones" | "Kin" is a formal English word; ESL audience won't recognize it |
| **"-pal" suffix** (e.g., `paypal`, `sendpal`) | n/a | PayPal-trained association; UDRP target |
| **Kong / Traefik** (as our chosen gateway) | **Istio** | We chose Istio for the service mesh; don't reference alternatives as our choice |
| **Kafka** (in our own infrastructure) | **Redpanda** | We run Redpanda specifically; "Kafka-compatible" is fine in compatibility statements |
| **"For now"**, **"MVP-now-refactor-later"**, **"quick fix"** | Target-state shape | Per [PRINCIPLES.md](PRINCIPLES.md), we ship target-state the first time |
| **`STATE.md` / `STATUS-2.md` / `WORK-LOG.md`** | GH Issues + auto-memory + the single `docs/STATUS.md` | Per [PRINCIPLES.md § 4 — Two Sources of Truth](PRINCIPLES.md#4-two-sources-of-truth-nothing-else) |

---

## Acronyms

| Acronym | Expansion |
|---|---|
| **AML** | Anti-Money Laundering |
| **API** | Application Programming Interface |
| **APR / APY** | Annual Percentage Rate / Yield |
| **BSP** | Bangko Sentral ng Pilipinas (Philippine central bank) |
| **CAP** | Consistency, Availability, Partition-tolerance |
| **CBN** | Central Bank of Nigeria |
| **CBO** | Central Bank of Oman |
| **CDN** | Content Delivery Network |
| **CSPRNG** | Cryptographically Secure Pseudo-Random Number Generator |
| **CQRS** | Command Query Responsibility Segregation |
| **DDD** | Domain-Driven Design |
| **DEX** | Decentralized Exchange |
| **DoD** | Definition of Done |
| **ESO** | External Secrets Operator |
| **FEMA** | Foreign Exchange Management Act (India) |
| **FX** | Foreign Exchange |
| **GCC** | Gulf Cooperation Council (UAE, Saudi, Kuwait, Qatar, Oman, Bahrain) |
| **GDPR** | General Data Protection Regulation (EU) |
| **HPA** | Horizontal Pod Autoscaler |
| **JWT** | JSON Web Token |
| **KYC** | Know Your Customer |
| **MAU** | Monthly Active Users |
| **MPC** | Multi-Party Computation |
| **MRR** | Monthly Recurring Revenue |
| **mTLS** | Mutual TLS |
| **NEFT** | National Electronic Funds Transfer (India) |
| **OTel** | OpenTelemetry |
| **OTP** | One-Time Password |
| **PII** | Personally Identifiable Information |
| **SAMA** | Saudi Arabian Monetary Authority |
| **SBP** | State Bank of Pakistan |
| **SEPA** | Single Euro Payments Area |
| **SLO** | Service Level Objective |
| **SOC 2** | Service Organization Control 2 (audit framework) |
| **SPEI** | Sistema de Pagos Electrónicos Interbancarios (Mexico's instant-payment system) |
| **TDE** | Transparent Data Encryption |
| **TLD** | Top-Level Domain |
| **TM** | Trademark |
| **TPS** | Transactions Per Second |
| **UDRP** | Uniform Domain-Name Dispute-Resolution Policy |
| **UPI** | Unified Payments Interface (India) |
| **USDC** | USD Coin (Circle's stablecoin) |
| **WAF** | Web Application Firewall |

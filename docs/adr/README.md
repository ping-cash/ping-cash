# Architecture Decision Records

**WHAT:** Immutable history of major architectural decisions. Append-only. Each decision is a separate file.

**AUTHORITY:** 🏛️ HISTORICAL. Read for context; never edit a merged ADR. Supersede via a NEW ADR that references the old one.

---

## Format

One file per decision, numbered sequentially: `NNNN-<short-slug>.md`.

Each ADR follows the standard template:

```markdown
# ADR NNNN: <Title>

**Status:** Proposed | Accepted | Superseded by ADR-XXXX
**Date:** YYYY-MM-DD

## Context

What's the situation that made this decision necessary?

## Decision

What did we choose?

## Consequences

What follows from this choice — good, bad, and trade-offs.

## Alternatives Considered

What did we reject, and why?
```

---

## Index

| ADR                                                  | Title                                                                | Status   | Date       |
| ---------------------------------------------------- | -------------------------------------------------------------------- | -------- | ---------- |
| [0001](0001-stablecoin-rails-on-solana.md)           | Stablecoin rails on Solana                                           | Accepted | 2026-05-21 |
| [0002](0002-istio-service-mesh.md)                   | Istio service mesh over Kong/Traefik                                 | Accepted | 2026-05-21 |
| [0003](0003-cap-database-split.md)                   | Polyglot persistence: PostgreSQL (CP) + MongoDB (AP) + Redis (cache) | Accepted | 2026-05-21 |
| [0004](0004-privy-mpc-wallets.md)                    | Privy MPC for embedded wallets                                       | Accepted | 2026-05-21 |
| [0005](0005-transfi-primary-offramp.md)              | TransFi as primary off-ramp provider                                 | Accepted | 2026-05-21 |
| [0006](0006-deployment-via-openova-sovereign.md)     | Deployment via OpenOva Sovereign (openova-private)                   | Accepted | 2026-05-21 |
| [0007](0007-multi-token-receive-via-jupiter.md)      | Multi-token receive via Jupiter auto-swap                            | Accepted | 2026-05-23 |
| [0008](0008-ping-tokenomics.md)                      | $PING utility token design (1B, halving, 5-layer deflation)          | Accepted | 2026-05-23 |
| [0009](0009-pomm-internal-swap.md)                   | Protocol-Owned Market Making + internal swap with spread capture     | Accepted | 2026-05-23 |
| [0010](0010-welcome-stake.md)                        | Welcome stake — locked + conditional unlock via gamification         | Accepted | 2026-05-23 |
| [0011](0011-kyc-shared-service.md)                   | KYC as a shared cross-product service (dynolabs-io/kyc)              | Accepted | 2026-05-23 |
| [0012](0012-earn-vault.md)                           | Earn Vault — auto-stake with $PING-denominated yield                 | Accepted | 2026-05-23 |
| [0013](0013-tier-and-clawback.md)                    | Tier mechanics with instant buy + 365-day sell clawback              | Accepted | 2026-05-23 |
| [0014](0014-entity-structure.md)                     | Entity structure — Turkey + Oman + Cayman Foundation                 | Accepted | 2026-05-23 |
| [0015](0015-phased-launch-ping-points-to-token.md)   | Phased launch — Ping Points (Phase 1) → $PING token (Phase 2)        | Accepted | 2026-05-23 |
| [0016](0016-fx-cost-covering-pricing.md)             | FX cost-covering pricing (0.4% spread)                               | Accepted | 2026-05-23 |
| [0017](0017-custody-model.md)                        | Custody model — non-custodial wallets + delegated-authority vault    | Accepted | 2026-05-23 |
| [0018](0018-anchor-scaffolds-do-not-deploy.md)       | Anchor scaffolds ship with explicit DO-NOT-DEPLOY guard              | Accepted | 2026-05-23 |
| [0019](0019-transfer-claim-bridge-and-reconciler.md) | transfer→claim synchronous bridge + reconciler retry (best-effort)   | Accepted | 2026-05-23 |
| [0020](0020-pillar-4-send-side-unsigned-tx-pattern.md) | Pillar 4 send-side: unsigned-tx builder + client signs via Privy MPC | Accepted | 2026-05-24 |
| [0021](0021-anchor-scaffold-safety-patterns.md) | Anchor scaffold safety pattern catalog (per-mint PDA, vault-init, rotate, hard-disable, compile guard) | Accepted | 2026-05-24 |

---

## When to Write a New ADR

Write one when:

- Choosing between architecturally significant alternatives (databases, message brokers, identity systems, deployment platforms)
- Reversing a prior ADR — supersede it with a new one that references the old
- A non-obvious architectural constraint surfaces from an incident (capture the LEARNED constraint as the new decision)

Don't write one for:

- Tactical code-organization choices (folder structure, naming conventions)
- Specific library upgrades (unless they cascade architectural changes)
- One-off engineering exercises that don't constrain future work

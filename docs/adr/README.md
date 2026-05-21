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

| ADR | Title | Status | Date |
|---|---|---|---|
| [0001](0001-stablecoin-rails-on-solana.md) | Stablecoin rails on Solana | Accepted | 2026-05-21 |
| [0002](0002-istio-service-mesh.md) | Istio service mesh over Kong/Traefik | Accepted | 2026-05-21 |
| [0003](0003-cap-database-split.md) | Polyglot persistence: PostgreSQL (CP) + MongoDB (AP) + Redis (cache) | Accepted | 2026-05-21 |
| [0004](0004-privy-mpc-wallets.md) | Privy MPC for embedded wallets | Accepted | 2026-05-21 |
| [0005](0005-transfi-primary-offramp.md) | TransFi as primary off-ramp provider | Accepted | 2026-05-21 |
| [0006](0006-deployment-via-openova-sovereign.md) | Deployment via OpenOva Sovereign (openova-private) | Accepted | 2026-05-21 |

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

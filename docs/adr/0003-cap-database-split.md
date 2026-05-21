# ADR 0003: Polyglot Persistence — PostgreSQL (CP) + MongoDB (AP) + Redis (Cache)

**Status:** Accepted
**Date:** 2026-05-21

## Context

We have a mix of data needs:
- **Financial data** (transfers, ledger, KYC) — MUST be consistent, ACID required, regulator-grade audit trail
- **User profiles, contacts, claims, notifications** — read-heavy, eventually consistent OK, high availability matters more than strong consistency
- **Sessions, OTPs, rate limits, FX rate cache** — sub-millisecond reads, TTL-based eviction

A single database doesn't fit all three well:
- PostgreSQL is ACID but read-heavy denormalized queries are awkward
- MongoDB is fast for reads but eventual consistency is wrong for ledger
- Redis is great for cache but loses data on restart (without persistence overhead)

## Decision

Use three databases, picked per service per CAP requirement:

| Service | Database | CAP | Why |
|---|---|---|---|
| `ledger-service` | PostgreSQL | CP | Audit trail, double-entry constraints |
| `transfer-service` | PostgreSQL | CP | Transaction state machine, atomic transitions |
| `kyc-service` | PostgreSQL | CP | Compliance data, audit requirements |
| `user-service` | MongoDB | AP | Profile reads >> writes |
| `wallet-service` | MongoDB | AP | Balance derived from events, fast reads |
| `claim-service` | MongoDB | AP | High read volume for claim code lookups |
| `notify-service` | MongoDB | AP | Best-effort delivery, retries handle failures |
| `auth-service` | Redis | AP | Session data, TTL-based |
| `fx-service` | Redis | AP | Rates cache, TTL 60s |

## Consequences

**Good:**
- Each service uses the database that fits its access pattern
- Financial integrity protected by Postgres ACID
- High read throughput on user/claim data via MongoDB
- Fast session/cache layer via Redis
- Outbox pattern in Postgres ensures reliable event publishing to Redpanda

**Bad / trade-offs:**
- Three databases to operate (more complexity, more backup strategies, more monitoring)
- Cross-database joins are forbidden — services must communicate via APIs/events
- Eventual consistency between MongoDB read models and PostgreSQL writes — must design UX to handle this (optimistic UI, retry on conflict)
- Schema migration tooling differs per database (Prisma for Postgres, custom scripts for Mongo)

## Alternatives Considered

- **PostgreSQL only:** Rejected — read patterns for user/claim data benefit hugely from MongoDB's denormalized document model
- **MongoDB only:** Rejected — would force us to implement ACID-like guarantees in app code for financial transactions, doubling complexity
- **CockroachDB (distributed Postgres):** Considered — has ACID + horizontal scale, but mature tooling lags behind Postgres and operational cost is higher
- **DynamoDB / Cassandra:** Rejected — vendor lock-in (DynamoDB), operational complexity for our scale (Cassandra)

## See Also

- [ARCHITECTURE.md § Data Layer](../ARCHITECTURE.md#data-layer) — full schema specifications
- [ARCHITECTURE.md § Outbox Pattern](../ARCHITECTURE.md#5-outbox-pattern) — how we keep Postgres + Kafka in sync

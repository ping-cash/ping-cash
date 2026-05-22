# ping-user Helm chart — Design

**Service:** `user-service`
**Source code:** [`services/user/`](../../services/user/)
**Image:** `ghcr.io/ping-cash/user-service:<sha>`

## Responsibilities

Per ADR 0015 (Phased launch) and ADR 0010 (Welcome stake):

1. User profile CRUD + contacts sync
2. Ping Points balance (Phase 1 database; Phase 2 migrates to on-chain $PING)
3. Welcome stake granting + milestone tracking
4. Tier computation (Bronze / Silver / Gold / Platinum)
5. KYC tier limit tracking + daily/monthly transfer-volume tracking

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/users/internal/create-or-fetch` | Internal | Called by auth-service after Privy bind |
| POST | `/users/internal/welcome-stake` | Internal | Called by transfer-service on first outbound ≥ $10 |
| GET | `/users/me` | Bearer JWT | User profile + tier + Ping Points |
| PATCH | `/users/me` | Bearer JWT | Update displayName / email / avatar / language |
| GET | `/users/me/contacts` | Bearer JWT | List user's synced contacts |
| POST | `/users/me/contacts/sync` | Bearer JWT | Bulk-sync phone contacts |
| GET | `/healthz` | Public | K8s liveness |
| GET | `/readyz` | Public | K8s readiness (Postgres check) |

## Data model

Per ADR 0003 (CAP-aware data layer):

| Storage | Used for | Why |
|---|---|---|
| PostgreSQL | User identity, Ping Points balance + ledger, milestones | ACID for points balance is critical for tier correctness |
| PostgreSQL | Contacts (Phase 1) | Small per-user lists; ACID OK |
| Redis (no direct use) | n/a | user-service doesn't have its own Redis state |

Schema in `prisma/schema.prisma`:

- `User` — identity + tier + balances + KYC + stats
- `PingPointsLedger` — append-only audit trail for tier clawback (ADR 0013)
- `WelcomeMilestone` — 5 per user; achievedAt + unlockedAt tracking
- `Contact` — owner_user_id × contact_phone_hash with isRegistered flag

## Critical paths

### Welcome stake grant flow

```
1. transfer-service detects "first verified outbound ≥ $10" on user U
2. transfer-service → POST user-service /users/internal/welcome-stake { userId: U, transferId }
3. user-service:
   a. Lookup user; verify welcomeStakeGrantedAt is NULL
   b. In a single transaction:
      - User.pingPointsFreeBalance = 200
      - User.pingPointsWelcomeLocked = 1000
      - User.pingPointsWelcomeUnlocked = 200
      - User.welcomeStakeGrantedAt = NOW
      - User.welcomeStakeBackstopAt = NOW + 2 years
      - User.tier = computed (Silver — since 1,200 ≥ 1,000)
      - Append PingPointsLedger entry with reasonCode='welcome_grant'
      - Create 5 WelcomeMilestone records (not-yet-achieved)
4. Respond 204
```

### Tier computation

Tier is **derived** from the user's total Ping Points balance (free + locked + unlocked) at every read. The cached `User.tier` column is kept in sync via the same transactions that change balances. Code in `services/tier.service.ts` is the canonical computation function — used by user-service, transfer-service (for fee calc), and (later) the migration cron at TGE.

## Sovereign-side secrets (OpenBao paths)

| Secret | Path |
|---|---|
| `POSTGRES_URL` | `ping/user-svc/postgres_url` |
| `JWT_SECRET` | `ping/auth/jwt_secret` (shared with auth-service for token verification) |

## Phase 1 vs Phase 2

- **Phase 1:** All balance changes go through this service's database. Tier is computed from DB-tracked Ping Points balance.
- **Phase 2:** On TGE, a migration cron mints $PING SPL tokens (1:1 from Ping Points) directly into each user's wallet. After TGE:
  - User.pingPointsFreeBalance becomes read-only (frozen)
  - Tier basis is read from on-chain $PING balance via wallet-service
  - PingPointsLedger remains as audit history

## Tests

Per PRINCIPLES § 4.6 (tests must exercise behavior):

- `tier.service.test.ts` — covers all tier thresholds and discount stacking math
- `welcome-stake.service.test.ts` (TODO) — idempotency, milestone unlocks, backstop
- `contacts.service.test.ts` (TODO) — sync, hash collisions, registered lookup

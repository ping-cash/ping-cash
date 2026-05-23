# Status — What's Built Today vs Design

**WHAT:** Snapshot of current implementation reality, dated per section.

**AUTHORITY:** 📐 PERMANENT-refreshable. Updated on every CODE-COMPLETE PR.

**Last refreshed:** 2026-05-23

---

## Architectural Decisions — LOCKED ✅

All major architectural decisions are documented in ADRs 0001-0017 (see [docs/adr/](adr/)). Highlights:

| Area                | Decision                                                      | ADR                                                                      |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Stablecoin rails    | USDC on Solana primary                                        | [0001](adr/0001-stablecoin-rails-on-solana.md)                           |
| Service mesh        | Istio (over Kong/Traefik)                                     | [0002](adr/0002-istio-service-mesh.md)                                   |
| Data layer          | PostgreSQL (CP) + MongoDB (AP) + Redis                        | [0003](adr/0003-cap-database-split.md)                                   |
| Wallets             | Privy MPC default, external supported                         | [0004](adr/0004-privy-mpc-wallets.md), [0017](adr/0017-custody-model.md) |
| Off-ramp            | TransFi primary, Wise/Flutterwave/Yellow Card/Thunes failover | [0005](adr/0005-transfi-primary-offramp.md)                              |
| Deployment          | Blueprint → openova-private Sovereign via Flux                | [0006](adr/0006-deployment-via-openova-sovereign.md)                     |
| Multi-token receive | Auto-swap to USDC via Jupiter                                 | [0007](adr/0007-multi-token-receive-via-jupiter.md)                      |
| Tokenomics          | $PING — 1B supply, halving, 5-layer deflation                 | [0008](adr/0008-ping-tokenomics.md)                                      |
| Market making       | POMM + internal swap with spread                              | [0009](adr/0009-pomm-internal-swap.md)                                   |
| Welcome stake       | 1,200 $PING: 200 unlocked + 1,000 conditional                 | [0010](adr/0010-welcome-stake.md)                                        |
| KYC                 | Shared dynolabs-io/kyc service                                | [0011](adr/0011-kyc-shared-service.md)                                   |
| Earn Vault          | Auto-stake, $PING-denominated yield, 40/60 split              | [0012](adr/0012-earn-vault.md)                                           |
| Tier mechanics      | Instant on buy + 365-day clawback at sell                     | [0013](adr/0013-tier-and-clawback.md)                                    |
| Entity structure    | Turkey + Oman + Cayman Foundation                             | [0014](adr/0014-entity-structure.md)                                     |
| Phased launch       | Ping Points (P1) → $PING token (P2)                           | [0015](adr/0015-phased-launch-ping-points-to-token.md)                   |
| FX pricing          | 0.4% cost-covering (merciful)                                 | [0016](adr/0016-fx-cost-covering-pricing.md)                             |
| Custody model       | Non-custodial + delegated-authority vault                     | [0017](adr/0017-custody-model.md)                                        |

---

## Phase 1 MVP — Pillar Status

🟢 = operator-walked on fresh prov · 🟡 = code lands but not yet walked · 🔴 = not yet implemented

| Pillar                                                          | Status           | Notes                                                                |
| --------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------- |
| 1. Auth (phone OTP → JWT → Privy wallet)                        | 🟡 CODE-COMPLETE | `services/auth/` + chart + tests; awaiting Sovereign deploy + walk   |
| 2. User profiles + Ping Points balance                          | 🟡 CODE-COMPLETE | `services/user/` with Prisma schema + welcome-stake + tier service   |
| 3. KYC integration (Tier 1/2/3)                                 | 🔴 NOT STARTED   | Separate repo dynolabs-io/kyc (per ADR 0011) — needs creation        |
| 4. Transfer orchestration                                       | 🟡 CODE-COMPLETE | Existing template + new fee engine wired                             |
| 5. Wallet (Privy MPC + Solana USDC)                             | 🟡 CODE-COMPLETE | `services/wallet/` Solana indexer + vault intent builder             |
| 6. Earn Vault auto-stake                                        | 🔴 NOT STARTED   | Anchor program pending — Phase 2 (post-Cayman + audit)               |
| 7. Claim service (link + OTP + cash-out selection)              | 🟡 CODE-COMPLETE | `services/claim/` full state machine                                 |
| 8. Off-ramp (TransFi → GCash/M-Pesa/etc.)                       | 🟡 CODE-COMPLETE | `services/offramp/` with TransFi + Wise adapters + failover          |
| 9. Notify (WhatsApp/SMS)                                        | 🟡 CODE-COMPLETE | `services/notify/` with 12 templates + WA/SMS/Push channels          |
| 10. FX engine (0.4% cost-covering, Pyth oracle)                 | 🟡 CODE-COMPLETE | `services/fx/` with Pyth + Switchboard + 0.3% disagreement check     |
| 11. Compliance (Chainalysis sanctions screening)                | 🟡 CODE-COMPLETE | `services/compliance/` with KYT + OFAC name screen                   |
| 12. Gamification (welcome-stake milestone tracking)             | 🟡 CODE-COMPLETE | `services/gamification/` with 5-milestone engine                     |
| 13. Mobile app (React Native + Expo)                            | 🟡 CODE-COMPLETE | All 4 tabs (Home/Activity/Earn/Profile) + signup/verify/send         |
| 14. Web claim flow (Next.js)                                    | 🟡 CODE-COMPLETE | `apps/web-claim/` 5-stage flow                                       |
| 15. CI matrix workflow (per-service build → Blueprint → SHA-PR) | 🟡 CODE-COMPLETE | `.github/workflows/build.yml` matrix + bp-ping render + Sovereign PR |

---

## Phase 2 — Token Pillars

| Pillar                                                          | Status         | Notes                             |
| --------------------------------------------------------------- | -------------- | --------------------------------- |
| Cayman Foundation incorporated                                  | 🔴 NOT STARTED | Phase 2 prerequisite (Months 3-6) |
| Crypto-fintech counsel engaged                                  | 🔴 NOT STARTED | Phase 2 prerequisite              |
| $PING SPL token contract (Anchor)                               | 🔴 NOT STARTED | Anchor program development        |
| OtterSec / Halborn audit                                        | 🔴 NOT STARTED |                                   |
| Raydium CLMM pool seeded                                        | 🔴 NOT STARTED | $250K USDC + 50M $PING at TGE     |
| Jupiter Launchpad listing                                       | 🔴 NOT STARTED |                                   |
| POMM smart contract                                             | 🔴 NOT STARTED |                                   |
| Internal swap smart contract                                    | 🔴 NOT STARTED |                                   |
| Welcome stake migration job (Ping Points → on-chain Streamflow) | 🔴 NOT STARTED | Migration cron at TGE             |
| Earn Vault $PING yield distribution                             | 🔴 NOT STARTED | Switches on at TGE                |

---

## Repository Scaffolding

| Component                                    | Status               | Location                                                                 |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| Turborepo + pnpm workspaces                  | ✅ DONE              | `turbo.json`, `pnpm-workspace.yaml`                                      |
| Shared types package                         | ✅ DONE              | `packages/types` (`@ping/types`)                                         |
| Shared config package                        | ✅ DONE              | `packages/config` (`@ping/config`)                                       |
| Shared utils package                         | ✅ DONE              | `packages/utils` (`@ping/utils`)                                         |
| Transfer service template                    | ✅ DONE              | `services/transfer` (`@ping/transfer-service`)                           |
| GitHub Actions CI (stub)                     | 🟡 STUB              | `.github/workflows/ci.yml`; needs full matrix-build + Blueprint pipeline |
| Mobile app scaffold (Expo)                   | ✅ DONE              | `apps/mobile/`                                                           |
| Docs canonical structure                     | ✅ DONE              | `docs/` (consolidated 2026-05-21)                                        |
| 17 ADRs covering all architectural decisions | ✅ DONE (2026-05-23) | `docs/adr/0001`-`0017`                                                   |

---

## Documentation Status

| Doc                                                      | Status                                                   |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `README.md` (1-page entry with tree-view)                | ✅                                                       |
| `CLAUDE.md` (agent orientation, repo-specific only)      | ✅                                                       |
| `docs/ARCHITECTURE.md`                                   | ✅ Updated with token + vault + POMM (2026-05-23)        |
| `docs/BUSINESS-STRATEGY.md`                              | ✅ Updated with finalized fees + tokenomics (2026-05-23) |
| `docs/PRINCIPLES.md` (engineering rules + anti-patterns) | ✅                                                       |
| `docs/DOD.md` (definition of done)                       | ✅                                                       |
| `docs/STATUS.md` (this file)                             | ✅                                                       |
| `docs/RUNBOOKS.md` (operator how-tos)                    | ✅                                                       |
| `docs/SECURITY.md` (threat model + secrets)              | ✅                                                       |
| `docs/SRE.md` (SLOs + observability)                     | ✅                                                       |
| `docs/GLOSSARY.md` (terms + banned terms)                | ✅ Expanded with token + vault terms (2026-05-23)        |
| `docs/ROADMAP.md` (phased delivery timeline)             | ✅                                                       |
| `docs/adr/` — 17 ADRs                                    | ✅ Complete                                              |
| `docs/ledger/TRUST.md` + `TRACKER.md` (live state)       | ✅                                                       |

---

## Entity Structure

Per [ADR 0014](adr/0014-entity-structure.md):

| Entity                               | Status              | Use                                                                     |
| ------------------------------------ | ------------------- | ----------------------------------------------------------------------- |
| Ping Oman                            | ✅ Existing         | Primary operations — GCC corridor, TransFi/Lean/Tarabut/Tap/Thawani     |
| Ping Turkey                          | ✅ Existing         | Secondary operations — Turkish corridor, Stripe Turkey, iyzico, Wise EU |
| Ping Foundation (Cayman)             | 🔴 NOT INCORPORATED | Phase 2 prerequisite for $PING token                                    |
| UAE DMCC (optional Year 2)           | 🔴 Deferred         | For VARA crypto license + UAE-native fintech access                     |
| Singapore Pte Ltd (optional Year 2+) | 🔴 Deferred         | For Asia operations scale                                               |

---

## External Service Accounts

Status per [ADR 0014](adr/0014-entity-structure.md):

| Service                              | Status          | Entity for KYB           |
| ------------------------------------ | --------------- | ------------------------ |
| Privy MPC Wallets                    | ✅ Provisioned  | Either entity            |
| Solana RPC (Helius / QuickNode)      | ✅ Provisioned  | Either                   |
| TransFi (cash-out)                   | 🟡 KYB to apply | Oman                     |
| Lean Technologies (GCC open banking) | 🟡 KYB to apply | Oman                     |
| Tarabut Gateway (parallel to Lean)   | 🟡 KYB to apply | Oman                     |
| Tap Payments (Kuwait/Bahrain/Oman)   | 🟡 KYB to apply | Oman                     |
| Thawani (Oman native)                | 🟡 KYB to apply | Oman                     |
| Stripe Turkey + Apple Pay/Google Pay | 🟡 KYB to apply | Turkey                   |
| iyzico / Param / BKM (Turkish rails) | 🟡 KYB to apply | Turkey                   |
| Bitlo / Paribu (TL ↔ USDC)           | 🟡 KYB to apply | Turkey                   |
| Wise Business API (EU/UK/US)         | 🟡 KYB to apply | Either                   |
| Twilio (SMS/OTP)                     | 🟡 To open      | Either                   |
| WhatsApp Business API                | 🟡 To open      | Either                   |
| Persona (KYC — via dynolabs-io/kyc)  | 🟡 To open      | dynolabs-io/kyc service  |
| Chainalysis KYT (compliance)         | 🟡 To open      | Either                   |
| OpenBao (secrets on Sovereign)       | ✅ Existing     | n/a (Sovereign-provided) |

---

## Infrastructure (from openova-private Sovereign)

Per [ADR 0006](adr/0006-deployment-via-openova-sovereign.md), Ping deploys to the existing OpenOva Sovereign at `openova-io/openova-private`. We don't operate any of the infrastructure below — the Sovereign provides it:

| Layer                                               | Status (provided by Sovereign)   |
| --------------------------------------------------- | -------------------------------- |
| Kubernetes cluster                                  | ✅ Existing on `openova-private` |
| Istio service mesh                                  | ✅ Existing                      |
| PostgreSQL (CNPG)                                   | ✅ Existing                      |
| MongoDB (replica set)                               | ✅ Existing                      |
| Redis (Sentinel)                                    | ✅ Existing                      |
| Redpanda (3 brokers)                                | ✅ Existing                      |
| Observability (Prometheus/Grafana/Loki/Tempo/Kiali) | ✅ Existing                      |
| OpenBao + External Secrets Operator                 | ✅ Existing                      |
| Harbor container registry (proxy-cached ghcr.io)    | ✅ Existing                      |
| PowerDNS + cert-manager + external-dns              | ✅ Existing                      |

**Our responsibility (status: 🔴 NOT WRITTEN):**

| Item                                                                    | Status                   |
| ----------------------------------------------------------------------- | ------------------------ |
| `platform/<service>/` Helm charts (one per microservice)                | 🔴 NOT WRITTEN           |
| `products/bp-ping/blueprint.yaml` (Blueprint manifest)                  | 🔴 NOT WRITTEN           |
| `.github/workflows/build.yml` (matrix + Blueprint + Sovereign SHA-bump) | 🟡 Stub `ci.yml` exists  |
| `ExternalSecret` resources                                              | 🔴 NOT WRITTEN           |
| OpenBao secret paths populated                                          | 🔴 Founder action needed |

---

## Brand + Domain

| Item                                         | Status                                                     |
| -------------------------------------------- | ---------------------------------------------------------- |
| Brand name selected                          | ✅ Ping                                                    |
| Primary domain                               | ⚠ `ping.cash` SELECTED — registration pending at registrar |
| GitHub org/repo                              | ✅ `github.com/ping-cash/ping-cash`                        |
| Defensive `.com` / `.app` / `.io` / `.money` | 🔴 NOT REGISTERED                                          |
| App Store / Play Store listings              | 🔴 NOT FILED                                               |

---

## Recent Changes

### 2026-05-23 — Token + Vault + POMM Locked

- Wrote ADRs 0007-0017 covering: multi-token receive, $PING tokenomics, POMM + internal swap, welcome stake, KYC shared service, Earn Vault, tier + clawback, entity structure, phased launch, FX merciful pricing, custody model
- Updated `ARCHITECTURE.md` with token + vault + POMM sections + new service catalog entries
- Updated `BUSINESS-STRATEGY.md` with finalized fee structure + 0.4% FX commitment
- Expanded `GLOSSARY.md` with all new tokenomics + vault + entity terms
- All architectural decisions now LOCKED. No further design — execution phase.

### 2026-05-22 — Remove docker-compose; CI/Flux-only dev model

- Deleted `docker-compose.yml` and `scripts/init-*.{sql,js}` (no local infrastructure)
- Removed `docker:up` / `docker:down` from `package.json`
- Rewrote `docs/RUNBOOKS.md` to describe code → CI → Flux → Sovereign workflow

### 2026-05-21 — Rebrand Cash → Ping; Doc Consolidation

- Renamed brand from "Cash" → "Ping"
- Migrated GitHub repo: `sociable-cloud/cash` (deleted) → `ping-cash/ping-cash` (new)
- Renamed local folder: `/home/openova/repos/cash` → `/home/openova/repos/ping`
- Workspace packages renamed: `@cash/*` → `@ping/*`
- Consolidated `docs/` tree from 10 flat files into canonical §11 structure

---

## What's Next (autonomous build sequence)

Per founder direction (2026-05-23) — full autonomous mode, definition of done = usable end product:

1. ✅ Documentation complete
2. **GitHub: File umbrella issue + per-service issues** (TaskList items #40, #41)
3. **Code: Rebuild CI matrix workflow** (#42)
4. **Code: Build auth-service (foundation)** (#43)
5. Code: Build user-service + KYC integration
6. Code: Build wallet-service + Earn Vault smart contract
7. Code: Build transfer-service + claim-service + offramp-service
8. Code: Build mobile app (React Native flows from wireframes)
9. Code: Build web claim flow (Next.js)
10. Deploy: Blueprint to openova-private; Flux reconciles
11. Walk: operator validates each pillar on fresh prov + screenshot
12. Continue until end-product DoD met

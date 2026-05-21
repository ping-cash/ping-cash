# Status — What's Built Today vs Design

**WHAT:** Snapshot of current implementation reality, dated per section. Replaces the old "Current Status" checklist that lived in CLAUDE.md.

**AUTHORITY:** 📐 PERMANENT-refreshable. Updated on every CODE-COMPLETE PR.

**Last refreshed:** 2026-05-21

---

## Phase 1 MVP — Pillar Status

| Pillar | Status | Notes |
|---|---|---|
| 1. Auth (phone OTP → JWT → Privy wallet) | 🔴 NOT STARTED | Templates exist; service to be built next |
| 2. User profiles + contact sync | 🔴 NOT STARTED | |
| 3. Transfer orchestration | 🟡 SCAFFOLD | Template service in `services/transfer/` with routes + Prisma schema; no production wiring |
| 4. Wallet (Privy MPC + Solana USDC) | 🔴 NOT STARTED | Privy account not provisioned |
| 5. Claim service (link + OTP + cash-out selection) | 🔴 NOT STARTED | |
| 6. Off-ramp (TransFi → GCash/M-Pesa/etc.) | 🔴 NOT STARTED | TransFi account not provisioned |
| 7. Notify (WhatsApp/SMS) | 🔴 NOT STARTED | Twilio + WhatsApp Business API not provisioned |
| 8. Mobile app (React Native + Expo) | 🟡 SCAFFOLD | Expo scaffold in `apps/mobile/`; one home screen, no auth flow |
| 9. Web claim flow (Next.js) | 🔴 NOT STARTED | |

🟢 = operator-walked on fresh prov · 🟡 = code lands but not yet walked · 🔴 = not yet implemented

---

## Repository Scaffolding

| Component | Status | Location |
|---|---|---|
| Turborepo + pnpm workspaces | ✅ DONE | `turbo.json`, `pnpm-workspace.yaml` |
| Shared types package | ✅ DONE | `packages/types` (`@ping/types`) |
| Shared config package | ✅ DONE | `packages/config` (`@ping/config`) |
| Shared utils package | ✅ DONE | `packages/utils` (`@ping/utils`) |
| Transfer service template | ✅ DONE | `services/transfer` (`@ping/transfer-service`) |
| Docker Compose for local infra | ✅ DONE | `docker-compose.yml` (Postgres, Mongo, Redis, Redpanda, MailHog) |
| Init scripts (Postgres + Mongo) | ✅ DONE | `scripts/init-postgres.sql`, `scripts/init-mongo.js` |
| GitHub Actions CI | ✅ DONE | `.github/workflows/ci.yml` |
| Mobile app scaffold (Expo) | ✅ DONE | `apps/mobile/` |
| Docs canonical structure | ✅ DONE | `docs/` (this consolidation, 2026-05-21) |

---

## Documentation Status

| Doc | Status |
|---|---|
| `README.md` (1-page entry with tree-view) | ✅ |
| `CLAUDE.md` (agent orientation, repo-specific only) | ✅ |
| `docs/ARCHITECTURE.md` (consolidated technical design) | ✅ |
| `docs/BUSINESS-STRATEGY.md` (positioning + GTM + competitive) | ✅ |
| `docs/PRINCIPLES.md` (engineering rules + anti-patterns) | ✅ |
| `docs/DOD.md` (definition of done) | ✅ |
| `docs/STATUS.md` (this file) | ✅ |
| `docs/RUNBOOKS.md` (operator how-tos) | ✅ |
| `docs/SECURITY.md` (threat model + secrets) | ✅ |
| `docs/SRE.md` (SLOs + observability) | ✅ |
| `docs/GLOSSARY.md` (terms + banned terms) | ✅ |
| `docs/ROADMAP.md` (phased delivery timeline) | ✅ |
| `docs/adr/` (architecture decision records — index + seed ADRs) | ✅ |
| `docs/ledger/TRUST.md` + `TRACKER.md` (live state) | ✅ (placeholder) |
| `docs/lessons-learned/` (operator field notes) | ✅ (placeholder) |
| `docs/runbooks/` (per-incident playbooks) | ✅ (placeholder) |
| `docs/proposals/` (in-flight design proposals) | ✅ (placeholder) |
| `docs/sessions/` (date-stamped session artifacts) | ✅ (this rebrand session captured) |
| `docs/archive/` (frozen/superseded content) | ✅ (domain research artifacts moved here) |

---

## Brand + Domain

| Item | Status |
|---|---|
| Brand name selected | ✅ Ping |
| Primary domain | ⚠ `ping.cash` SELECTED — registration pending at registrar |
| GitHub org/repo | ✅ `github.com/ping-cash/ping-cash` |
| Defensive `.com` / `.app` / `.io` / `.money` | 🔴 NOT REGISTERED |
| App Store / Play Store listings | 🔴 NOT FILED |

---

## Infrastructure

| Layer | Status |
|---|---|
| Kubernetes cluster (Civo/Vultr) | 🔴 NOT PROVISIONED |
| Istio service mesh | 🔴 NOT INSTALLED |
| Helm charts | 🔴 NOT WRITTEN |
| Managed PostgreSQL | 🔴 NOT PROVISIONED |
| Managed MongoDB | 🔴 NOT PROVISIONED |
| Managed Redis | 🔴 NOT PROVISIONED |
| Redpanda cluster | 🔴 NOT PROVISIONED |
| Observability stack (Prometheus/Grafana/Loki/Tempo) | 🔴 NOT INSTALLED |

---

## External Services

| Service | Status |
|---|---|
| Privy (embedded wallets) | 🔴 Account not created |
| TransFi (off-ramp) | 🔴 Account not created |
| Twilio (SMS/OTP) | 🔴 Account not created |
| WhatsApp Business API | 🔴 Not provisioned |
| Persona (KYC) | 🔴 Not provisioned |
| Doppler/Vault (secrets) | 🔴 Not provisioned |
| Solana RPC provider | 🔴 Not provisioned |
| Stripe / Checkout.com (cash-in GCC) | 🔴 Not provisioned |

---

## Recent Changes

### 2026-05-21 — Rebrand Cash → Ping; Doc Consolidation

- Renamed brand from "Cash" → "Ping"
- Migrated GitHub repo: `sociable-cloud/cash` (deleted) → `ping-cash/ping-cash` (new)
- Renamed local folder: `/home/openova/repos/cash` → `/home/openova/repos/ping`
- Workspace packages renamed: `@cash/*` → `@ping/*`
- Consolidated `docs/` tree from 10 flat files into canonical structure
- Created subdirectories: `adr/`, `ledger/`, `lessons-learned/`, `runbooks/`, `proposals/`, `sessions/`, `archive/`
- Archived domain research artifacts (`domain_search_results.csv`, `domain_ranking_full.txt`) to `docs/archive/2026-05-21-*`
- Session log: [`docs/sessions/2026-05-21-rebrand-and-doc-consolidation.md`](sessions/2026-05-21-rebrand-and-doc-consolidation.md)

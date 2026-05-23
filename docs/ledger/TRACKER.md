# TRACKER Ledger — Open Work + DoD Progress

**WHAT:** Live snapshot of in-flight work, blockers, and DoD progress. The founder's single-pane-of-glass view.

**AUTHORITY:** 🟢 LIVE STATE. Updated on every status change; cron-refreshed alongside [TRUST.md](TRUST.md).

**Last refreshed:** 2026-05-23 (CI green + Sovereign deploy PR open)

---

## Current Sprint Focus

Phase 1 MVP — Philippines corridor. Goal: ship one end-to-end transfer (GCC sender → PH recipient → GCash cash-out) by Month 6.

---

## Issues by Status

> Counts will populate from `gh issue list` once issues are created. For now this is the placeholder structure.

| Status                  | Count | Issues |
| ----------------------- | ----- | ------ |
| 🟦 Backlog (no label)   | 6     | #15-#16, #22-#24, #7 |
| 🟧 `status/in-progress` | 0     | — |
| 🟪 `status/uat`         | 17    | #1-#6, #8-#14, #17-#21 |
| 🟩 `status/completed`   | 0     | — (none walked yet) |
| 🟥 `status/blocked-ext` | 0     | — |
| ⏸️ `status/parked`      | 0     | — |

---

## Active Work Items

| ID  | Title                                            | Status     | Owner | DoD Gate |
| --- | ------------------------------------------------ | ---------- | ----- | -------- |
| #1  | EPIC: End-to-End Phase 1 Delivery                | UAT        | claude | Awaiting walk-screenshot |
| #2  | CI matrix workflow + Blueprint + Sovereign PR    | UAT ✅     | claude | CI green 2026-05-23 |
| #3-#21 | 12 services + 2 apps + Helm charts            | UAT        | claude | Images on ghcr.io; awaiting Sovereign deploy |
| openova-private#167 | Sovereign deploy PR (Kustomize)     | PR open    | claude | Founder review/merge → Flux reconcile → walk |

---

## Blockers (External)

All external service accounts are provisioned (2026-05-21). Deployment target is the existing OpenOva Sovereign at `openova-io/openova-private` — no separate cluster to provision.

| What's Blocked                                                         | Who's Blocking                 | ETA                  | Mitigation                                                 |
| ---------------------------------------------------------------------- | ------------------------------ | -------------------- | ---------------------------------------------------------- |
| Walk-screenshot on issue #1                                            | openova-private#167 PR review  | Awaiting merge       | Direct Kustomize deploy uses existing ghcr.io images       |
| OpenBao secret paths for Ping (Phase-2 real providers)                 | Founder (post-KYB)             | Phase-2 prerequisite | Phase-1 runs in stub mode; no secrets needed for walk      |
| ping.cash domain                                                       | Founder registration           | Post-walk            | Walk runs at ping.openova.io (Sovereign-owned subdomain)   |

(All other external services already provisioned.)

---

## DoD Progress per Pillar

| Pillar                                | Code          | Test | Walk | Ledger | Docs | Overall |
| ------------------------------------- | ------------- | ---- | ---- | ------ | ---- | ------- |
| 1. Auth                               | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 2. User + Ping Points                 | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 3. KYC (via shared service)           | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 4. Transfer                           | 🟡 (scaffold) | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 5. Wallet + Earn Vault                | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 6. FX (0.4% Pyth-oracle)              | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 7. Ledger (double-entry)              | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 8. Claim                              | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 9. Off-ramp                           | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 10. Notify                            | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 11. Compliance (sanctions)            | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 12. Gamification                      | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 13. Mobile App                        | 🟡 (scaffold) | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 14. Web Claim                         | 🔴            | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| 15. CI / Blueprint pipeline           | 🟡 (stub)     | 🔴   | 🔴   | 🔴     | 🟢   | 🔴      |
| **Architectural decisions (17 ADRs)** | 🟢            | n/a  | 🟢   | 🟢     | 🟢   | 🟢      |
| **Docs structure**                    | 🟢            | n/a  | 🟢   | 🟢     | 🟢   | 🟢      |

🟢 PASS · 🟡 PARTIAL · 🔴 NOT STARTED

---

## Recently Shipped (last 30 days)

| Date       | What                                                                               | PR / Commit       | Walked?                        |
| ---------- | ---------------------------------------------------------------------------------- | ----------------- | ------------------------------ |
| 2026-05-23 | 11 new ADRs (0007-0017) covering token, vault, POMM, tier, entity, custody         | (pending commit)  | 🟢                             |
| 2026-05-23 | ARCHITECTURE.md + BUSINESS-STRATEGY.md + GLOSSARY.md updates with finalized design | (pending commit)  | 🟢                             |
| 2026-05-22 | Remove docker-compose; CI/Flux-only dev model                                      | 9119b01           | 🟢                             |
| 2026-05-21 | Docs canonical-shape consolidation                                                 | 19a7fd0           | 🟢                             |
| 2026-05-21 | Rebrand Cash → Ping; migrate to ping-cash/ping-cash                                | 5662f96           | 🟢                             |
| 2026-05-21 | Initial repo scaffold (Turborepo + shared packages + transfer template + Expo)     | b48efde and prior | 🟡 (code-complete, not walked) |

---

## Updating This Ledger

- After every issue status change: update the count + active items table
- After every shipped PR: add a "Recently Shipped" row
- After every external-blocker resolution: remove from Blockers table
- After every walk: update Pillar DoD Progress + cross-reference [TRUST.md](TRUST.md)
- **Commit every change** — staleness IS the bug

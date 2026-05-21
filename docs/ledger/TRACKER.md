# TRACKER Ledger — Open Work + DoD Progress

**WHAT:** Live snapshot of in-flight work, blockers, and DoD progress. The founder's single-pane-of-glass view.

**AUTHORITY:** 🟢 LIVE STATE. Updated on every status change; cron-refreshed alongside [TRUST.md](TRUST.md).

**Last refreshed:** 2026-05-21 (initial seed)

---

## Current Sprint Focus

Phase 1 MVP — Philippines corridor. Goal: ship one end-to-end transfer (GCC sender → PH recipient → GCash cash-out) by Month 6.

---

## Issues by Status

> Counts will populate from `gh issue list` once issues are created. For now this is the placeholder structure.

| Status | Count | Issues |
|---|---|---|
| 🟦 Backlog (no label) | 0 | — |
| 🟧 `status/in-progress` | 0 | — |
| 🟪 `status/uat` | 0 | — |
| 🟩 `status/completed` | 0 | — |
| 🟥 `status/blocked-ext` | 0 | — |
| ⏸️ `status/parked` | 0 | — |

---

## Active Work Items

| ID | Title | Status | Owner | DoD Gate |
|---|---|---|---|---|
| — | (No issues filed yet) | — | — | — |

---

## Blockers (External)

All external service accounts are provisioned (2026-05-21). Deployment target is the existing OpenOva Sovereign at `openova-io/openova-private` — no separate cluster to provision.

| What's Blocked | Who's Blocking | ETA | Mitigation |
|---|---|---|---|
| OpenBao secret paths for Ping (`ping/privy/*`, `ping/transfi/*`, etc.) | Founder (Sovereign-side) | Before first deploy | Founder populates paths; Ping declares ExternalSecret CRDs |
| Domain registration | `ping.cash` purchase (founder) | Before public launch | Buy at Namecheap / Spaceship; DNS at PowerDNS on Sovereign |

(All other external services already provisioned.)

---

## DoD Progress per Pillar

| Pillar | Code | Test | Walk | Ledger | Docs | Overall |
|---|---|---|---|---|---|---|
| 1. Auth | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| 2. User | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| 3. Transfer | 🟡 (scaffold) | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| 4. Wallet | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| 5. Claim | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| 6. Off-ramp | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| 7. Notify | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| 8. Mobile App | 🟡 (scaffold) | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| 9. Web Claim | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 |
| **Docs structure** | 🟢 | n/a | 🟢 | 🟢 | 🟢 | 🟢 |

🟢 PASS · 🟡 PARTIAL · 🔴 NOT STARTED

---

## Recently Shipped (last 30 days)

| Date | What | PR / Commit | Walked? |
|---|---|---|---|
| 2026-05-21 | Docs canonical-shape consolidation | (this commit) | 🟢 |
| 2026-05-21 | Rebrand Cash → Ping; migrate to ping-cash/ping-cash | 5662f96 | 🟢 |
| 2026-05-21 | Initial repo scaffold (Turborepo + shared packages + transfer template + Expo) | b48efde and prior | 🟡 (code-complete, not walked) |

---

## Updating This Ledger

- After every issue status change: update the count + active items table
- After every shipped PR: add a "Recently Shipped" row
- After every external-blocker resolution: remove from Blockers table
- After every walk: update Pillar DoD Progress + cross-reference [TRUST.md](TRUST.md)
- **Commit every change** — staleness IS the bug

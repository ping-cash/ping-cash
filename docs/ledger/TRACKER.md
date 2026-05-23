# TRACKER Ledger — Open Work + DoD Progress

**WHAT:** Live snapshot of in-flight work, blockers, and DoD progress. The founder's single-pane-of-glass view.

**AUTHORITY:** 🟢 LIVE STATE. Updated on every status change; cron-refreshed alongside [TRUST.md](TRUST.md).

**Last refreshed:** 2026-05-23 — 9 services live on Sovereign; 7 issues closed by walk

---

## Current Sprint Focus

Phase 1 MVP — Philippines corridor. Goal: ship one end-to-end transfer (GCC sender → PH recipient → GCash cash-out) by Month 6.

---

## Issues by Status

> Counts will populate from `gh issue list` once issues are created. For now this is the placeholder structure.

| Status                  | Count | Issues                                     |
| ----------------------- | ----- | ------------------------------------------ |
| 🟦 Backlog (no label)   | 6     | #15-#16, #22-#24, #7                       |
| 🟧 `status/in-progress` | 1     | #11 (ledger — current)                     |
| 🟪 `status/uat`         | 9     | #2-#4, #6, #8, #9, #16, #19                |
| 🟩 `status/completed`   | 7     | #5, #10, #12, #13, #14, #17, #18, #20, #21 |
| 🟥 `status/blocked-ext` | 0     | —                                          |
| ⏸️ `status/parked`      | 0     | —                                          |

---

## Active Work Items

| ID                      | Title                                   | Status      | Owner  | DoD Gate                                                                                      |
| ----------------------- | --------------------------------------- | ----------- | ------ | --------------------------------------------------------------------------------------------- |
| #1                      | EPIC: End-to-End Phase 1 Delivery       | UAT         | claude | 5-stage walk VERIFIED-PASS (issue comment 4525035929); EPIC stays open until all pillars walk |
| #5                      | auth-service (phone OTP → JWT → wallet) | ✅ closed   | claude | Walked at /auth/\* (stub mode)                                                                |
| #10                     | fx-service (Pyth + 0.4% spread)         | ✅ closed   | claude | Walked at /fx/\* (stub-rate oracle)                                                           |
| #12                     | claim-service                           | ✅ closed   | claude | Walked all 5 stages on real browser                                                           |
| #13                     | offramp-service (TransFi/Wise routing)  | ✅ closed   | claude | Pod Ready; real adapter calls await TransFi KYB                                               |
| #14                     | notify-service (12 templates)           | ✅ closed   | claude | Walked /notify/templates                                                                      |
| #17                     | token-service (tier+clawback)           | ✅ closed   | claude | Walked /token/tier with bronze/silver/gold/platinum                                           |
| #18                     | gamification-service                    | ✅ closed   | claude | Pod Ready + event endpoints                                                                   |
| #20                     | web-claim (Next.js)                     | ✅ closed   | claude | All 5 stages walked on Playwright                                                             |
| #21                     | compliance-service (sanctions)          | ✅ closed   | claude | Walked /compliance/sanctions/screen/wallet                                                    |
| #11                     | ledger-service (double-entry + outbox)  | IN PROGRESS | claude | Needs Postgres in `ping` ns — currently deploying                                             |
| #6, #8, #9              | user / transfer / wallet                | UAT         | claude | Need Postgres + Solana RPC                                                                    |
| #19                     | mobile app screens                      | UAT         | claude | Code-complete; awaiting Expo run                                                              |
| #15, #16, #22, #23, #24 | Phase 2 (Earn Vault Anchor, $PING TGE)  | backlog     | —      | Cayman Foundation + audit prerequisite                                                        |
| #7 (dynolabs-io/kyc)    | KYC shared service                      | backlog     | —      | Separate repo created (scaffold only)                                                         |
| openova-private#167     | Sovereign deploy PR (Kustomize)         | ✅ merged   | claude | Flux reconciles each commit                                                                   |

---

## Blockers (External)

All external service accounts are provisioned (2026-05-21). Deployment target is the existing OpenOva Sovereign at `openova-io/openova-private` — no separate cluster to provision.

| What's Blocked              | Who's Blocking       | ETA         | Mitigation                                          |
| --------------------------- | -------------------- | ----------- | --------------------------------------------------- |
| Real Twilio Verify SMS      | Twilio KYB           | Awaiting    | Stub-mode OTP 123456 unblocks walks                 |
| Real Privy MPC wallet       | Privy KYB            | Awaiting    | Stub-mode wallet unblocks walks                     |
| Real TransFi sandbox payout | TransFi KYB          | Awaiting    | Adapter routes deterministic, awaiting cred         |
| Chainalysis KYT             | KYT account          | Awaiting    | Stub-mode `clean` for non-sanctioned addresses      |
| WhatsApp Business API       | Meta KYB             | Awaiting    | SMS fallback path live; WA hot-swap when ready      |
| ping.cash domain            | Founder registration | Post-launch | Live at ping.openova.io (Sovereign-owned subdomain) |

(All other external services already provisioned.)

---

## DoD Progress per Pillar

| Pillar                                | Code          | Test | Walk                  | Ledger | Docs | Overall |
| ------------------------------------- | ------------- | ---- | --------------------- | ------ | ---- | ------- |
| 1. Auth                               | 🟢            | 🟢   | 🟢                    | 🟢     | 🟢   | 🟢      |
| 2. User + Ping Points                 | 🟢            | 🟢   | 🟡 (deploying)        | 🟡     | 🟢   | 🟡      |
| 3. KYC (via shared service)           | 🟡 (scaffold) | 🔴   | 🔴                    | 🔴     | 🟢   | 🟡      |
| 4. Transfer                           | 🟢            | 🟢   | 🔴 (no deploy)        | 🔴     | 🟢   | 🟡      |
| 5. Wallet + Earn Vault                | 🟢            | 🟢   | 🔴 (no Solana RPC)    | 🔴     | 🟢   | 🟡      |
| 6. FX (0.4% Pyth-oracle)              | 🟢            | 🟢   | 🟢                    | 🟢     | 🟢   | 🟢      |
| 7. Ledger (double-entry)              | 🟢            | 🟢   | 🟡 (Prisma fix in CI) | 🟡     | 🟢   | 🟡      |
| 8. Claim                              | 🟢            | 🟢   | 🟢                    | 🟢     | 🟢   | 🟢      |
| 9. Off-ramp                           | 🟢            | 🟢   | 🟢                    | 🟢     | 🟢   | 🟢      |
| 10. Notify                            | 🟢            | 🟢   | 🟢                    | 🟢     | 🟢   | 🟢      |
| 11. Compliance (sanctions)            | 🟢            | 🟢   | 🟢                    | 🟢     | 🟢   | 🟢      |
| 12. Gamification                      | 🟢            | 🟢   | 🟢                    | 🟢     | 🟢   | 🟢      |
| 13. Mobile App                        | 🟢            | 🟡   | 🔴 (no Expo run)      | 🔴     | 🟢   | 🟡      |
| 14. Web Claim                         | 🟢            | n/a  | 🟢                    | 🟢     | 🟢   | 🟢      |
| 15. CI / Blueprint pipeline           | 🟢            | n/a  | 🟢                    | 🟢     | 🟢   | 🟢      |
| **Architectural decisions (17 ADRs)** | 🟢            | n/a  | 🟢                    | 🟢     | 🟢   | 🟢      |
| **Docs structure**                    | 🟢            | n/a  | 🟢                    | 🟢     | 🟢   | 🟢      |

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

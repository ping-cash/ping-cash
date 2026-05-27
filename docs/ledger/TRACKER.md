# TRACKER Ledger — Open Work + DoD Progress

**WHAT:** Live snapshot of in-flight work, blockers, and DoD progress. The founder's single-pane-of-glass view.

**AUTHORITY:** 🟢 LIVE STATE. Updated on every status change; cron-refreshed alongside [TRUST.md](TRUST.md).

**Last refreshed:** 2026-05-27 (post backlog-sweep + CI-unblock + Prisma migrations-on-startup session). **Root-cause fix to #54:** `gh repo edit ping-cash/ping-cash --visibility public` (per repo CLAUDE.md note) — public repos get unlimited Actions minutes on the FREE org plan. CI now actually runs; previously masked failures surface. **#63 filed + shipped same session:** restore corridor-smoke green by (a) wallet lint --fix (2 import-order errors) + (b) Prisma migrations-on-startup pattern across transfer/ledger/user services. **Commits this session:** a162dac (Wise real 4-call flow + 15 vitest), 0d1ee1a (sub-agent reviewer 8 wire-format fixes), 096046e (earn-vault-svc Fastify scaffold + GET /users/:userId/vault + stub-aware reader), 834ced8 (earn-vault #61 batch-1 — squads multisig scaffold + solvency invariant + emergency_withdraw closing H-02 + H-04 + H-05), a410d86 (#50 paste-helper script), 075fbd1 (#63 wallet lint + transfer/ledger Prisma migrations), f461e88 (#63 user-service Prisma migrations). **Issue flips:** #58 closed (PARTIAL → PASS after fixes); #16 closed (scaffold complete; activation gated on #15 program); #61 in-progress (batch-1 of N — adapter CPIs + UserShare PDA remain toolchain-bound per runbook 584c169); #63 in-progress (CI build pending). **Workspace health:** 19/19 pnpm packages typecheck clean; 37+ vitest passing in offramp + 3 passing in earn-vault. **CI:** unblocked end-to-end via repo public flip + lint fixes; Build & Deploy on f461e88 running. **No workarounds rule (founder 2026-05-27):** all session work flows through GHA CI → ghcr.io → openova-private Flux. Mech-4 podman+ghcr is BANNED (saved as durable memory feedback_no_workarounds_ever.md).

**Prior refresh (2026-05-24):** FULL-stack mech-4 sweep + P23 5-mech audit + 6 DoD screenshots + Monitor-caught cebuana drift fix + locale-matrix contract test + per-Wave issue #59 retroactively filed. **All 10 ping services on bastion-built mech-4 images** (auth/wallet/fx/compliance/gamification/notify/token/web-claim → 55189e6; ledger/user/transfer/claim → 5793640; offramp → df1c0d9). Bastion podman + classic PAT push to ghcr bypasses #54 GHA billing block. Full 5-stage corridor walks PASS on the all-fresh stack: latest claimCode=g5xPbCaCc4C3 → PING-A368B1BB. Side-walks confirm wallet/balance hits real Solana mainnet RPC (258297.574098 USDC). TRUST: 64 🟢 / 3 🟡 / 11 🔴. **P23 5-mech audit on each parked**: #50 reclassified (direct ConfigMap path; founder-paste-only — 15 keys from provider dashboards); #15/#23/#24 confirmed founder-business gate (Cayman + audit per runbook 584c169); #62 toolchain-bound residuals documented.

---

## BACKLOG-STANDARDS.md audit — 2026-05-24

Per [dynolabs-io/workflow BACKLOG-STANDARDS.md](https://github.com/dynolabs-io/workflow/blob/main/docs/BACKLOG-STANDARDS.md). Triage decision tree applied to every open issue:

- **Action A (fix in place):** 7 issues — #1 EPIC, #22 EPIC, #7 EPIC, #15, #16, #23, #24, #36, #50 (reformatted title + 4-section body + correct labels)
- **Action B (close + re-file):** 0 — every open issue had clear intent
- **Action C (close as not-planned):** 0 — none obsolete

Issues left untouched (status/completed, awaiting founder close): #2-#6, #8-#14, #17-#21, #25-#35, #37, #39 — these conformed to per-Wave discipline at filing time; will reformat lazily IF re-opened.

Status counts post-audit: 1 in-progress (#36), 6 blocked-ext (#7, #15, #16, #23, #24, #50), 21 completed, 2 unclaimed EPIC parents (#1, #22).

---

## Current Sprint Focus

Phase 1 MVP — Philippines corridor. Goal: ship one end-to-end transfer (GCC sender → PH recipient → GCash cash-out) by Month 6.

---

## Issues by Status

> Counts will populate from `gh issue list` once issues are created. For now this is the placeholder structure.

| Status                  | Count | Issues                                                                                                                                                                         |
| ----------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🟦 Backlog (no label)   | 0     | — (#1 closed; #22 in-progress)                                                                                                                                                 |
| 🟧 `status/in-progress` | 2     | #22 Phase 2 EPIC + #61 earn-vault rebuild (batch-1 source-side shipped 834ced8)                                                                                                |
| 🟪 `status/uat`         | 0     | —                                                                                                                                                                              |
| 🟩 `status/completed`   | 39    | #1 EPIC CLOSED + #2-#14, #16, #17-#21, #25-#39, #58, #59, #60                                                                                                                  |
| 🟥 `status/blocked-ext` | 0     | — (all 6 prior blocked-ext exhausted via P23 + reclassified to parked 2026-05-24)                                                                                              |
| ⏸️ `status/parked`      | 5     | #50 vendor keys (founder-paste), #15/#23/#24 Phase-2 mainnet (audit + cayman), #62 internal-swap+pomm rebuild (toolchain-bound) — #54 RESOLVED 2026-05-27 via repo public flip |

---

## Active Work Items

| ID                      | Title                                                    | Status      | Owner  | DoD Gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1                      | EPIC: End-to-End Phase 1 Delivery                        | ✅ CLOSED   | claude | 5-step §6 cycle complete 2026-05-24: Playwright walk + 8 DoD screenshots + sub-agent SHIP verdict (c.4526977280) + status/uat→completed + gh issue close. Founder may reopen async per §6.                                                                                                                                                                                                                                                                              |
| #22                     | EPIC: Phase 2 — $PING TGE + Foundation + audit + Raydium | IN PROGRESS | claude | All 4 scaffolds reviewed + 45 scaffold fixes / 77 findings + verifier ZERO DRIFT × 2. **#62 rebuild: 6 of 7 closed scaffold-source-side — H-04 (ee132a2/2916a71), C-03 (367defc/417189e), H-06 (55ae7e6), C-02 (aa6bca8), C-01 Raydium CLMM CPI scaffold (5b470c8), H-02 Squads multisig CPI scaffold (2430d03). H-05 overlapped by H-04 → effectively 7 of 7.** Toolchain-bound residuals: real crate fetch + cargo build-sbf + OtterSec audit + Cayman incorporation. |
| corridor-smoke CI       | .github/workflows/corridor-smoke.yml                     | ✅ shipped  | claude | Runs walk-full-corridor.mjs against ping.openova.io on every push + every 6h; all 4 PH cashout methods + send-intent sign verify                                                                                                                                                                                                                                                                                                                                        |
| #5                      | auth-service (phone OTP → JWT → wallet)                  | ✅ closed   | claude | Walked at /auth/\* (stub mode)                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| #10                     | fx-service (Pyth + 0.4% spread)                          | ✅ closed   | claude | Walked at /fx/\* (stub-rate oracle)                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| #12                     | claim-service                                            | ✅ closed   | claude | Walked all 5 stages on real browser                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| #13                     | offramp-service (TransFi/Wise routing)                   | ✅ closed   | claude | Pod Ready; real adapter calls await TransFi KYB                                                                                                                                                                                                                                                                                                                                                                                                                         |
| #14                     | notify-service (12 templates)                            | ✅ closed   | claude | Walked /notify/templates                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| #17                     | token-service (tier+clawback)                            | ✅ closed   | claude | Walked /token/tier with bronze/silver/gold/platinum                                                                                                                                                                                                                                                                                                                                                                                                                     |
| #18                     | gamification-service                                     | ✅ closed   | claude | Pod Ready + event endpoints                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| #20                     | web-claim (Next.js)                                      | ✅ closed   | claude | All 5 stages walked on Playwright                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| #21                     | compliance-service (sanctions)                           | ✅ closed   | claude | Walked /compliance/sanctions/screen/wallet                                                                                                                                                                                                                                                                                                                                                                                                                              |
| #11                     | ledger-service (double-entry + outbox)                   | ✅ closed   | claude | Walked POST /ledger/commit + GET /ledger/balance on mech-4 image (5793640) — #11 c.4526371222                                                                                                                                                                                                                                                                                                                                                                           |
| #6                      | user-service                                             | ✅ closed   | claude | Walked POST /users/internal/create-or-fetch on mech-4 image (5793640) — #6 c.4526378448                                                                                                                                                                                                                                                                                                                                                                                 |
| #8, #9                  | transfer / wallet                                        | UAT         | claude | Mech-4 image 5793640 redeployed; walked POST /transfers + corridor — #1 c.4526400835                                                                                                                                                                                                                                                                                                                                                                                    |
| #19                     | mobile app screens                                       | UAT         | claude | Code-complete; awaiting Expo run                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| #15, #16, #22, #23, #24 | Phase 2 (Earn Vault Anchor, $PING TGE)                   | backlog     | —      | Cayman Foundation + audit prerequisite                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| #7 (dynolabs-io/kyc)    | KYC shared service                                       | backlog     | —      | Separate repo created (scaffold only)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| openova-private#167     | Sovereign deploy PR (Kustomize)                          | ✅ merged   | claude | Flux reconciles each commit                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

## Real-cred plug-in (not blockers — stub-mode live)

The platform is fully walkable TODAY on stub-mode adapters. None of the rows below block the end-user DoD: walks #1 (GCash) + #2 (Maya) both passed end-to-end without these. Real creds are hot-swap via `ping-config` ConfigMap in the openova-private repo — code unchanged. (Note: target-state platform pattern is OpenBao + external-secrets; this Sovereign on Contabo predates that stack — direct ConfigMap is the current op path. See #50 audit comment 4526414922.)

| Real cred              | Current state                     | Hot-swap path                                      |
| ---------------------- | --------------------------------- | -------------------------------------------------- |
| Twilio Verify SMS      | **LIVE 2026-05-28** — Verify SID `VA6b6...` wired via `ping-twilio-credentials` Secret; auth-service rolling. WhatsApp/Email channels dropped from v1 scope (#72/#73 closed not-planned) | Already plugged via openova-private PRs #228-#234. Auth Token rotation due post-test. |
| Privy MPC wallet       | stub wallet address returned      | Set `PRIVY_APP_ID` + `PRIVY_APP_SECRET` env        |
| TransFi sandbox payout | deterministic adapter routing     | Set `TRANSFI_API_KEY` + `TRANSFI_API_SECRET` env   |
| Chainalysis KYT        | stub returns `clean` for non-OFAC | Set `CHAINALYSIS_API_KEY` env                      |
| WhatsApp delivery to recipients | **LIVE 2026-05-28** via mobile send-screen — sender's own WhatsApp (`whatsapp://send?phone=…&text=<claim-link>` deep link, falls back to `wa.me/…`); industry-standard pattern (Cash App, Revolut Pay, Wise share). Zero vendor cost, no Meta approval. | Server-side WhatsApp Business API send (Path B) intentionally not scoped for v1 — adds Trust Hub + entity gate. |
| Persona/Onfido KYC     | stub `persona_stub_*` IDs         | Set `PERSONA_API_KEY` + `ONFIDO_API_KEY` env       |
| ping.cash apex domain  | live at ping.openova.io           | DNS cutover after launch (founder business choice) |

---

## DoD Progress per Pillar

| Pillar                                | Code          | Test | Walk           | Ledger | Docs | Overall |
| ------------------------------------- | ------------- | ---- | -------------- | ------ | ---- | ------- |
| 1. Auth                               | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 2. User + Ping Points                 | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 3. KYC (via shared service)           | 🟡 (scaffold) | 🔴   | 🔴             | 🔴     | 🟢   | 🟡      |
| 4. Transfer                           | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 5. Wallet + Earn Vault                | 🟢            | 🟢   | 🟢 (stub-mode) | 🟢     | 🟢   | 🟢      |
| 6. FX (0.4% Pyth-oracle)              | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 7. Ledger (double-entry)              | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 8. Claim                              | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 9. Off-ramp                           | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 10. Notify                            | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 11. Compliance (sanctions)            | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 12. Gamification                      | 🟢            | 🟢   | 🟢             | 🟢     | 🟢   | 🟢      |
| 13. Mobile App                        | 🟢            | 🟡   | 🟢 (Expo Web)  | 🟢     | 🟢   | 🟢      |
| 14. Web Claim                         | 🟢            | n/a  | 🟢             | 🟢     | 🟢   | 🟢      |
| 15. CI / Blueprint pipeline           | 🟢            | n/a  | 🟢             | 🟢     | 🟢   | 🟢      |
| **Architectural decisions (17 ADRs)** | 🟢            | n/a  | 🟢             | 🟢     | 🟢   | 🟢      |
| **Docs structure**                    | 🟢            | n/a  | 🟢             | 🟢     | 🟢   | 🟢      |

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

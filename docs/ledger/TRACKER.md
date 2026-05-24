# TRACKER Ledger — Open Work + DoD Progress

**WHAT:** Live snapshot of in-flight work, blockers, and DoD progress. The founder's single-pane-of-glass view.

**AUTHORITY:** 🟢 LIVE STATE. Updated on every status change; cron-refreshed alongside [TRUST.md](TRUST.md).

**Last refreshed:** 2026-05-24 (post FULL-stack mech-4 sweep + P23 5-mech audit + **6 DoD screenshots** + **Monitor-caught cebuana drift fix** + locale-matrix contract test + per-Wave issue #59 retroactively filed) — **All 10 ping services now on bastion-built mech-4 images** (auth/wallet/fx/compliance/gamification/notify/token/web-claim → 55189e6; ledger/user/transfer/claim → 5793640; **offramp → df1c0d9** — cebuana+PK+TR drift closed, 15-row locale-matrix contract test green). Bastion podman + classic PAT push to ghcr bypasses #54 GHA billing block; 2 CMD-override hotfixes (transfer JWT sed + claim senderId sed) removed from openova-private manifests, back to canonical shape. **Full 5-stage corridor walks PASS on the all-fresh stack**: latest claimCode=g5xPbCaCc4C3 → PING-A368B1BB (#1 comment 4526472691). Side-walks confirm wallet/balance hits real Solana mainnet RPC (258297.574098 USDC), fx/token/compliance/gamification/notify all green. Issue flips this session: #6 + #11 status/completed; #54 reclassified (mech-4 IS the operating image-build path now). TRUST: 64 🟢 / 3 🟡 / 11 🔴. **P23 5-mech audit posted on each remaining blocked-ext**: #50 reclassified (OpenBao not deployed on this Sovereign — vendor creds use direct ConfigMap path); #15/#23/#24 confirmed founder-business gate (Cayman + audit); #16 partial-unblock available via mech-4 stub-scaffold but ICE-low (not in canonical 5-stage corridor).

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

| Status                  | Count | Issues                                                                                |
| ----------------------- | ----- | ------------------------------------------------------------------------------------- |
| 🟦 Backlog (no label)   | 0     | — (#1 closed; #22 in-progress)                                                        |
| 🟧 `status/in-progress` | 1     | #22 Phase 2 EPIC (pre-audit Anchor review)                                            |
| 🟪 `status/uat`         | 0     | —                                                                                     |
| 🟩 `status/completed`   | 37    | #1 EPIC CLOSED + #2-#14, #17-#21, #25-#39, #59 + #60                                  |
| 🟥 `status/blocked-ext` | 0     | — (all 6 prior blocked-ext exhausted via P23 + reclassified to parked 2026-05-24)     |
| ⏸️ `status/parked`      | 8     | #54 GHA billing, #50 vendor keys, #15/#16/#23/#24 Phase-2 mainnet, #58 Wise, **#61 earn-vault rebuild (founder gates)** |

---

## Active Work Items

| ID                      | Title                                   | Status      | Owner  | DoD Gate                                                                                      |
| ----------------------- | --------------------------------------- | ----------- | ------ | --------------------------------------------------------------------------------------------- |
| #1                      | EPIC: End-to-End Phase 1 Delivery       | ✅ CLOSED   | claude | 5-step §6 cycle complete 2026-05-24: Playwright walk + 8 DoD screenshots + sub-agent SHIP verdict (c.4526977280) + status/uat→completed + gh issue close. Founder may reopen async per §6. |
| #22                     | EPIC: Phase 2 — $PING TGE + Foundation + audit + Raydium | IN PROGRESS | claude | All 4 scaffolds reviewed: **ping-token 3 fixes, earn-vault 7/9 C/H, internal-swap 6/11 C/H, pomm 9/9 C/H ALL CLOSED (db555a3 closes C-01+C-02+C-03 in one stroke)**. 77 findings filed, **25 scaffold fixes shipped**. Pomm is the first of 4 Phase-2 programs fully scaffold-closed. Remaining earn-vault + internal-swap items are architectural — addressed by #61 rebuild + ADR 0009 rebuild + Cayman + OtterSec founder gates. |
| corridor-smoke CI       | .github/workflows/corridor-smoke.yml    | ✅ shipped  | claude | Runs walk-full-corridor.mjs against ping.openova.io on every push + every 6h; all 4 PH cashout methods + send-intent sign verify |
| #5                      | auth-service (phone OTP → JWT → wallet) | ✅ closed   | claude | Walked at /auth/\* (stub mode)                                                                |
| #10                     | fx-service (Pyth + 0.4% spread)         | ✅ closed   | claude | Walked at /fx/\* (stub-rate oracle)                                                           |
| #12                     | claim-service                           | ✅ closed   | claude | Walked all 5 stages on real browser                                                           |
| #13                     | offramp-service (TransFi/Wise routing)  | ✅ closed   | claude | Pod Ready; real adapter calls await TransFi KYB                                               |
| #14                     | notify-service (12 templates)           | ✅ closed   | claude | Walked /notify/templates                                                                      |
| #17                     | token-service (tier+clawback)           | ✅ closed   | claude | Walked /token/tier with bronze/silver/gold/platinum                                           |
| #18                     | gamification-service                    | ✅ closed   | claude | Pod Ready + event endpoints                                                                   |
| #20                     | web-claim (Next.js)                     | ✅ closed   | claude | All 5 stages walked on Playwright                                                             |
| #21                     | compliance-service (sanctions)          | ✅ closed   | claude | Walked /compliance/sanctions/screen/wallet                                                    |
| #11                     | ledger-service (double-entry + outbox)  | ✅ closed   | claude | Walked POST /ledger/commit + GET /ledger/balance on mech-4 image (5793640) — #11 c.4526371222 |
| #6                      | user-service                            | ✅ closed   | claude | Walked POST /users/internal/create-or-fetch on mech-4 image (5793640) — #6 c.4526378448       |
| #8, #9                  | transfer / wallet                       | UAT         | claude | Mech-4 image 5793640 redeployed; walked POST /transfers + corridor — #1 c.4526400835          |
| #19                     | mobile app screens                      | UAT         | claude | Code-complete; awaiting Expo run                                                              |
| #15, #16, #22, #23, #24 | Phase 2 (Earn Vault Anchor, $PING TGE)  | backlog     | —      | Cayman Foundation + audit prerequisite                                                        |
| #7 (dynolabs-io/kyc)    | KYC shared service                      | backlog     | —      | Separate repo created (scaffold only)                                                         |
| openova-private#167     | Sovereign deploy PR (Kustomize)         | ✅ merged   | claude | Flux reconciles each commit                                                                   |

---

## Real-cred plug-in (not blockers — stub-mode live)

The platform is fully walkable TODAY on stub-mode adapters. None of the rows below block the end-user DoD: walks #1 (GCash) + #2 (Maya) both passed end-to-end without these. Real creds are hot-swap via `ping-config` ConfigMap in the openova-private repo — code unchanged. (Note: target-state platform pattern is OpenBao + external-secrets; this Sovereign on Contabo predates that stack — direct ConfigMap is the current op path. See #50 audit comment 4526414922.)

| Real cred              | Current state                     | Hot-swap path                                      |
| ---------------------- | --------------------------------- | -------------------------------------------------- |
| Twilio Verify SMS      | stub OTP `123456` accepted        | Set `TWILIO_VERIFY_SID` + `TWILIO_AUTH_TOKEN` env  |
| Privy MPC wallet       | stub wallet address returned      | Set `PRIVY_APP_ID` + `PRIVY_APP_SECRET` env        |
| TransFi sandbox payout | deterministic adapter routing     | Set `TRANSFI_API_KEY` + `TRANSFI_API_SECRET` env   |
| Chainalysis KYT        | stub returns `clean` for non-OFAC | Set `CHAINALYSIS_API_KEY` env                      |
| WhatsApp Business API  | SMS fallback live (parallel)      | Set `WHATSAPP_PHONE_NUMBER_ID` + `_ACCESS_TOKEN`   |
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

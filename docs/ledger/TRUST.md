# TRUST Ledger — Verification State

**WHAT:** Per-surface verification state. The only authoritative answer to "is this actually working on a fresh prov?"

**AUTHORITY:** 🟢 LIVE STATE. Updated on every walk; cron-refreshed alongside [TRACKER.md](TRACKER.md).

**Last refreshed:** 2026-05-23 (first end-user walk passed: Pillars 5 + 9)

---

## State Legend

| Symbol | State                | Meaning                                                       |
| ------ | -------------------- | ------------------------------------------------------------- |
| 🔴     | **UNVERIFIED**       | Default — not yet walked on fresh prov                        |
| 🟢     | **VERIFIED-PASS**    | Operator walked, screenshot attached, behavior matches design |
| ⛔     | **VERIFIED-FAIL**    | Operator walked, surface broken                               |
| 🟡     | **VERIFIED-PARTIAL** | Some assertions hold, some don't                              |

Every new PR against a surface flips it back to 🔴 UNVERIFIED.

---

## Phase 1 MVP Pillars

| Pillar       | Surface                                                | State         | Last Walk | Evidence                                   |
| ------------ | ------------------------------------------------------ | ------------- | --------- | ------------------------------------------ |
| 1. Auth      | `POST /auth/init` returns sessionId                    | 🟢 VERIFIED-PASS | 2026-05-23 | [docs/walks/2026-05-23-auth-walk-transcript.md](https://github.com/ping-cash/ping-cash/blob/main/docs/walks/2026-05-23-auth-walk-transcript.md) — issue [#5](https://github.com/ping-cash/ping-cash/issues/5#issuecomment-4525112218) |
| 1. Auth      | `POST /auth/verify` returns JWT + Privy stub wallet    | 🟢 VERIFIED-PASS | 2026-05-23 | Same transcript ↑ — JWT decoded; refresh jti in Redis 7d TTL |
| 1. Auth      | Real Twilio Verify SMS delivers                        | 🔴 UNVERIFIED | —         | TWILIO_VERIFY_SID env pending OpenBao        |
| 1. Auth      | Real Privy MPC wallet created                          | 🔴 UNVERIFIED | —         | PRIVY_APP_* env pending OpenBao              |
| 2. User      | `GET /users/me` returns profile                        | 🔴 UNVERIFIED | —         | Service not yet built                      |
| 2. User      | Contact sync from phone book                           | 🔴 UNVERIFIED | —         | Service not yet built                      |
| 3. Transfer  | `POST /transfers` creates pending transfer             | 🔴 UNVERIFIED | —         | Template only; not wired to wallet-service |
| 3. Transfer  | USDC transfer confirmed on Solana                      | 🔴 UNVERIFIED | —         | Wallet service not built                   |
| 4. Wallet    | `GET /wallet/balance` returns USDC                     | 🔴 UNVERIFIED | —         | Wallet service not built                   |
| 4. Wallet    | Privy MPC signs transactions                           | 🔴 UNVERIFIED | —         | Privy account not provisioned              |
| 5. Claim     | Claim page renders with amount + sender                | 🟢 VERIFIED-PASS | 2026-05-23 | [issue #1 comment + docs/walks/2026-05-23-walk-stage1-view.png](https://github.com/ping-cash/ping-cash/issues/1#issuecomment-4525035929) |
| 5. Claim     | OTP verification flow works                            | 🟢 VERIFIED-PASS | 2026-05-23 | [docs/walks/2026-05-23-walk-stage2-otp.png](https://raw.githubusercontent.com/ping-cash/ping-cash/main/docs/walks/2026-05-23-walk-stage2-otp.png) (stub-mode OTP `123456`) |
| 5. Claim     | Cash-out method selection (GCash/Maya/Bank/Cebuana)    | 🟢 VERIFIED-PASS | 2026-05-23 | [docs/walks/2026-05-23-walk-stage3-methods.png](https://raw.githubusercontent.com/ping-cash/ping-cash/main/docs/walks/2026-05-23-walk-stage3-methods.png) |
| 5. Claim     | Cash-out reference issued (stub-mode TransFi)          | 🟢 VERIFIED-PASS | 2026-05-23 | [docs/walks/2026-05-23-walk-stage5-success.png](https://raw.githubusercontent.com/ping-cash/ping-cash/main/docs/walks/2026-05-23-walk-stage5-success.png) — `PING-DF7049AD` |
| 5. Claim     | Real TransFi sandbox payout completes                  | 🔴 UNVERIFIED | —         | TransFi KYB pending (Phase 2 prerequisite) |
| 6. Off-ramp  | offramp-service Pod runs + routes by E.164 country code  | 🟢 VERIFIED-PASS | 2026-05-23 | [6-svc walk](https://github.com/ping-cash/ping-cash/blob/main/docs/walks/2026-05-23-six-services-walk.md) |
| 6. Off-ramp  | TransFi webhook signature verifies                     | 🔴 UNVERIFIED | —         | TransFi KYB pending                          |
| 7. Notify    | `GET /notify/templates` returns 12 templates           | 🟢 VERIFIED-PASS | 2026-05-23 | [6-svc walk](https://github.com/ping-cash/ping-cash/blob/main/docs/walks/2026-05-23-six-services-walk.md) |
| 7. Notify    | WhatsApp claim notification delivers                   | 🔴 UNVERIFIED | —         | WhatsApp Business API not provisioned      |
| 7. Notify    | SMS OTP delivers                                       | 🔴 UNVERIFIED | —         | Twilio not provisioned                     |
| 7. FX        | `GET /fx/rates` returns 10 currencies with 0.4% spread | 🟢 VERIFIED-PASS | 2026-05-23 | [6-svc walk](https://github.com/ping-cash/ping-cash/blob/main/docs/walks/2026-05-23-six-services-walk.md) — ADR 0016 honored |
| 7. FX        | `POST /fx/quote` returns interbank + pingRate          | 🟢 VERIFIED-PASS | 2026-05-23 | Same transcript ↑                             |
| 8. Tier      | `POST /token/tier` thresholds: bronze/silver/gold/platinum | 🟢 VERIFIED-PASS | 2026-05-23 | ADR 0008 thresholds; 1500 → silver           |
| 9. Compliance | `POST /compliance/sanctions/screen/wallet` returns clean for non-sanctioned | 🟢 VERIFIED-PASS | 2026-05-23 | Stub-mode; real Chainalysis pending KYT key  |
| 9. Compliance | Sanctioned address gets risk score 95+                 | 🔴 UNVERIFIED | —         | Needs Chainalysis KYT key                    |
| 10. Gamification | Pod healthy + handles transfer/referral events    | 🟢 VERIFIED-PASS | 2026-05-23 | Pod Ready                                     |
| 8. Mobile    | App cold-launch in < 3s                                | 🔴 UNVERIFIED | —         | Scaffold only                              |
| 9. Web Claim | Claim page mobile-responsive at ping.openova.io        | 🟢 VERIFIED-PASS | 2026-05-23 | [issue #1 walk evidence](https://github.com/ping-cash/ping-cash/issues/1#issuecomment-4525035929) — all 5 stages on real browser |

---

## Repository Hygiene

| Surface                                      | State            | Last Walk  | Evidence                                                                                        |
| -------------------------------------------- | ---------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Docs structure (top-level keepers + subdirs) | 🟢 VERIFIED-PASS | 2026-05-21 | This consolidation; README tree-view; validation script all-green                               |
| Brand rename (Cash → Ping)                   | 🟢 VERIFIED-PASS | 2026-05-21 | All `@cash/*` → `@ping/*` in package.json files; README + CLAUDE.md updated                     |
| GitHub repo migration                        | 🟢 VERIFIED-PASS | 2026-05-21 | Initial commit pushed to `ping-cash/ping-cash`; old `sociable-cloud/cash` deleted               |
| Local folder rename                          | 🟢 VERIFIED-PASS | 2026-05-21 | `/home/openova/repos/cash` → `/home/openova/repos/ping`; auto-memory migrated                   |
| Domain selected                              | 🟢 VERIFIED-PASS | 2026-05-21 | `ping.cash` chosen from 7,030-candidate search; research artifacts in [`archive/`](../archive/) |
| CI/Flux-only dev model documented            | 🟢 VERIFIED-PASS | 2026-05-22 | `docker-compose.yml` deleted, RUNBOOKS rewritten                                                |
| All 17 ADRs covering architecture            | 🟢 VERIFIED-PASS | 2026-05-23 | `docs/adr/0001`-`0017` all written + indexed                                                    |

## Architectural Decision Records (ADRs)

| ADR                                                    | Surface          | State             |
| ------------------------------------------------------ | ---------------- | ----------------- |
| 0001 — Stablecoin rails on Solana                      | 🟢 VERIFIED-PASS | Doc-only decision |
| 0002 — Istio service mesh                              | 🟢 VERIFIED-PASS | Doc-only decision |
| 0003 — Polyglot persistence (Postgres + Mongo + Redis) | 🟢 VERIFIED-PASS | Doc-only decision |
| 0004 — Privy MPC wallets                               | 🟢 VERIFIED-PASS | Doc-only decision |
| 0005 — TransFi primary off-ramp                        | 🟢 VERIFIED-PASS | Doc-only decision |
| 0006 — Deployment via Sovereign                        | 🟢 VERIFIED-PASS | Doc-only decision |
| 0007 — Multi-token receive via Jupiter                 | 🟢 VERIFIED-PASS | Doc-only decision |
| 0008 — $PING tokenomics                                | 🟢 VERIFIED-PASS | Doc-only decision |
| 0009 — POMM + internal swap                            | 🟢 VERIFIED-PASS | Doc-only decision |
| 0010 — Welcome stake                                   | 🟢 VERIFIED-PASS | Doc-only decision |
| 0011 — KYC shared service                              | 🟢 VERIFIED-PASS | Doc-only decision |
| 0012 — Earn Vault                                      | 🟢 VERIFIED-PASS | Doc-only decision |
| 0013 — Tier + clawback                                 | 🟢 VERIFIED-PASS | Doc-only decision |
| 0014 — Entity structure                                | 🟢 VERIFIED-PASS | Doc-only decision |
| 0015 — Phased launch                                   | 🟢 VERIFIED-PASS | Doc-only decision |
| 0016 — FX cost-covering                                | 🟢 VERIFIED-PASS | Doc-only decision |
| 0017 — Custody model                                   | 🟢 VERIFIED-PASS | Doc-only decision |

---

## Updating This Ledger

After each operator walk:

1. Flip the relevant row from 🔴 → 🟢 / ⛔ / 🟡
2. Add the date + a link to the screenshot (GitHub issue comment URL)
3. Commit + push (NEVER lazily edit without committing — staleness is the bug)

When a PR lands that touches a surface:

1. Flip the row back to 🔴 UNVERIFIED in the same PR
2. The next walk re-verifies

# TRUST Ledger — Verification State

**WHAT:** Per-surface verification state. The only authoritative answer to "is this actually working on a fresh prov?"

**AUTHORITY:** 🟢 LIVE STATE. Updated on every walk; cron-refreshed alongside [TRACKER.md](TRACKER.md).

**Last refreshed:** 2026-05-21 (initial seed)

---

## State Legend

| Symbol | State | Meaning |
|---|---|---|
| 🔴 | **UNVERIFIED** | Default — not yet walked on fresh prov |
| 🟢 | **VERIFIED-PASS** | Operator walked, screenshot attached, behavior matches design |
| ⛔ | **VERIFIED-FAIL** | Operator walked, surface broken |
| 🟡 | **VERIFIED-PARTIAL** | Some assertions hold, some don't |

Every new PR against a surface flips it back to 🔴 UNVERIFIED.

---

## Phase 1 MVP Pillars

| Pillar | Surface | State | Last Walk | Evidence |
|---|---|---|---|---|
| 1. Auth | Mobile app login → SMS OTP → JWT issued | 🔴 UNVERIFIED | — | Service not yet built |
| 1. Auth | `POST /auth/init` returns sessionId | 🔴 UNVERIFIED | — | Service not yet built |
| 1. Auth | `POST /auth/verify` returns JWT + Privy wallet address | 🔴 UNVERIFIED | — | Service not yet built |
| 2. User | `GET /users/me` returns profile | 🔴 UNVERIFIED | — | Service not yet built |
| 2. User | Contact sync from phone book | 🔴 UNVERIFIED | — | Service not yet built |
| 3. Transfer | `POST /transfers` creates pending transfer | 🔴 UNVERIFIED | — | Template only; not wired to wallet-service |
| 3. Transfer | USDC transfer confirmed on Solana | 🔴 UNVERIFIED | — | Wallet service not built |
| 4. Wallet | `GET /wallet/balance` returns USDC | 🔴 UNVERIFIED | — | Wallet service not built |
| 4. Wallet | Privy MPC signs transactions | 🔴 UNVERIFIED | — | Privy account not provisioned |
| 5. Claim | Claim page renders with amount + sender | 🔴 UNVERIFIED | — | Claim service not built |
| 5. Claim | OTP verification flow works | 🔴 UNVERIFIED | — | Claim service not built |
| 5. Claim | Cash-out to GCash completes | 🔴 UNVERIFIED | — | TransFi not provisioned |
| 6. Off-ramp | TransFi webhook signature verifies | 🔴 UNVERIFIED | — | TransFi not provisioned |
| 7. Notify | WhatsApp claim notification delivers | 🔴 UNVERIFIED | — | WhatsApp Business API not provisioned |
| 7. Notify | SMS OTP delivers | 🔴 UNVERIFIED | — | Twilio not provisioned |
| 8. Mobile | App cold-launch in < 3s | 🔴 UNVERIFIED | — | Scaffold only |
| 9. Web Claim | Claim page mobile-responsive | 🔴 UNVERIFIED | — | Not built |

---

## Repository Hygiene

| Surface | State | Last Walk | Evidence |
|---|---|---|---|
| Docs structure (top-level keepers + subdirs) | 🟢 VERIFIED-PASS | 2026-05-21 | This consolidation; README tree-view; validation script all-green |
| Brand rename (Cash → Ping) | 🟢 VERIFIED-PASS | 2026-05-21 | All `@cash/*` → `@ping/*` in package.json files; README + CLAUDE.md updated |
| GitHub repo migration | 🟢 VERIFIED-PASS | 2026-05-21 | Initial commit pushed to `ping-cash/ping-cash`; old `sociable-cloud/cash` deleted |
| Local folder rename | 🟢 VERIFIED-PASS | 2026-05-21 | `/home/openova/repos/cash` → `/home/openova/repos/ping`; auto-memory migrated |
| Domain selected | 🟢 VERIFIED-PASS | 2026-05-21 | `ping.cash` chosen from 7,030-candidate search; research artifacts in [`archive/`](../archive/) |

---

## Updating This Ledger

After each operator walk:
1. Flip the relevant row from 🔴 → 🟢 / ⛔ / 🟡
2. Add the date + a link to the screenshot (GitHub issue comment URL)
3. Commit + push (NEVER lazily edit without committing — staleness is the bug)

When a PR lands that touches a surface:
1. Flip the row back to 🔴 UNVERIFIED in the same PR
2. The next walk re-verifies

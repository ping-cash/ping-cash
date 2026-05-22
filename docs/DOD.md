# Definition of Done

**WHAT:** What counts as "done" for any Ping work — features, fixes, infrastructure changes.

**AUTHORITY:** 📐 PERMANENT.

---

## The Single DoD

**A change is DONE when an operator walks the surface on a fresh provisioned environment and a screenshot is attached to the issue.**

Not "PR merged." Not "tests green." Not "agent summary says success." Not "server-side-dry-run passes against a stable cluster that already has the CRDs."

---

## DoD Gates (all must hold)

### 1. Code Gate

- [ ] Code merged to `main`
- [ ] CI green on the merge commit (no admin-merge through red checks)
- [ ] All required reviewers approved
- [ ] No `Closes #N` unless the PR is pure CI-gate / docs-only with no operator-visible surface

### 2. Test Gate

- [ ] Unit tests cover the behavior change (not just string presence)
- [ ] If user-visible: an E2E test exists that exercises the production code path
- [ ] If financial: integration test hits a real database, not a mock

### 3. Walk Gate

- [ ] Fresh-prov environment exists (or the stable env was confirmed-clean post-rollout)
- [ ] Operator opened the actual surface (mobile app screen / web claim page / API endpoint)
- [ ] Behavior matches the issue's acceptance criteria
- [ ] Screenshot attached to the issue with the timestamp visible

### 4. Ledger Gate

- [ ] [`ledger/TRUST.md`](ledger/TRUST.md) flipped from UNVERIFIED → VERIFIED-PASS (or VERIFIED-FAIL / VERIFIED-PARTIAL with the failure cited)
- [ ] [`ledger/TRACKER.md`](ledger/TRACKER.md) shows the issue as completed in the dashboard view

### 5. Documentation Gate

- [ ] If the change introduces a new pattern or service: an ADR in [`adr/`](adr/)
- [ ] If the change is operator-relevant: a runbook in [`runbooks/`](runbooks/) or a section in [RUNBOOKS.md](RUNBOOKS.md)
- [ ] If a fact changed (URL, version, behavior): [STATUS.md](STATUS.md) updated

---

## Anti-DoD Patterns (do NOT count as done)

| Pattern | Why it doesn't count |
|---|---|
| "PR merged, tests green" | Tests can pass with broken UX. Walk the surface. |
| "Agent walked it and said PASS" | Verification agents are READ-ONLY. Show the screenshot. |
| "kubectl --dry-run=server passed" | Stable cluster with existing CRDs ≠ fresh provision. |
| "It worked locally" | Local ≠ deployed; cron'd / managed deps may differ. |
| "I tested the API; the mobile screen is the same logic" | No it isn't. Walk the mobile screen. |
| "TBD-V## filed for cleanup" | TBDs don't close the original issue; they open new work. |

---

## Status Labels (Kanban Mutex)

GitHub does NOT auto-mutex these — you MUST `--remove-label` the prior status when transitioning.

| Label | Column | Meaning |
|---|---|---|
| *(none)* | Backlog | Not started |
| `status/in-progress` | In Progress | Actively being worked |
| `status/uat` | UAT / Testing | Code done, walk pending |
| `status/completed` | Completed | All walks passed, awaiting founder verification |
| `status/parked` | Parked | Blocked or deprioritized |
| `status/blocked-ext` | Blocked External | Waiting on external dep |

---

## Deterministic Tests (Smoke per Pillar)

Each pillar has a deterministic smoke test that must pass on a fresh Sovereign prov before that pillar is considered DONE:

| Pillar | Deterministic Check | Walks |
|---|---|---|
| 1. Auth | `POST /auth/init` → SMS OTP arrives within 10s; `POST /auth/verify` returns JWT + Privy wallet | Operator opens mobile app, enters phone, gets SMS, enters OTP, sees wallet address |
| 2. User + Ping Points | `GET /users/me` returns user profile with PP balance; welcome stake granted on first transfer | Operator triggers first send ≥ $10, observes 1,200 PP balance in app |
| 3. KYC | `POST /kyc/start-tier2` returns Persona inquiry URL; webhook flips tier on verification | Operator runs Persona test inquiry, observes tier upgrade |
| 4. Transfer | `POST /transfers` returns claim URL in < 500ms; in-network transfer is FREE | Operator sends $200 to another Ping user, observes recipient credit immediately |
| 5. Wallet + Earn Vault | Auto-stake on incoming USDC; `GET /wallet/balance` shows vault balance; unstake atomic with spend | Operator deposits $500 USDC, observes auto-stake; sends $200, observes atomic unstake |
| 6. FX | `POST /fx/quote` returns rate based on Pyth oracle × 0.4% spread; secondary Switchboard cross-check | Operator gets quote for $200 → PHP, verifies rate matches Pyth + 0.4% within tolerance |
| 7. Ledger | Every fee/transfer creates double-entry ledger record; outbox publishes events | Operator inspects ledger table after a transfer, verifies entries balance |
| 8. Claim | `GET /claims/{code}` renders web page; OTP delivers in < 10s | Operator clicks claim link in mobile browser, enters OTP, sees claim details |
| 9. Off-ramp | `POST /claims/{code}/cashout` to GCash → TransFi webhook fires within 30s | Operator completes cash-out flow via TransFi sandbox, observes recipient credit |
| 10. Notify | WhatsApp + SMS delivered within 60s | Operator triggers claim notification, observes WA + SMS arrival |
| 11. Compliance | Chainalysis screening on every outbound; sanctions hit blocks transfer | Operator attempts transfer to known-sanctioned address (test), observes block + audit log |
| 12. Gamification | Welcome stake milestone unlock triggers after qualifying event | Operator completes 3 active referrals, observes 200 PP unlock |
| 13. Mobile App | Cold launch → home screen renders in < 3s on iPhone 14+; tier visible | Operator cold-launches app on test device, walks happy path |
| 14. Web Claim | Claim landing → OTP → cash-out → success in < 60s end-to-end | Operator completes web claim flow on Safari + Chrome mobile |
| 15. CI / Blueprint | Push to main → matrix build → ghcr.io images → Blueprint published → SHA-PR opened on openova-private | Operator pushes test commit, observes CI pipeline through to PR creation |

The first time each pillar passes its deterministic check on a **fresh Sovereign environment** (not a stable cluster with accumulated state) is the official **"Phase 1 DONE"** marker for that pillar.

## Phase 2 Deterministic Tests (Token Launch)

After Cayman Foundation + audit complete, add:

| Phase 2 Pillar | Deterministic Check |
|---|---|
| 16. $PING token deployed | Token mint exists on Solana mainnet; supply == 1B; Squads multisig holds mint authority |
| 17. Earn Vault $PING yield | Daily harvest distributes $PING to depositors; on-chain harvest event with 40/60 split verified |
| 18. POMM | When test pump simulated, POMM sells $PING within heartbeat window; on-chain log visible at pomm.ping.cash |
| 19. Internal swap | Buy/sell $PING via Ping app captures 0.3% spread; spread visible in fee account balance |
| 20. Tier + Clawback | Maria's flash-buy scenario tested: tries to game tier, clawback fires, deflation burn confirmed |
| 21. Welcome stake migration | Cron migrates all Ping Points balances 1:1 to $PING; all users' on-chain balances match pre-migration DB |
| 22. Raydium CLMM pool live | $250K USDC + 50M $PING seeded; LP locked 4y via Streamflow; Jupiter routing functional |

---

---

## The Verification Ledger

Every claimed-done item lives in one of 4 states in [`ledger/TRUST.md`](ledger/TRUST.md):

| State | Symbol | Meaning |
|---|---|---|
| **UNVERIFIED** | 🔴 | Default — not yet walked |
| **VERIFIED-PASS** | 🟢 | Operator walked, screenshot attached |
| **VERIFIED-FAIL** | ⛔ | Operator walked, surface broken |
| **VERIFIED-PARTIAL** | 🟡 | Some assertions hold, some don't |

Every new PR against a surface flips it back to UNVERIFIED. Cron-refreshed alongside [`ledger/TRACKER.md`](ledger/TRACKER.md).

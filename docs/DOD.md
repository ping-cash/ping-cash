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

## Deterministic Test (Smoke for Each Pillar)

Once Ping operates a service, a deterministic smoke test will live here:

| Pillar | Surface | Deterministic Check |
|---|---|---|
| 1. Auth | `POST /auth/init` → SMS OTP arrives within 10s | Twilio reachable, Redis writable |
| 2. Transfer | `POST /transfers` → claim URL returned in <500ms | Wallet service has balance, outbox publishing |
| 3. Claim | `GET /claims/{code}` → page renders, OTP delivers | Claim service reads MongoDB, Twilio reachable |
| 4. Cash-out | `POST /claims/{code}/cashout` → TransFi webhook fires within 30s | TransFi sandbox available |
| 5. Mobile App | Cold launch → home screen renders in <3s | API reachable, JWT refresh works |

The first time each pillar passes its deterministic check on a fresh Civo prov is the official "Phase 1 MVP DONE" marker.

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

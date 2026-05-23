# Engineering Principles

**WHAT:** Inviolable engineering rules + anti-pattern catalog for the Ping codebase.

**AUTHORITY:** 📐 PERMANENT. Violations require explicit founder approval to merge.

---

## The 12 Principles

### 1. Never Speculate

Be 100% accurate or admit uncertainty. Read before assuming. Don't guess command outputs — run them. Say "I don't know" rather than fabricate.

### 2. IaC-First

All infrastructure changes go through Git → declarative reconciler (Flux) → cluster. No direct `kubectl apply` for anything that should be in IaC. Runtime must match source-of-truth.

### 3. CI Is the Only Build Path

Every container image that runs on shared infra MUST be produced by CI from a committed git SHA. No `podman build` / `docker build` on bastion or laptop, no `docker push` of locally-built images, no manual re-tagging. A pod running bytes nobody can reproduce IS the bug.

### 4. Two Sources of Truth, Nothing Else

| What                          | Where                                                                     |
| ----------------------------- | ------------------------------------------------------------------------- |
| Work status                   | GitHub Issues (with status labels)                                        |
| Technical decisions & context | Auto-memory files (`~/.claude/projects/-home-openova-repos-ping/memory/`) |

Do NOT create `STATE.md` / `STATUS-2.md` / `WORK-LOG.md` files. Use GH issues + auto-memory. The single `docs/STATUS.md` is for what's-built-today vs what's-design, not for in-progress work.

### 5. Trace Requirements End-to-End Before Fixing Symptoms

When a test asserts a token/behavior/value, walk the full production stack backwards and verify every layer can actually produce it. Don't patch the assertion-facing layer.

### 6. No Admin-Merge Through Red CI

"Pre-existing failure" is not a bypass. Fix the check before the next PR rides on top. Read every diff line of every PR you admin-merge. Too big to review carefully = split before merging.

### 7. Refs, Not Closes (PR Discipline)

`Refs #N` is the default in PR bodies, not `Closes #N`. Auto-close on merge is the enemy. Issues close only after operator-walks-the-surface-with-screenshot. Exception: pure CI-gate / docs-only fixes with no operator-visible surface MAY use `Closes #N`.

### 8. Defensive-Coding Patterns Trigger Investigation

Red flags: null-guards on empty data, `?? 'default'` fallbacks, `enabled: false` defaults, `cursor: 'default'` guards, `must_contain`-token-passing test churn. Each is a clue something upstream is broken. Find the root cause; don't patch the symptom.

### 9. Validate Against Fresh State, Not Stable State

Chart/CRD/bootstrap changes MUST be validated by `helm install` from scratch on a fresh provision. `kubectl --dry-run=server` against a running cluster that already has the CRDs is a lie.

### 10. Don't Add Backwards-Compatibility Shims

If you change a thing, change it completely. Don't rename `_unused` vars to look intentional, don't re-export old types, don't add `// removed` comments for deleted code. If something is unused, delete it.

### 11. Trust Internal Code; Validate at Boundaries

Defensive coding only at trust boundaries (user input, external APIs). Don't validate inputs from your own internal callers — let exceptions propagate. Over-validation hides bugs.

### 12. The Metric Is "PRs Verified on a Fresh Prov"

Not "PRs merged." A surface walked + screenshot + ledger flip from UNVERIFIED → VERIFIED-PASS is what counts. Reports must show the verified denominator.

---

## Anti-Pattern Catalog

> Each row is a smell to recognize and reject. Add new patterns when caught — never delete (history is the value).

| Pattern                                            | Smell                                                                          | Right Response                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Null-guard-after-empty-crash                       | `if (!data) return null` added after dashboard crashed                         | Find why data is empty — fix upstream                   |
| `Closes #N` on scaffold-only PR                    | Interface + env-driven constructor returns nil; issue auto-closes              | `Refs #N`; close only when concrete binding ships       |
| Big-diff with checkbox-shaped bug                  | 100-line diff with a 3-line bug in plain context                               | Slow down, read every line                              |
| `must_contain` token-passing test churn            | Tests pass by adding strings to the DOM                                        | Tests must exercise behaviour, not strings              |
| Service-name-mismatch in env-var defaults          | Default URL `http://svc.ns.svc...` when real Service is `svc-bp-svc.ns.svc...` | `helm template` and grep the real Service name          |
| Dormant-bug guard                                  | `if envVar != "" { ... }` short-circuits a misconfigured code path             | File a ticket; bundle real fix                          |
| Notification-gap stall                             | Agent appears stuck but shipped a PR; the result didn't arrive                 | Before re-dispatching, `gh pr list` to confirm state    |
| IaC-vs-live drift                                  | `*.tf` says X, live resource is Y; manual change never reconciled              | Import + reconcile                                      |
| Substrate-vs-code                                  | Code fixes ship correctly but can't be verified because substrate is wedged    | Triage substrate FIRST                                  |
| Walker reports verdict for surface never navigated | Verdict in walk report; XHR log proves surface never loaded                    | Demand network-trace evidence per claim                 |
| Theater-of-honesty                                 | Long apology paragraph instead of the actual fix                               | The apology IS the next commit                          |
| Zero-progress status updates                       | "Holding." / "Acknowledged." / "Waiting."                                      | Forbidden. Ship or pick next inline action              |
| Fake A/B/C optionality                             | "Two paths — your call?" when one is obviously right                           | Pick A. State the choice in the report                  |
| Cap-as-escape                                      | "Holding at 2 in flight"                                                       | Cap is parallelization budget, not permission to idle   |
| Substrate-symptom spiral                           | "Apiserver flapping AGAIN, investigating" (nth time)                           | 2nd recurrence = ROOT-CAUSE FIX                         |
| Sub-agent bail = permission                        | "Agent quit, holding"                                                          | Do it inline. You have the same tools                   |
| Metric drift                                       | Counting PRs / dispatches / agents                                             | Only count issues-closed-via-walk-with-screenshot       |
| Founder-decision-fakery                            | "Want me to X?" when data already answers                                      | If memory + canon answer it, YOU answer                 |
| Premature 3-option crystallization                 | "Here are 3 options, I recommend A"                                            | Pick A inline. Options are managerial hedges            |
| Async ≠ stop                                       | "Bash poller running, waiting"                                                 | Pick next walk-advancing inline action while async runs |

---

## Code-Review Quick Checklist

Before approving any PR ask yourself:

- [ ] Does the test assert behavior, not just string presence?
- [ ] Are there any `?? defaultValue` patterns? → why is the upstream not providing?
- [ ] Are there null-guards on data that should always exist? → root-cause it
- [ ] Is the title `Refs #N`, not `Closes #N`?
- [ ] Was this validated on a fresh prov, or only on the stable cluster?
- [ ] Does the diff include unrelated cleanup? → split into a separate PR
- [ ] Is there a CHANGELOG entry? _(no — commit history IS the changelog)_

---

## When This Document Updates

Add a new principle or anti-pattern ONLY when a real incident or repeated mistake justifies it. Each entry must have a PR-receipt reference (the PR that established the rule) so future readers can see the origin context.

When in doubt, reference [user-global CLAUDE.md §4 (Generic engineering principles)](https://github.com/openova-io/openova/blob/main/CLAUDE.md) — this file is the Ping-specific extension of those principles, not a replacement.

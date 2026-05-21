# Lessons Learned

**WHAT:** Operator field notes — one file per topic. Capture hard-won knowledge that's NOT obvious from the code or git history.

**AUTHORITY:** 📚 Reference. Add entries; don't delete (history is the value).

---

## Format

One file per topic, named `<short-slug>.md`. Each entry follows:

```markdown
# Lesson: <Short title>

**Date:** YYYY-MM-DD
**Context:** What was happening (incident, ticket, project)
**Symptom:** What we observed
**Root cause:** What was actually wrong
**Fix:** What we did
**Lesson:** What we'd tell a future operator
**Related:** Links to PRs, ADRs, runbooks
```

---

## Index

*(No lessons yet — entries will land as we accumulate operational experience.)*

| Lesson | Date | Topic |
|---|---|---|
| — | — | — |

---

## When to Write a Lesson

- After an incident postmortem, capture what would have helped on-call diagnose faster
- After a non-obvious debugging session where the symptom didn't match the root cause
- When a dependency upgrade required a workaround future-you should remember
- When a vendor SLA / failure mode surprised us

Don't write a lesson for:
- Things obviously documented in upstream docs (Postgres syntax, K8s concepts)
- One-off code bugs (those belong in commit messages)
- Tactical decisions adequately covered by an ADR or runbook

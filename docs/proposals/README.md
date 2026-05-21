# Proposals — In-Flight Design Documents

**WHAT:** Design proposals being actively discussed but not yet accepted. The pre-ADR scratchpad.

**AUTHORITY:** 💡 Working drafts. NOT canonical until promoted to [`../adr/`](../adr/).

---

## Lifecycle

```
proposals/draft-X.md  →  proposals/<slug>.md (under discussion)  →  adr/NNNN-<slug>.md (accepted)
                      OR                                         →  archive/ (rejected)
```

1. **Draft** — author writes a proposal here as `<short-slug>.md`
2. **Review** — comments + iterations happen via PR review on the proposal file
3. **Accept** — promote to `../adr/NNNN-<slug>.md` with status "Accepted"
4. **Reject** — move to `../archive/<date>-<slug>.md` with a note about why

---

## Format

```markdown
# Proposal: <Title>

**Author:** <name>
**Date:** YYYY-MM-DD
**Status:** Draft | Under Review | Accepted (→ ADR XXXX) | Rejected

## Context
What's the situation we're considering?

## Proposal
What's the specific design / change?

## Alternatives
What did we evaluate?

## Open Questions
- [ ] Question 1
- [ ] Question 2

## Decision Criteria
What would make us choose this proposal over alternatives?
```

---

## Active Proposals

*(No active proposals.)*

| Proposal | Author | Status | Last Updated |
|---|---|---|---|
| — | — | — | — |

---

## When to Write a Proposal

- Before committing to a non-trivial architectural decision (database choice, vendor selection, protocol change)
- When discussion needs a written artifact to reference (a Slack thread is not a design doc)
- When more than 2-3 alternatives need side-by-side comparison

Don't write a proposal for:
- Tactical code-organization questions (just open a PR)
- Decisions that are already obvious from existing canon
- Things the founder needs to decide directly (just ask the founder)

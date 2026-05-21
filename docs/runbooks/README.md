# Per-Incident Runbooks

**WHAT:** Per-incident playbooks. Each file = one specific failure scenario with steps to triage, contain, and recover.

**AUTHORITY:** 🛠️ Reference. For generic operator how-tos (dev env, port mappings, common tasks) see [`../RUNBOOKS.md`](../RUNBOOKS.md).

---

## Format

One file per incident scenario, named `<short-slug>.md`. Each runbook follows:

```markdown
# Runbook: <Scenario>

**Severity:** SEV1 / SEV2 / SEV3 (default; on-call adjusts)
**On-call response time:** Per [SRE.md § Incident Severity](../SRE.md#incident-severity)

## Symptom
What the alert / user-report looks like.

## Triage (first 5 minutes)
- [ ] Step 1
- [ ] Step 2

## Contain (next 15 minutes)
- [ ] Step 1
- [ ] Step 2

## Eradicate
What's the actual fix.

## Recover
Restore service, verify on fresh prov per [DOD.md](../DOD.md).

## Postmortem checklist
- [ ] Lessons-learned entry filed in [`../lessons-learned/`](../lessons-learned/)
- [ ] Code fix PR linked
- [ ] Monitoring/alerting improved if applicable
```

---

## Index

*(No incidents yet — runbooks will land as the platform goes live and we accumulate operational learning.)*

| Runbook | Severity | Topic |
|---|---|---|
| — | — | — |

### Likely Future Runbooks

| Scenario | Trigger | Severity |
|---|---|---|
| `transfer-500.md` | `transfer-service` returning 500s | SEV2 |
| `offramp-webhook-fail.md` | TransFi webhook signature mismatch | SEV2 |
| `db-pool-exhaustion.md` | PostgreSQL connection pool > 95% | SEV2 |
| `kafka-lag.md` | Redpanda consumer lag > 5min | SEV2 |
| `privy-down.md` | Privy signing endpoint returning 5xx | SEV1 |
| `solana-outage.md` | Solana RPC unresponsive (network outage) | SEV1 |
| `claim-link-bruteforce.md` | Spike in failed OTP attempts across many claims | SEV1 |
| `whatsapp-template-rejected.md` | Meta rejects template; notifications stop | SEV2 |

---

## When to Write a Runbook

- After a SEV1/SEV2 incident where the next on-call would benefit from a step-by-step playbook
- When a vendor failure mode surfaces (TransFi outage, Privy rate-limit, Twilio quota exhaustion)
- When a database / queue health alert needs a clear "what to do" path

Don't write a runbook for:
- Generic dev environment setup (that's [`../RUNBOOKS.md`](../RUNBOOKS.md))
- One-off bugs without a recurring pattern
- Procedures adequately covered by vendor documentation (link to vendor docs instead)

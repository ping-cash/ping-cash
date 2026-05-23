# ADR 0019 — transfer→claim bridge with reconciler retry loop

**Status:** Accepted · **Date:** 2026-05-23 · **Supersedes:** none

## Context

When a sender creates a transfer via `POST /transfers`, two services need to know about it:

1. **transfer-service** — persists the transfer row, tracks status, drives saga
2. **claim-service** — owns the recipient-facing claim flow (`/claims/:code`)

Initially these only communicated via Kafka events (transfer-service → `transfer.events` → claim-service consumer). That decoupling is desirable in steady state but creates a **bootstrapping problem in Phase 1**: Kafka/Redpanda is not yet deployed in the `ping` namespace, so the consumer never fires, and a recipient who clicks the claim URL hits `CLAIM_NOT_FOUND`.

Until Kafka lands in `ping` ns, we need a synchronous-but-best-effort fallback.

## Decision

### 1. Synchronous HTTP bridge

`transfer-service.createTransfer()` calls `claim-service POST /claims/internal/create` immediately after the transfer row is persisted, passing the same `claim_code` it just generated.

```ts
const transfer = await this.repository.create({ ... });
const bridgeResult = await createClaimForTransfer({
  transferId: transfer.id,
  claimCode,
  ...
});
if (bridgeResult) {
  await this.repository.markClaimBridgeAcked(transfer.id);
}
```

### 2. Idempotent claim-service `create()`

claim-service's `CreateClaimBody` accepts an optional `claimCode`. Behavior:

| Supplied? | Existing record?            | Behavior                                               |
| --------- | --------------------------- | ------------------------------------------------------ |
| No        | n/a                         | Generate fresh 12-char base62 code (existing behavior) |
| Yes       | No                          | Use supplied code; store under it                      |
| Yes       | Yes, same `transferId`      | Idempotent return (no overwrite, same response)        |
| Yes       | Yes, different `transferId` | Throw — caller bug                                     |

This means transfer-service and claim-service end up with the **same** claim_code for the same logical claim, so the sender's URL works.

### 3. Best-effort failure handling + reconciler

If the bridge POST fails (5xx, network error, claim-service down), `createClaimForTransfer` returns `null` and the transfer row is still persisted. The `claim_bridge_acked_at` column stays NULL.

A background **reconciler** in transfer-service polls every 30s:

```sql
SELECT * FROM transfers
WHERE claim_bridge_acked_at IS NULL
  AND created_at > now() - interval '7 days'
ORDER BY created_at ASC
LIMIT 50;
```

For each pending transfer, it re-POSTs to claim-service. Because of the idempotent contract above, retries are safe.

### 4. NOT rolling back the transfer

Even if the bridge fails for a week, the transfer row stays valid:

- Money has not moved (Solana settlement happens in a later saga step)
- The sender sees their transfer in `GET /transfers`
- Once claim-service is reachable, the recipient sees the claim URL working

We do NOT roll back the transfer on bridge failure because:

- The transfer is the authoritative record; claim-service is a denormalized read-side
- 2PC across HTTP services is fragile; eventually-consistent retry is cheaper

## Consequences

### Positive

- Recipients can always claim transfers once claim-service is reachable
- No Kafka dependency for the critical sender→recipient path
- Idempotent contract means retries are safe (no duplicate claim codes)
- 7-day reconciler window matches the claim expiry, so no zombie transfers

### Negative

- Synchronous HTTP coupling — claim-service downtime adds latency to `POST /transfers` (mitigated by short timeout + the call being best-effort)
- The reconciler is single-pod (transfer-service has 1 replica); at scale we'll need a distributed lock or partition the work
- We can't tell from `claim_bridge_acked_at IS NULL` alone whether the bridge has never been tried vs. tried-and-failed; the column is sufficient for the current need but a future `bridge_attempt_count` + `last_attempt_at` would help observability

### Neutral

- When Kafka/Redpanda lands in `ping` ns, the event-driven path becomes primary; this bridge becomes the safety net for the event consumer's "first event after deploy" gap
- No data migration when Kafka lands — the bridge stays in place and the consumer just becomes the fast path

## Alternatives Considered

| Alternative                     | Why rejected                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kafka-only (no bridge)**      | Kafka not yet in ping ns; consumer never fires; recipients get CLAIM_NOT_FOUND                                                                               |
| **2PC across transfer + claim** | XA/2PC across HTTP is fragile + slow; this is a low-stakes denormalization, not a financial commit                                                           |
| **Polling from claim-service**  | claim-service would need direct access to transfer-service's DB or a backwards-pointing API — worse coupling                                                 |
| **Outbox + worker**             | The reconciler IS effectively an outbox-pattern worker reading from the transfers table itself (which is the outbox) — simpler than a dedicated outbox table |

## References

- [`services/transfer/src/services/claim-bridge.service.ts`](../../services/transfer/src/services/claim-bridge.service.ts) — synchronous POST
- [`services/transfer/src/services/claim-reconciler.service.ts`](../../services/transfer/src/services/claim-reconciler.service.ts) — 30s retry loop
- [`services/claim/src/services/claim.service.ts`](../../services/claim/src/services/claim.service.ts) `create()` — idempotency branch
- [`services/transfer/prisma/schema.prisma`](../../services/transfer/prisma/schema.prisma) — `claim_bridge_acked_at` column
- Issues [#40](https://github.com/ping-cash/ping-cash/issues/40), [#41](https://github.com/ping-cash/ping-cash/issues/41), [#42](https://github.com/ping-cash/ping-cash/issues/42), [#43](https://github.com/ping-cash/ping-cash/issues/43), [#45](https://github.com/ping-cash/ping-cash/issues/45)

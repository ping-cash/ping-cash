# Ledger Service Pillar Walk — 2026-05-23

**Pillar:** 3. Ledger (issue #11)
**Endpoint:** `POST /ledger/commit`, `GET /ledger/balance/:accountId`
**Cluster:** ping.openova.io
**Image:** `ghcr.io/ping-cash/ledger-service:459d5b3` (debian-slim + Prisma debian-openssl-3.0.x)
**DB:** PostgreSQL `ledger` (2 tables: LedgerEntry, OutboxEvent)

## Walk Transcript

### Step 1 — Atomic double-entry commit (balanced)

```bash
curl -X POST https://ping.openova.io/ledger/commit -d '{
  "transactionId":"4167055b-2ddd-4b3a-a5ce-a2eb8e04abf9",
  "transactionType":"transfer",
  "entries":[
    {"accountId":"<from>","accountType":"user_wallet","entryType":"DEBIT","amount":"50.00","currency":"USDC"},
    {"accountId":"<to>","accountType":"user_wallet","entryType":"CREDIT","amount":"50.00","currency":"USDC"}
  ],
  "outboxEvent":{"topic":"ledger.events","eventType":"LedgerEntriesCommitted","payload":{...}}
}'
```

Response:

```json
{
  "entryIds": ["8bb7ad8b...", "76be8da2..."],
  "outboxId": "49124c26-0aab-461a-8b0e-ebf2ef21f220"
}
```

### Step 2 — Balance lookup

- `GET /ledger/balance/<from>?currency=USDC` → `{"balance":"-50"}` ✅
- `GET /ledger/balance/<to>?currency=USDC` → `{"balance":"50"}` ✅

### Step 3 — Imbalanced transaction rejection (security)

Sent DEBIT $100 + CREDIT $50 (mismatched). Response:

```json
{
  "error": {
    "code": "IMBALANCED_TRANSACTION",
    "message": "Ledger entries do not balance — debits must equal credits per transaction.",
    "details": { "currency": "USDC", "unbalanced_amount": "5000000000" }
  }
}
```

✅ Rejected at write time. No partial state on disk.

### Step 4 — Outbox pattern verified

After commit, `SELECT * FROM "OutboxEvent"` shows:

```
id        | topic         | eventType                | published
----------+---------------+--------------------------+----------
49124c26  | ledger.events | LedgerEntriesCommitted   | f
```

Event queued for Kafka delivery; will publish when Kafka brokers are configured (stub-mode now). ✅

## Validated Behaviors

| Surface                                                           | Status  |
| ----------------------------------------------------------------- | ------- |
| 2-entry double-entry commit (DEBIT + CREDIT balance to 0)         | ✅ PASS |
| Atomic transaction (entryIds returned in one batch)               | ✅ PASS |
| Balance computed via running sum across rows                      | ✅ PASS |
| Imbalanced transaction rejected with IMBALANCED_TRANSACTION error | ✅ PASS |
| Outbox event written in same transaction (Outbox Pattern)         | ✅ PASS |
| Outbox publisher in stub mode (Kafka unset)                       | ✅ PASS |

## Schema in production

PostgreSQL `ledger` database has 2 tables matching the Prisma schema:

- `LedgerEntry` (12 columns + 4 indexes)
- `OutboxEvent` (12 columns + 3 indexes)

`uuid-ossp` extension installed for `uuid_generate_v4()`.

## Open Items

- Real Kafka broker not yet deployed → outbox events backlog grows (drained when Redpanda comes online).

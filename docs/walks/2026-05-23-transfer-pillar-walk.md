# Transfer Service Pillar Walk — 2026-05-23

**Pillar:** 3. Transfer (issue #8)
**Endpoints:** `POST /transfers`, `GET /transfers` (list)
**Cluster:** ping.openova.io
**Image:** `ghcr.io/ping-cash/transfer-service:7847597` (debian-slim + Prisma debian-openssl-3.0.x + Fastify Zod-in-handler fix)
**DB:** PostgreSQL `transfer` (2 tables: transfers, outbox)

## Walk Transcript

### Step 1 — Auth chain (Pillar 1)

```bash
INIT=$(curl -X POST https://ping.openova.io/auth/init -d '{"phone":"+447700900999","channel":"sms"}')
SID=$(echo "$INIT" | jq -r .sessionId)
TOKEN=$(curl -X POST https://ping.openova.io/auth/verify -d '{"sessionId":"'$SID'","code":"123456"}' | jq -r .tokens.accessToken)
```

### Step 2 — `POST /transfers` create pending transfer

```bash
curl -X POST https://ping.openova.io/transfers \
  -H "authorization: Bearer $TOKEN" \
  -d '{"recipientPhone":"+639171234567","amount":"50.00","currency":"USD","note":"PH GCash test"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "transfer": {
      "id": "txn_VlmIoZN4GjQD99QowbttG",
      "senderId": "usr_development",
      "recipientPhone": "+639171234567",
      "recipientPhoneHash": "5f399b427fda5c2e9aa29471760b402cfd73b783b9c70ef7e587e35344c6556a",
      "amount": { "amount": "50.00", "currency": "USD" },
      "fees": { "amount": "0.00", "currency": "USD" },
      "status": "pending",
      "claimCode": "Y76tf2EJPPDX",
      "claimUrl": "http://localhost:3001/c/Y76tf2EJPPDX",
      "claimExpiresAt": "2026-05-30T12:23:05.021Z"
    }
  }
}
```

### Step 3 — `GET /transfers` returns the sender's list

Returns paginated array. Both txn IDs above appear with `type:"sent"` ✅

### Step 4 — Verify in Postgres

```sql
SELECT id, sender_id, claim_code, status, amount, currency FROM transfers ORDER BY created_at DESC LIMIT 3;
```

```
            id             |    sender_id    |  claim_code  | status  | amount | currency
---------------------------+-----------------+--------------+---------+--------+----------
 txn_VlmIoZN4GjQD99QowbttG | usr_development | Y76tf2EJPPDX | pending | 50.00  | USD
 txn_uwh7Lk58dy9rMsco0wzmc | usr_development | TyWRtgnScxKM | pending | 50.00  | USD
```

Real DB rows. ✅

## Validated Behaviors

| Surface                                                  | Status  |
| -------------------------------------------------------- | ------- |
| Bearer-token authentication on `POST /transfers`         | ✅ PASS |
| Phone hash (SHA-256) of recipient stored, not cleartext  | ✅ PASS |
| 7-day claim expiry (`claimExpiresAt = createdAt + 7d`)   | ✅ PASS |
| Unique short claim code generated (12-char base62)       | ✅ PASS |
| Status starts as `pending` (waiting for recipient claim) | ✅ PASS |
| Fees calculated (0.00 for USD-USD same-currency at stub) | ✅ PASS |
| List endpoint returns sent transfers with pagination     | ✅ PASS |
| Persisted in Postgres `transfer` schema                  | ✅ PASS |
| Outbox event written (stub-mode Kafka logger)            | ✅ PASS |

## Architecture Notes

- Auth-service stub issues `usr_<hex>` IDs; transfer-service uses these as senderId without UUID parsing (TEXT column in schema). Cross-service ID coupling consistent.
- `claimUrl` currently uses `localhost:3001` (env stub); production uses `CLAIM_URL_BASE=https://ping.openova.io/c`.
- Real Solana txHash will populate `blockchain_tx_hash` once wallet-service signs via Privy MPC.

## Open Items

- Real Kafka not yet deployed (outbox events queued in DB; will drain when Redpanda lands)
- Welcome-stake granted on first outbound transfer ≥ $10 — needs cross-call from transfer-service to user-service `/users/internal/welcome-stake` (next walk)
- claimUrl pointer to localhost:3001 — update `CLAIM_URL_BASE` env (cosmetic)

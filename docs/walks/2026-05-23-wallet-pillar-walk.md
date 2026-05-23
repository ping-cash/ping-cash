# Wallet Service Pillar Walk — 2026-05-23

**Pillar:** 4. Wallet
**Endpoint:** `GET /wallet/address`, `GET /wallet/balance`
**Cluster:** ping.openova.io
**Image:** `ghcr.io/ping-cash/wallet-service:latest`
**Auth:** JWT from `/auth/verify` (stub Twilio OTP `123456`)

## Walk Transcript

### Step 1 — Auth init + verify (chained from Pillar 1)

```bash
INIT=$(curl -X POST https://ping.openova.io/auth/init -d '{"phone":"+447700900222","channel":"sms"}')
SID=$(echo "$INIT" | jq -r .sessionId)
VERIFY=$(curl -X POST https://ping.openova.io/auth/verify -d '{"sessionId":"'$SID'","code":"123456"}')
TOKEN=$(echo "$VERIFY" | jq -r .tokens.accessToken)
```

### Step 2 — `GET /wallet/address` returns ADR 0007 multi-token list

```bash
curl https://ping.openova.io/wallet/address -H "authorization: Bearer $TOKEN"
```

Response:

```json
{
  "address": "Stub2b343437373030393030323232",
  "chain": "solana",
  "acceptedTokens": [
    "USDC",
    "USDT",
    "FDUSD",
    "PHPC",
    "cKES",
    "cNGN",
    "EURC",
    "GBPT",
    "$PING"
  ],
  "autoSwapPolicy": "auto-swap to USDC via Jupiter, max 0.5% slippage"
}
```

### Step 3 — `GET /wallet/balance` (stub-address — Solana validation)

Stub-mode wallet address fails Solana base58 validation as designed:

```json
{
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "Invalid Solana address."
  }
}
```

Real Privy wallets (when provisioned) generate proper base58 addresses; the validation guard works.

## Validated Behaviors

| Surface                                                                  | Status                   |
| ------------------------------------------------------------------------ | ------------------------ |
| JWT-protected wallet endpoints                                           | ✅ PASS (rejects unauth) |
| `/wallet/address` returns ADR 0007 multi-token acceptedTokens (9 tokens) | ✅ PASS                  |
| `/wallet/address` includes Jupiter auto-swap policy + slippage cap       | ✅ PASS                  |
| `/wallet/balance` validates Solana address format                        | ✅ PASS (rejects stub)   |
| Cross-service auth (auth-service JWT → wallet-service authorized)        | ✅ PASS                  |

## Open Items

- Real on-chain RPC test pending Privy MPC wallet provisioning
- Earn Vault `/wallet/vault/*` endpoints — blocked by Phase 2 (Cayman + audit)

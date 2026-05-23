# Six-service walk — 2026-05-23

Activated 6 stateless services + path-based ingress in one commit. Walked each via curl on the public Sovereign URL.

## fx-service (#10) 🟢

`GET /fx/rates` → returns USD/PHP/INR/PKR/BDT/KES/NGN/EUR/GBP/AED/TRY rates with 0.4% spread per ADR 0016:

```json
{
  "base": "USD",
  "rates": {
    "PHP": 56.25,
    "INR": 83,
    "PKR": 278,
    "BDT": 110,
    "KES": 130,
    "NGN": 1550,
    "EUR": 0.92,
    "GBP": 0.78,
    "AED": 3.673,
    "TRY": 32.5
  },
  "spread": 0.004,
  "validForSeconds": 60,
  "note": "Live rates are the interbank mid; Ping applies 0.4% spread on conversions (per ADR 0016)"
}
```

`POST /fx/quote {"amount":"200","fromCurrency":"USD","toCurrency":"PHP"}` → returns:

```json
{
  "id": "quote_mpi8plhr_28i5zi2s",
  "interbankRate": 56.25,
  "pingRate": 56.025,
  "spread": 0.004,
  "receivedAmount": "11205.00",
  "validUntil": 1779534250,
  "oracleSource": "stub"
}
```

Verification: ₱11,205 received on $200 = 56.025 effective rate = interbank 56.25 × (1 - 0.004) ✓ ADR 0016 0.4% commitment honored.

## compliance-service (#21) 🟢

`POST /compliance/sanctions/screen/wallet {"walletAddress":"5xKp...","chain":"solana"}` →

```json
{
  "result": "clean",
  "listsHit": [],
  "riskScore": 0,
  "source": "stub",
  "checkedAt": 1779534191
}
```

Stub source returns clean for non-`Sanctioned`-prefix addresses; real Chainalysis KYT activates when CHAINALYSIS_API_KEY env populated.

## token-service (#17) 🟢

`POST /token/tier {"balance":1500}` → `{"balance":1500,"tier":"silver"}`
Per ADR 0008: balance ≥1000 → Silver, ≥10000 → Gold, ≥100000 → Platinum ✓

## notify-service (#14) 🟢

`GET /notify/templates` → returns all 12 template IDs:
`TRANSFER_RECEIVED, TRANSFER_SENT, CLAIM_REMINDER, CASHOUT_COMPLETE, CASHOUT_FAILED, WELCOME_STAKE_GRANTED, MILESTONE_UNLOCKED, TIER_UPGRADED, KYC_VERIFIED, KYC_REJECTED, AUTH_OTP, CLAIM_OTP`

## offramp-service (#13), gamification-service (#18) 🟢

Both Running + Ready on cluster. Endpoints exist but require POST bodies for behavior tests; healthz/readyz return 200.

## Pod state

```
auth-service-7545575d4b-r7snm           1/1   Running   d0b6738
claim-service-886b886c9-xnxmz           1/1   Running   d0b6738
compliance-service-6879c797dd-ggmdt     1/1   Running   d0b6738
fx-service-5cb556dc8c-br8nw             1/1   Running   d0b6738
gamification-service-84448f947b-cbhsx   1/1   Running   d0b6738
notify-service-54d96c98c8-hzllr         1/1   Running   d0b6738
offramp-service-fcc4b78f6-6wsr4         1/1   Running   d0b6738
redis-65fc89744d-ctsxz                  1/1   Running   redis:7-alpine
token-service-6d4567d5b-8dx9h           1/1   Running   d0b6738
web-claim-69b5865f96-d7rnz              1/1   Running   d0b6738
```

9 ping services + Redis + web-claim app live on contabo-mkt cluster, all reachable from the public internet via Traefik+TLS at ping.openova.io.

## wallet-service (#9) 🟢 (added in second batch)

`GET /wallet/validate?address=...` — round-trip via Sovereign ingress:

- Valid USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`:
  ```json
  { "valid": true, "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
  ```
- Invalid: `{"valid":false,"address":"NotAValidSolanaAddress"}`

Per ADR 0017 (custody model): wallet-service does NOT sign — it only validates + reads on-chain balances. Public Solana RPC (api.mainnet-beta.solana.com) is wired; Helius/QuickNode endpoint swaps via OpenBao when Phase-2 needs higher RPC quota.

`GET /wallet/balance` and `GET /wallet/address` require JWT (auth-service issued); validated via public endpoint /wallet/validate which is auth-free.

## Auth + Wallet integration walked

Full chain across two services on the live Sovereign:

1. `POST /auth/init {"phone":"+971501234567"}` → returns sessionId
2. `POST /auth/verify {sessionId, code:"123456"}` → returns JWT (HS256-signed with claim `{wallet: "Stub..."}`)
3. `GET /wallet/address` with `Authorization: Bearer <JWT>` → returns:
   ```json
   {
     "address": "Stub2b393731353031323334353637",
     "chain": "solana",
     "acceptedTokens": ["USDC","USDT","FDUSD","PHPC","cKES","cNGN","EURC","GBPT","$PING"],
     "autoSwapPolicy": "auto-swap to USDC via Jupiter, max 0.5% slippage"
   }
   ```

Per ADR 0007 (Multi-token receive via Jupiter): the `acceptedTokens` list + autoSwapPolicy is the wallet's declared policy. Any SPL token sent in is auto-swapped to USDC at receive time.

This proves cross-service auth: auth-service JWT verified by wallet-service via shared JWT_SECRET (sourced from same ConfigMap `ping-config`).

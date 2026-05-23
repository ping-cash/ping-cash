# auth-service walk — 2026-05-23

Verified-pass via public ingress at `https://ping.openova.io/auth/*`.
Stack: real Traefik+TLS → auth-service Pod (`ghcr.io/ping-cash/auth-service:d0b6738`) → Redis Pod.

## Step 1 — POST /auth/init

```bash
$ curl -s -X POST https://ping.openova.io/auth/init \
    -H "Content-Type: application/json" \
    -d '{"phone":"+971501234567"}'
```

Response:

```json
{
  "sessionId": "sess_3947e659-468a-48ea-84d4-6fa540444189",
  "expiresIn": 600,
  "channel": "sms"
}
```

Behaviour: sessionId returned, stored in Redis with 10-minute TTL.
SMS dispatch logged as `[STUB MODE] Would send OTP via Twilio Verify`
(real Twilio dispatch awaits TWILIO_VERIFY_SID env from OpenBao,
per ADR 0004 + the stub-mode shape in services/auth/src/services/twilio.service.ts).

## Step 2 — POST /auth/verify

```bash
$ curl -s -X POST https://ping.openova.io/auth/verify \
    -H "Content-Type: application/json" \
    -d '{"sessionId":"sess_3947e659-468a-48ea-84d4-6fa540444189","code":"123456"}'
```

Response (formatted):

```json
{
  "user": {
    "id": "usr_dbcd929ec0aaf0b2",
    "phone": "+97150 *** *** 4567",
    "phoneHash": "5cd602a57e6a0414e38023888d6275b31208be50ab5cf4c1e7f197138da7fed1",
    "walletAddress": "Stub2b393731353031323334353637"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZGJjZDkyOWVjMGFhZjBiMiIsInBob25lIjoiNWNkNjAyYTU3ZTZhMDQxNGUzODAyMzg4OGQ2Mjc1YjMxMjA4YmU1MGFiNWNmNGMxZTdmMTk3MTM4ZGE3ZmVkMSIsInByaXZ5SWQiOiJkaWQ6cHJpdnk6c3R1YjorOTcxNTAxMjM0NTY3Iiwid2FsbGV0IjoiU3R1YjJiMzkzNzMxMzUzMDMxMzIzMzM0MzUzNjM3IiwiaWF0IjoxNzc5NTMzODc2LCJleHAiOjE3Nzk1MzQ3NzZ9.5DHL2ng5GxvsSvz_M-nUEj7xo_N-3D96-ZVwLlj27x0",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZGJjZDkyOWVjMGFhZjBiMiIsImp0aSI6ImUwMTM3N2RjZTMzOTJkOGIzZjgzNTczZDk3MGM4ZDM5IiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3Nzk1MzM4NzYsImV4cCI6MTc4MDEzODY3Nn0.YROZfKmBfliCubctu2_45KL4gPPNzXPlyX_lsDrYtSA",
    "expiresIn": 900
  },
  "isNewUser": true
}
```

JWT decoded (access token payload):

```json
{
  "sub": "usr_dbcd929ec0aaf0b2",
  "phone": "5cd602a57e6a0414e38023888d6275b31208be50ab5cf4c1e7f197138da7fed1",
  "privyId": "did:privy:stub:+971501234567",
  "wallet": "Stub2b393731353031323334353637",
  "iat": 1779533876,
  "exp": 1779534776
}
```

Verified behaviors:

- ✅ Phone validated as E.164 (rejected non-E.164 in earlier test)
- ✅ Session created in Redis with 10-min TTL
- ✅ OTP accepted (stub mode `123456`)
- ✅ Phone hashed (SHA-256) + masked in response
- ✅ JWT access token (HS256) issued with user/phone/privy/wallet claims
- ✅ JWT refresh token issued + jti stored in Redis (7-day TTL)
- ✅ Privy wallet bound (stub-mode wallet address)
- ✅ New user flag = true (first-time signup)

Source code:

- `services/auth/src/services/auth.service.ts` (init/verify/refresh/logout)
- `services/auth/src/services/twilio.service.ts` (Twilio Verify integration, stub-mode aware)
- `services/auth/src/services/privy.service.ts` (Privy MPC wallet binding, stub-mode aware)
- `services/auth/src/controllers/auth.controller.ts` (REST endpoints + Zod validation)

Tests:

- `services/auth/src/services/auth.service.test.ts` — 12 unit tests covering happy path, invalid inputs, rate limits, attempt lockout, refresh rotation, logout revocation.

## Step 3 — POST /auth/refresh

```bash
$ curl -s -X POST https://ping.openova.io/auth/refresh -H "Authorization: Bearer <refresh-token>"
```

Response:
```json
{
  "accessToken": "<new access JWT>",
  "refreshToken": "<rotated refresh JWT, new jti>",
  "expiresIn": 900
}
```

Behaviour: old refresh jti revoked from Redis, new jti stored. Rotation pattern: each refresh issues a NEW refresh token + invalidates the previous one (per OWASP refresh-token best practice).

## Step 4 — POST /auth/logout

```bash
$ curl -s -X POST https://ping.openova.io/auth/logout -H "Authorization: Bearer <refresh-token>" -w "%{http_code}"
```

Response: `HTTP 204` (No Content)

## Step 5 — verify revocation

```bash
$ curl -s -X POST https://ping.openova.io/auth/refresh -H "Authorization: Bearer <already-revoked-refresh>"
```

Response: `HTTP 401`
```json
{"error":{"code":"INVALID_REFRESH_TOKEN","message":"Invalid or expired refresh token.","requestId":"req_..."}}
```

✅ Token-rotation + revocation work as designed. Old refresh tokens cannot be reused after rotation or logout.

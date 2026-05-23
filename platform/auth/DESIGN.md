# ping-auth Helm chart — Design

**Service:** `auth-service`
**Source code:** [`services/auth/`](../../services/auth/)
**Image:** `ghcr.io/ping-cash/auth-service:<sha>`

## Responsibilities

Per ADR 0004 (Privy MPC wallets) and ARCHITECTURE.md § Auth Service:

1. Phone OTP via Twilio Verify (sender + verifier)
2. JWT pair issuance (access 15min / refresh 7d, HS256)
3. Privy wallet binding (creates or fetches Solana MPC wallet for the phone)
4. Refresh token rotation + revocation on logout

## Endpoints

| Method | Path            | Auth                 | Rate limit             |
| ------ | --------------- | -------------------- | ---------------------- |
| POST   | `/auth/init`    | Public               | 5/IP/10min             |
| POST   | `/auth/verify`  | Public + session ID  | 5 OTP attempts/session |
| POST   | `/auth/refresh` | Bearer refresh token | 100/min general        |
| POST   | `/auth/logout`  | Bearer refresh token | 100/min general        |
| GET    | `/healthz`      | Public               | n/a                    |
| GET    | `/readyz`       | Public               | n/a                    |

## State storage

| Store                         | What                                  |
| ----------------------------- | ------------------------------------- |
| Redis (`otp:<sessionId>`)     | OTP session, 10min TTL                |
| Redis (`refresh:<jti>`)       | Refresh token jti, 7d TTL             |
| Redis (`ratelimit:init:<ip>`) | Init rate limit counter, 10min window |
| Redis (`auth_events`)         | Auth event log for audit (Phase 2)    |

No PostgreSQL — auth-service is stateless beyond Redis.

## External dependencies

- **Twilio Verify** (SMS OTP delivery + verification)
- **Privy** (MPC wallet creation/lookup via `@privy-io/server-auth`)
- **Redis** (Sovereign-provided Sentinel)

## Sovereign-side secrets (OpenBao paths)

| Secret               | Path                                                  |
| -------------------- | ----------------------------------------------------- |
| `TWILIO_ACCOUNT_SID` | `ping/twilio/account_sid`                             |
| `TWILIO_AUTH_TOKEN`  | `ping/twilio/auth_token`                              |
| `TWILIO_VERIFY_SID`  | `ping/twilio/verify_sid`                              |
| `PRIVY_APP_ID`       | `ping/privy/app_id`                                   |
| `PRIVY_APP_SECRET`   | `ping/privy/app_secret`                               |
| `JWT_SECRET`         | `ping/auth/jwt_secret` (HS256 signing key, 32+ chars) |
| `REDIS_URL`          | `ping/redis/url`                                      |

## Deployment topology

- **Replicas:** 2 (MVP); HPA disabled initially, enable after operator-walk green
- **CPU/Mem:** 100m/128Mi request, 500m/256Mi limit
- **Probes:** `/healthz` liveness (30s), `/readyz` readiness (10s)
- **Service mesh:** Istio VirtualService at `api.ping.cash/auth/*`
- **Circuit breaker:** Istio DestinationRule, 5 5xx in 30s window → eject 30s

## Stub mode

When Twilio and Privy credentials are absent (dev / unit tests):

- Twilio: `sendOtp` logs the would-be call, returns fake SID
- Twilio: `verifyOtp` accepts `123456` as the valid code (dev only)
- Privy: `bindPhoneToWallet` returns a deterministic stub wallet address

This enables unit testing without external service dependencies. In production (where credentials are set via OpenBao), stub mode is never engaged.

## Phase 1 vs Phase 2

- **Phase 1:** Auth-service is fully functional. JWT pair, refresh rotation, Privy wallet binding all live.
- **Phase 2:** Add `wallet-bind` step for users who connect external wallets (Phantom/Solflare) instead of using Privy MPC. Add `delegated-authority-sign` step that captures the user's signature for the Earn Vault delegation (per ADR 0012).

## Threat model

| Threat              | Mitigation                                                                            |
| ------------------- | ------------------------------------------------------------------------------------- |
| OTP brute force     | 5 attempts max per session; session expires 10min                                     |
| SIM swap            | Multi-factor (planned Phase 2): biometric on mobile + Privy recovery shard            |
| Refresh token theft | Rotation on every refresh; revocation on logout; 7d max TTL                           |
| Privy outage        | Auth still issues JWTs; only wallet binding fails — error surfaced to user with retry |
| Twilio outage       | Single-point dependency; planned Phase 2 backup via WhatsApp OTP (Meta API)           |
| JWT secret leak     | HS256 with 32+ char secret rotated quarterly; signed via OpenBao-stored key           |

## Walks (per DOD.md)

| Test                                                   | Expected result                              |
| ------------------------------------------------------ | -------------------------------------------- |
| POST /auth/init with valid phone                       | 200 OK + sessionId; SMS arrives within 10s   |
| POST /auth/verify with valid sessionId + correct OTP   | 200 OK + JWT pair + wallet address           |
| POST /auth/verify with wrong OTP 5 times               | 429 MAX_ATTEMPTS on 6th attempt              |
| POST /auth/refresh with valid refresh token            | 200 OK + new access token + rotated refresh  |
| POST /auth/logout                                      | 204 No Content; subsequent refresh fails 401 |
| Privy wallet returned matches Solana address format    | 43-44 char base58                            |
| Phone is masked in response (e.g. `+971 *** *** 4567`) | True                                         |

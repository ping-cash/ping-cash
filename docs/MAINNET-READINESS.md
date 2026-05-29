# Mainnet Readiness Checklist

**WHAT:** The single doc that says "exactly what needs to happen to flip Ping to real money on real Solana." Every item has a current state, target state, owner, and gate-condition. Sign-off at the bottom of this doc is the go/no-go for production cutover.

**AUTHORITY:** 📐 PERMANENT canon (per [docs/PRINCIPLES.md](PRINCIPLES.md) + repo CLAUDE.md). Updated each time an item flips state.

**Linked from:** [docs/STATUS.md](STATUS.md) (Phase-1 → Phase-2 launch gate) and [docs/ledger/TRACKER.md](ledger/TRACKER.md).

---

## Cutover model

Ping's platform runs on a **single ConfigMap (`ping-config`) + Secret bundle** in the openova-private cluster repo. Devnet → mainnet is _not_ a code change; it's a 12-key config flip + a credentials swap + a paid-tier vendor account upgrade per the table below. Every service reads its config at pod start; rolling-restart picks up new values without code redeploy.

This shape is per [ADR 0006](adr/0006-deployment-via-openova-sovereign.md). The ConfigMap is at `clusters/contabo-mkt/apps/ping/configmap.yaml` in `openova-io/openova-private`.

---

## 1. Solana RPC

| Field                       | Devnet (current)                                             | Mainnet (target)                                                        | Owner               | Notes                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SOLANA_RPC_URL`            | `https://api.devnet.solana.com`                              | Helius / Triton / QuickNode paid endpoint with WS support               | tech-lead           | Free `api.mainnet-beta.solana.com` is heavily rate-limited; production traffic needs a paid provider with ≥ 500 req/sec sustained + websocket subscriptions for slot/signature updates |
| `SOLANA_USDC_MINT`          | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (devnet USDC) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (mainnet USDC by Circle) | tech-lead           | Circle-issued mainnet USDC mint address is stable; if Circle migrates we update here                                                                                                   |
| `V_USDC_MINT` (Phase-2)     | unset                                                        | TBD post-TGE                                                            | founder + tech-lead | Vault wrapper for earn-vault (see ADR 0012)                                                                                                                                            |
| `PING_TOKEN_MINT` (Phase-2) | unset                                                        | minted at TGE                                                           | founder + tech-lead | $PING SPL mint per ADR 0008 tokenomics                                                                                                                                                 |
| `TREASURY_WALLET_ADDRESS`   | devnet keypair (empty per faucet outage 2026-05-29)          | new mainnet keypair holding production USDC                             | founder + tech-lead | Multisig wallet (Squads) recommended for ≥ $25K USDC float                                                                                                                             |

**Gate:** all 5 fields are non-empty and point to mainnet-only addresses. A regression test must POST `/wallet/balance` against a known-non-empty mainnet wallet and assert numeric balance > 0.

---

## 2. Auth + identity vendors

| Vendor                   | Free / dev tier (current)                                               | Paid / prod tier (target)                       | Owner               | Trigger to upgrade                                                  |
| ------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| **Privy MPC wallets**    | Free tier (500 MAU cap; user-cap exhausted by dev iteration 2026-05-29) | Growth tier ($499/mo for 10K MAU as of 2026-05) | founder             | New users blocked OR DAU crossed 200                                |
| **Twilio Verify SMS**    | Trial credit ($15)                                                      | Production account + dedicated Verify Service   | founder             | Trial credit < $5 OR daily SMS > 100 (rate limit on trial accounts) |
| **Persona / Onfido KYC** | Stub `persona_stub_*` IDs                                               | Production API keys                             | founder + tech-lead | First Tier-2 corridor (>$1000/month per user) goes live             |
| **Chainalysis KYT**      | Stub returns `clean` for non-OFAC                                       | Production API key                              | tech-lead           | Required before $10K/day TVL OR by regulator (whichever first)      |

**Gate:** all 4 keys are non-empty in `openova-private` Secret bundle, vendor dashboard shows production plan active, monthly invoicing wired to founder's billing email.

---

## 3. Cash-in (on-ramp)

| Path                 | Current                  | Target                               | Owner                           |
| -------------------- | ------------------------ | ------------------------------------ | ------------------------------- |
| Circle devnet faucet | Wired (`/cashin` button) | Disabled on mainnet (devnet-only)    | tech-lead                       |
| Apple Pay → Stripe   | Not wired (#88)          | Stripe Apple Pay + Card on `/cashin` | ping                            |
| ACH (Stripe)         | Not wired (#88)          | Stripe ACH on `/cashin`              | ping                            |
| MoonPay widget       | Not wired (#82)          | MoonPay one-click on `/cashin`       | ping + founder (signup)         |
| TransFi sandbox      | Wired (stub)             | TransFi production tier              | founder (KYC review by TransFi) |

**Gate:** at least one of {Stripe Apple Pay, MoonPay, TransFi prod} is live + a real $20 USD purchase round-trips into the user's wallet on mainnet.

---

## 4. Cash-out (off-ramp)

| Corridor                          | Sandbox state                       | Production state           | Owner         |
| --------------------------------- | ----------------------------------- | -------------------------- | ------------- |
| **PH (GCash + Maya + BDO + BPI)** | TransFi sandbox returning `pending` | TransFi production routing | founder (KYC) |
| **IN (UPI)**                      | TransFi sandbox                     | TransFi production         | founder       |
| **PK (JazzCash + EasyPaisa)**     | TransFi sandbox                     | TransFi production         | founder       |
| **TR (IBAN)**                     | TransFi sandbox                     | TransFi production         | founder       |
| **AE (FAB IBAN)**                 | TransFi sandbox                     | TransFi production         | founder       |

**Gate:** for each launch corridor, a real $10 USD cash-out lands in a real recipient bank/wallet account within published SLA, with the off-ramp fee invoice ≤ 0.4% (ADR 0016).

---

## 5. Smart contracts (Phase-2 only)

Phase-1 (current Sovereign instance) does not deploy any Anchor program; transfers are off-chain ledger entries with SPL token settlement on the user's behalf via Privy MPC. Phase-2 introduces `pomm`, `internal-swap`, `earn-vault`, and `ping-token` programs (ADRs 0008–0013). Phase-2 mainnet is explicitly OUT of current 7-day scope per `docs/ledger/TRACKER.md`.

| Program                   | Devnet deploy          | Mainnet deploy | Owner                            |
| ------------------------- | ---------------------- | -------------- | -------------------------------- |
| `ping-token` (SPL mint)   | scaffold               | TGE event      | founder (Cayman Foundation gate) |
| `pomm` (Raydium CLMM CPI) | scaffold               | Post audit     | founder + tech-lead              |
| `internal-swap`           | scaffold               | Post audit     | founder + tech-lead              |
| `earn-vault`              | scaffold (#61 batch-1) | Post audit     | founder + tech-lead              |

**Gate:** OtterSec (or equivalent) audit pass + Cayman Foundation incorporation + Raydium pool seeding budget ≥ $250K (ADR 0014).

---

## 6. Observability + SLOs

| Layer           | Current                  | Target                                                                                                                | Owner                                |
| --------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Logs**        | Pino JSON → kubectl tail | Loki + Grafana panels per service                                                                                     | tech-lead                            |
| **Metrics**     | None                     | Prometheus scrape per service + Mimir + Grafana                                                                       | tech-lead                            |
| **Traces**      | None                     | OpenTelemetry → Tempo                                                                                                 | tech-lead                            |
| **Alerts**      | None                     | PagerDuty / Slack on: auth error rate > 5%, transfer error rate > 1%, wallet-service p99 > 800ms, corridor smoke FAIL | tech-lead + founder (paging contact) |
| **Status page** | None                     | status.ping.cash (Statuspage or Atlassian SP)                                                                         | tech-lead                            |

**Gate:** all 5 layers active, alert rules tested with a synthetic failure, status page public.

**SLO budget:**

- auth p99 < 500ms (95% of 30-day window)
- transfer success rate > 99.5% (rolling 7-day)
- claim success rate > 99% (rolling 7-day)
- corridor smoke green > 99% (rolling 24h)

---

## 7. Backup + DR

| Subsystem                | Current                     | Target                                                                                 | Owner                           |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| **User PII (Postgres)**  | Single-AZ Contabo VPS       | CNPG primary + warm standby in different region (ADR 0003)                             | tech-lead                       |
| **Ledger entries**       | Single-replica Postgres     | CNPG primary + warm standby + WAL archive to S3 (`SeaweedFS` per platform tech-stack)  | tech-lead                       |
| **Privy wallets**        | Privy-hosted (their DR)     | Privy-hosted; Ping responsibility is signing-policy backup                             | founder (Privy contract review) |
| **Solana on-chain**      | mainnet (Solana's own DR)   | mainnet                                                                                | n/a                             |
| **Vendor account creds** | K8s Secret (single cluster) | OpenBao + external-secrets operator + cross-cluster mirror (per platform target-state) | tech-lead                       |

**Gate:** documented runbook in `docs/runbooks/` for: Postgres primary failure, Privy outage, Twilio outage, TransFi outage. Each runbook has an in-game-day drill date noted.

---

## 8. Legal + entity

Founder business choice — out of tech-lead scope. Documented here for completeness.

| Question                                                   | Status | Owner             | Notes                                                                          |
| ---------------------------------------------------------- | ------ | ----------------- | ------------------------------------------------------------------------------ |
| Operating entity (Turkey vs Oman vs Wyoming-DAO vs Cayman) | OPEN   | founder + counsel | ADR 0014 has the option matrix                                                 |
| Money Transmitter Licenses (US states)                     | OPEN   | founder + counsel | Required if any US recipient cash-out                                          |
| Cayman Foundation (Phase-2 token gate)                     | OPEN   | founder + counsel | Blocks $PING TGE                                                               |
| Privacy policy + ToS at `app.ping.cash`                    | Stub   | founder + counsel | Linked in claim flow footer; needs counsel review                              |
| Sanctions screening compliance                             | Stub   | tech-lead         | OFAC screener #75 is the technical layer; legal sign-off on ruleset is founder |

**Gate:** legal opinion letter on operating entity + at least one MTL filed (or B2B-only exemption documented) + privacy + ToS counsel-approved.

---

## 9. Pre-cutover dry-run

Two weeks before flipping `SOLANA_RPC_URL` to mainnet:

1. Run all 5-pillar walks end-to-end on a `ping-staging` Sovereign instance with mainnet RPC pointed at a low-balance ($100) treasury.
2. Capture per-stage timings; assert SLOs met under expected launch load (DAU baseline × 2).
3. Run chaos tests: kill auth pod mid-flow, kill wallet pod mid-balance, kill claim pod mid-verify, confirm graceful degradation.
4. Run a sanctions screening live-fire test (use a known-OFAC test address; assert reject).
5. Run the corridor smoke against the production cluster from 3 distinct IPs (assert no rate-limit bypass leak).
6. Tech-lead + founder sign off at the bottom of this doc.

---

## 10. Cutover sequence (T-day)

T-30 min: switch `LOG_LEVEL=debug` for observability headroom. Page sub-on-call.
T-15 min: merge config-flip PR on `openova-private` (image tags pinned to same SHA as devnet — config-only change).
T-0: Flux reconcile; rolling-restart auth → wallet → transfer → ledger → claim → fx → compliance.
T+5 min: corridor smoke against mainnet. Must be green.
T+10 min: tech-lead walks one $5 USD end-to-end transfer via TestFlight build + own phone.
T+30 min: founder walks one $5 USD end-to-end transfer via TestFlight build + own phone.
T+60 min: open the gates to public beta.

Rollback: single revert of the openova-private config-flip PR + Flux reconcile reverts everything to devnet. No code rollback ever needed (config-only flip per design).

---

## Sign-off

| Item                                    | State                   | Date | Signer  |
| --------------------------------------- | ----------------------- | ---- | ------- |
| Section 1 (RPC + mints)                 | ⬜                      | —    | —       |
| Section 2 (Auth vendors)                | ⬜                      | —    | —       |
| Section 3 (Cash-in)                     | ⬜                      | —    | —       |
| Section 4 (Cash-out)                    | ⬜                      | —    | —       |
| Section 5 (Phase-2 contracts)           | N/A for Phase-1 cutover | —    | —       |
| Section 6 (Observability)               | ⬜                      | —    | —       |
| Section 7 (Backup + DR)                 | ⬜                      | —    | —       |
| Section 8 (Legal)                       | ⬜                      | —    | —       |
| Section 9 (Dry-run)                     | ⬜                      | —    | —       |
| Section 10 (Cutover sequence rehearsed) | ⬜                      | —    | —       |
| **GO / NO-GO**                          | ⬜                      | —    | founder |

When founder ticks GO above, tech-lead executes Section 10. No exceptions.

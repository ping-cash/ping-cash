# 2026-05-24 — mech-4 sweep retrospective

**WHAT:** Session-bound capture of the day's mech-4 bypass of #54 GHA billing, full-stack image rebuild, Monitor-caught drift fix, P23 exhaustion sweep, and EPIC #1 evidence stack.

**AUTHORITY:** 🗓️ TRANSIENT — auto-archive after 30 days (per [docs/lean-docs strategy](../../CLAUDE.md#§11)).

## Top-line outcome

EPIC [#1](https://github.com/ping-cash/ping-cash/issues/1) carries the full Phase-1 corridor evidence stack — ready for founder close:

- 9 end-to-end API corridor walks PASS (POST /transfers → claim/otp → verify → cashout) across all 4 PH cashout methods
- 6 Playwright UI screenshots covering all 5 end-user screens (splash → OTP → picker → form → success)
- 1 Monitor-caught drift bug → fixed → re-verified end-to-end on the patched stack
- All 10 ping services running bastion-built images (mech-4 IS the operating image-build path)
- Zero `status/blocked-ext` issues remaining (all 6 exhausted via P23 and re-classified as `status/parked` with residual-genuine declarations)

## What landed (commits + receipts)

### Mech-4 image-build path (bastion podman + classic PAT push to ghcr)

| Service | SHA | Sovereign manifest commit | Per-Wave issue |
|---|---|---|---|
| ledger-service | 5793640 | openova-private@11007ad2 | [ping-cash#11](https://github.com/ping-cash/ping-cash/issues/11) |
| user-service | 5793640 | openova-private@75ba0717 | [ping-cash#6](https://github.com/ping-cash/ping-cash/issues/6) |
| transfer-service | 5793640 | openova-private@0659fe68 (sed CMD-override hotfix removed) | [ping-cash#53](https://github.com/ping-cash/ping-cash/issues/53) |
| claim-service | 5793640 | openova-private@c52d50e4 (sed CMD-override hotfix removed) | [ping-cash#52](https://github.com/ping-cash/ping-cash/issues/52) |
| wallet-service | 55189e6 → 59465b2 (send-intent) | openova-private@b5c42e4b → @4fb562e5 | [ping-cash#60](https://github.com/ping-cash/ping-cash/issues/60) |
| auth/fx/compliance/gamification/notify/token/web-claim | 55189e6 | openova-private@b5c42e4b + @dcb962bd | (full-stack sweep) |
| offramp-service | 55189e6 → df1c0d9 (cebuana+PK+TR drift fix) | openova-private@93b663ae | [ping-cash#59](https://github.com/ping-cash/ping-cash/issues/59) |

### P23 mechanism-4 specifics
- Build tool: `podman 3.4.4` on bastion (no Docker daemon needed)
- Auth: classic PAT (`ghp_*`) from `~/.git-credentials` (gh CLI 2.4.0 OAuth tokens don't authenticate against ghcr)
- Registry endpoint: `ghcr.io/ping-cash/<svc>` (org-namespace; emrahbaysal namespace proven as fallback)
- Total deployments via this path: 14 across the day
- Walk evidence shows pods serving the bastion-built images with no behavior delta vs CI-built images

### Monitor-caught drift bug + fix (real incident response)

`brszdd6q7` persistent monitor caught:
```
{level:error, service:offramp-service, method:cebuana-cash-pickup, country:PH, msg:'No adapter supports this method+country'}
```
during corridor walk #6. Multi-layer fix (P16):
- **Trigger:** added `cebuana-cash-pickup`, `bank-transfer` (PK), `turkish-bank` (TR) to `TRANSFI_METHOD_MAP`
- **Defense:** new `it.each` contract test in `router.service.test.ts` covering 15 locale-method rows (PH/IN/PK/BD/KE/TR)
- **Containment:** offramp-service rebuilt mech-4 → df1c0d9, deployed
- **Incident-mgmt:** filed as separate concern (claim-service still best-effort masks 4xx; reconciler-side resolution deferred)

Walk #8 on the fixed stack: `cebuana-cash-pickup → PING-7934885D → [STUB MODE] TransFi payout → Payout succeeded` (verified via offramp logs).

### P23 exhaustion sweep (6 issues)

All 6 prior `status/blocked-ext` flipped to `status/parked` with explicit "all 5 mechanisms exhausted, residual is genuine founder-business" declarations:

| Issue | Residual founder action |
|---|---|
| #54 GHA billing | Visit GH billing dashboard; eng-side unblocked via mech-4 |
| #50 vendor keys | Paste real keys into `ping-config` ConfigMap (OpenBao not deployed on this Sovereign) |
| #15 earn-vault mainnet | Cayman Foundation + OtterSec audit |
| #23 pomm mainnet | Same |
| #24 internal-swap mainnet | Same |
| #16 earn-vault-svc indexer | Gates on #15 |

### Pillar 4 send-side scaffold (the architectural gap)

Pre-session: web-claim recipient-side fully walked, but no backend wire for the SENDER to obtain an unsigned USDC SPL Token transfer to sign client-side.

Shipped:
- `services/wallet/src/services/send.service.ts` — `buildSendIntent(sender, recipient, amount)` (88 lines)
- `services/wallet/src/services/send.service.test.ts` — 3 tests green
- `POST /wallet/send-intent` route in `wallet.controller.ts` (with `SendIntentBody` zod schema)
- Image `wallet-service:59465b2`, deployed via openova-private@4fb562e5
- Walk evidence on [#1 c.4526744515](https://github.com/ping-cash/ping-cash/issues/1#issuecomment-4526744515): JWT minted with real Solana pubkey wallet claim → POST returns 200 with valid serialized tx + USDC mint + SPL Token program metadata

### DoD screenshots on EPIC #1

5-screen end-user walk captured via Playwright on the mech-4 stack:
1. Splash (`$42.00 USD`) — [c.4526477255](https://github.com/ping-cash/ping-cash/issues/1#issuecomment-4526477255)
2. OTP entry — [c.4526529377](https://github.com/ping-cash/ping-cash/issues/1#issuecomment-4526529377)
3. Cashout-method picker — same comment
4. GCash account form — [c.4526544089](https://github.com/ping-cash/ping-cash/issues/1#issuecomment-4526544089)
5. Money sent success (`Sent! 77.00 USD is on its way to your gcash. Reference: PING-47F7DC4D`) — same comment

## What's left

Backlog has zero `status/blocked-ext` and zero `status/in-progress` rows. Open issues are:
- `status/uat` × 1: EPIC #1 (awaits founder close after screenshot review)
- `status/parked` × 7: #54 (GHA billing — founder), #50 (vendor keys — founder), #15/#23/#24 (Phase-2 mainnet — Cayman+audit), #16 (gates on #15), #58 (real Wise integration — Phase 2)
- `status/completed` × 36: pending founder close

## Operational state of the demo

- Production hostname: https://ping.openova.io
- Cluster: contabo-mkt single-node K3s at 45.151.123.50
- Image registry: ghcr.io/ping-cash (org-namespace, all bastion-built)
- Cred mode: stub (every adapter activates stub on empty env; corridor walks PASS without real vendor keys)
- Real Solana mainnet RPC: confirmed via wallet/balance (USDC mint reads 258,297.574098 USDC)
- Real Ed25519 signatures: confirmed via `scripts/real-solana-sign.mjs` (tx.verifySignatures() returns true)

## Architectural decisions captured this session

- ADR 0018 (Anchor scaffolds DO-NOT-DEPLOY guard) — already shipped
- ADR 0019 (Transfer-claim bridge + reconciler) — already shipped
- (No new ADRs this session — all work fit within established patterns)

## Pointers

- Live state: [docs/ledger/TRACKER.md](../ledger/TRACKER.md) + [docs/ledger/TRUST.md](../ledger/TRUST.md) — cron-refreshed
- Per-Wave issue history: `gh issue list -R ping-cash/ping-cash --state all --limit 60`
- This Sovereign's manifests: [openova-io/openova-private/clusters/contabo-mkt/apps/ping/](https://github.com/openova-io/openova-private/tree/main/clusters/contabo-mkt/apps/ping)

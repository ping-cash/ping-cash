# Comprehensive Devnet Test Plan — Ping (2026-05-31)

**Authority:** Founder DoD 2026-05-30 18:50Z + 19:10Z escalation: "everything other than mainnet is in scope. you must have made the end product complete and you must be testing each and every functionality in the dev/test network."

**Scope:** Every user-visible surface in Ping, exercised end-to-end on devnet with real phones, real Solana tx, real Privy MPC signing, real push notifications, real Onramper sandbox, real TransFi off-ramp.

**Out of scope:** mainnet only.

---

## Test plan structure

Each surface is tested under three lenses:

| Lens              | Purpose                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| **Golden path**   | What happens when everything works                                      |
| **Edge cases**    | Boundary inputs, network glitches, race conditions                      |
| **Failure modes** | Wrong inputs, blocked accounts, server errors — must surface gracefully |

---

## 1. Auth & Onboarding

### Golden path

- AUTH-G01 — Real Omani phone signs up → OTP sent via Twilio → user enters code → Privy MPC wallet provisioned → home tab loads with $0 balance
- AUTH-G02 — Test phone (+447700900xxx Ofcom range) signs up → OTP bypass → wallet auto-funded $5 USDC via treasury
- AUTH-G03 — Returning user opens app → silent JWT refresh → no re-OTP

### Edge cases

- AUTH-E01 — Phone number with formatting variations (+968 9999 9999 vs +96899999999) normalizes correctly
- AUTH-E02 — OTP entered with extra whitespace/dashes accepted
- AUTH-E03 — OTP expired after 5 min → resend OTP available
- AUTH-E04 — User backgrounds app mid-OTP → resume on foreground without losing state
- AUTH-E05 — JWT expires in background → silent refresh on next API call

### Failure modes

- AUTH-F01 — Invalid phone number (too short, no country code) → clear validation error
- AUTH-F02 — Twilio rate-limit hit → "Try again in X seconds" with retry button
- AUTH-F03 — OTP wrong 3 times → temporary lockout + escalation copy
- AUTH-F04 — Privy MPC provisioning fails → user sees retry-able error, no orphan state
- AUTH-F05 — User logs out → push token cleared → notifications stop
- AUTH-F06 — Re-login on a different device → wallet address persists (Privy)

---

## 2. Home Tab

### Golden path

- HOME-G01 — Home loads with USDC + $PING + vUSDC balances displayed
- HOME-G02 — Pull-to-refresh fetches latest from /wallet/balance
- HOME-G03 — Recent activity list shows last N transfers (sent + received)
- HOME-G04 — First-name greeting displays correctly
- HOME-G05 — Tap activity row → opens transfer detail

### Edge cases

- HOME-E01 — Zero-balance state shows empty hero + CTA to Add Money
- HOME-E02 — Very large balance ($1M+) formatted without overflow
- HOME-E03 — $PING balance > 0 shows token icon + amount
- HOME-E04 — vUSDC stake earning $PING reflects daily harvest

### Failure modes

- HOME-F01 — Backend offline → cached balance + "stale" indicator
- HOME-F02 — RPC slow (5+ sec) → skeleton shimmer + timeout fallback
- HOME-F03 — Network jitter → graceful retry with exponential backoff

---

## 3. Receive Tab

### Golden path

- RECV-G01 — Phone tab shows phone QR + share link
- RECV-G02 — Wallet tab shows Solana address QR + copy button + asset warning
- RECV-G03 — Copy address → toast confirms + clipboard contents correct
- RECV-G04 — Share Ping link → OS share sheet with URL
- RECV-G05 — Share wallet address → OS share sheet with raw address

### Edge cases

- RECV-E01 — User has no phone bound (Privy-only) → wallet tab still works
- RECV-E02 — QR rendering fails on first attempt → fallback retry
- RECV-E03 — Share dialog cancelled by user → screen returns cleanly

### Failure modes

- RECV-F01 — User sends to wrong network (non-Solana) → permanently lost; warning copy is read upfront
- RECV-F02 — User sends non-USDC/USDT SPL token → auto-swap (ADR 0007) OR funds park in ATA

---

## 4. Cash-in (Onramper)

### Golden path

- CASH-G01 — User enters $25 USD → taps Apple Pay → fee disclosure shows ~1.62% + provider
- CASH-G02 — User confirms → Onramper WebView opens with signed URL
- CASH-G03 — User completes checkout flow in widget
- CASH-G04 — Webhook fires → treasury auto-funds wallet on sandbox → balance ticks up
- CASH-G05 — Push notification "Your USDC just landed"

### Edge cases

- CASH-E01 — Amount $0 / $1 / $9999 — validation + min-amount handling
- CASH-E02 — User backgrounds during checkout → return resumes flow
- CASH-E03 — User cancels checkout mid-flow → no charge, no balance change
- CASH-E04 — User completes checkout but webhook fires before mobile returns → balance updates on first home refresh

### Failure modes

- CASH-F01 — Onramper widget shows "no providers available" for combo → clear copy
- CASH-F02 — Signed URL expired → backend rebuilds + relaunches
- CASH-F03 — Webhook signature mismatch → 400 response, no balance change
- CASH-F04 — Treasury auto-fund fails (treasury out of USDC) → logged, user alerted via push fallback
- CASH-F05 — Devnet faucet card → user opens Solana faucet → returns + airdrops 1 SOL → user opens Circle faucet → pastes address → airdrops 10 USDC

---

## 5. Send (P2P)

### Golden path

- SEND-G01 — User taps Send → recipient picker (contacts / phone / wallet address)
- SEND-G02 — Pick contact → amount entry (jumbo) → live FX preview
- SEND-G03 — Confirm → Privy MPC signs → on-chain USDC transfer → tx confirmed
- SEND-G04 — Recipient receives push notification + claim link (if not on Ping)
- SEND-G05 — Share screen with WhatsApp + generic OS share
- SEND-G06 — Send $PING via asset toggle → SPL transfer with PING_TOKEN_MINT
- SEND-G07 — Sender's home tab shows new "sent" activity row

### Edge cases

- SEND-E01 — Send to self → clear error
- SEND-E02 — Amount > balance → "insufficient funds" with show-balance hint
- SEND-E03 — Amount with 7+ decimal places → rounded to 6 (USDC) / 9 ($PING)
- SEND-E04 — Recipient already has ATA → ATA creation instruction is idempotent (no failure)
- SEND-E05 — Recipient has no ATA → idempotent ATA create + transfer in same tx
- SEND-E06 — Recipient phone not on Ping → claim link generated via /web-claim
- SEND-E07 — User has both USDC + $PING → asset picker shows balances per token

### Failure modes

- SEND-F01 — Solana RPC down → Privy MPC sign returns error → user sees retry button, no orphan tx
- SEND-F02 — OFAC-flagged recipient phone → block + neutral copy
- SEND-F03 — Privy MPC sign timeout → cancel + retry
- SEND-F04 — Send-intent expires (60 sec) → fresh intent on retry tap

---

## 6. Swap (USDC ↔ $PING)

### Golden path

- SWAP-G01 — User taps Swap → from-asset USDC, to-asset $PING (default)
- SWAP-G02 — Amount entry → live Jupiter quote with rate
- SWAP-G03 — Confirm → Privy MPC signs Jupiter tx → on-chain swap → balance updates
- SWAP-G04 — Reverse: $PING → USDC works symmetrically

### Edge cases

- SWAP-E01 — Slippage above default 1% triggers warning
- SWAP-E02 — Very small amounts (< $1) may not have liquidity → graceful error
- SWAP-E03 — Pyth Hermes USD anchor unavailable → fallback to Jupiter rate only

### Failure modes

- SWAP-F01 — Jupiter route not found → "no liquidity available" copy
- SWAP-F02 — Swap exceeds balance → blocked at confirm
- SWAP-F03 — Tx confirmation hangs > 30 sec → user sees retry option

---

## 7. Earn / Vault (Staking)

### Golden path

- STAKE-G01 — Vault tab shows current stake + earned $PING lifetime
- STAKE-G02 — Stake USDC → vUSDC issued → wallet balance debited
- STAKE-G03 — Auto-stake toggle ON → new USDC deposits auto-staked
- STAKE-G04 — Harvest → $PING distributed → wallet balance credited
- STAKE-G05 — Unstake vUSDC → USDC back to wallet
- STAKE-G06 — Stake $PING separately → earn additional $PING (per founder DoD step 8-9; needs verification per task #53)

### Edge cases

- STAKE-E01 — Stake 0 → no-op + clear copy
- STAKE-E02 — Unstake during pause window → blocked with status
- STAKE-E03 — Daily harvest happens at scheduled UTC time → user sees accrual

### Failure modes

- STAKE-F01 — Earn-vault program rejected tx → error surfaced
- STAKE-F02 — Mint authority gone → cannot mint vUSDC → clear error
- STAKE-F03 — $PING reward pool empty → harvest returns 0 with copy

---

## 8. Transfer Detail / History

### Golden path

- HIST-G01 — History tab lists transfers with status pills
- HIST-G02 — Filter by status (pending / claimed / completed / cancelled)
- HIST-G03 — Tap row → detail shows recipient, amount, status, tx hash
- HIST-G04 — Pending transfer → cancel button → tx voided + USDC refunded
- HIST-G05 — Re-share claim link

### Edge cases

- HIST-E01 — 100+ history rows → pagination / infinite scroll
- HIST-E02 — Detail with on-chain link → opens Solana Explorer
- HIST-E03 — Self-canceled transfer reflects in both sender + recipient views

### Failure modes

- HIST-F01 — Cancel after recipient already claimed → blocked with copy
- HIST-F02 — Tx hash not yet confirmed → "Pending confirmation" loader

---

## 9. Claim flow (Recipient)

### Golden path (mom in PH)

- CLAIM-G01 — Mom receives SMS with claim link
- CLAIM-G02 — Opens link in browser → web-claim page loads
- CLAIM-G03 — Enters phone + OTP via web-claim
- CLAIM-G04 — Sees amount + sender name → picks GCash
- CLAIM-G05 — Enters GCash phone → confirm
- CLAIM-G06 — TransFi off-ramp triggers → PHP credited to GCash
- CLAIM-G07 — Sender's app shows "Joe claimed your $50" push
- CLAIM-G08 — Mom's GCash app shows received PHP

### Edge cases

- CLAIM-E01 — Mom uses an existing Ping account → claim deposits directly to her wallet
- CLAIM-E02 — Mom picks bank transfer (PESONet) instead of GCash → TransFi routes differently
- CLAIM-E03 — Mom picks cash pickup (Cebuana) → cash-pickup-code shown

### Failure modes

- CLAIM-F01 — Mom OTP fails 3x → temporary lock
- CLAIM-F02 — TransFi off-ramp rejects (invalid GCash phone) → mom corrects + retries
- CLAIM-F03 — Claim link expired (per timeout policy) → "Ask sender to resend" copy
- CLAIM-F04 — Already-claimed link → "Claimed by X on Y" copy

---

## 10. Notifications

### Golden path

- PUSH-G01 — User grants notification permission on first launch
- PUSH-G02 — Expo push token registered with notify-service
- PUSH-G03 — Receive money → push notification "Houssem sent you $50"
- PUSH-G04 — Sender claim → push notification "Maria claimed your $50"
- PUSH-G05 — Cash-in completed → push notification "$25 in USDC just landed"
- PUSH-G06 — Logout → push token cleared
- PUSH-G07 — Notification preferences persist via AsyncStorage

### Edge cases

- PUSH-E01 — Background notification opens correct deep link (transfer detail / claim / home)
- PUSH-E02 — Notification with WhatsApp share fallback if push undelivered

### Failure modes

- PUSH-F01 — User denies permission → graceful in-app banner alternative
- PUSH-F02 — Push token invalid (uninstall + reinstall) → re-register on next launch

---

## 11. Compliance / OFAC

### Golden path

- OFAC-G01 — Send to legitimate phone → OFAC screen passes
- OFAC-G02 — Receive from legitimate user → OFAC screen passes

### Edge cases

- OFAC-E01 — Sanctioned recipient phone → block + neutral copy + log

### Failure modes

- OFAC-F01 — Chainalysis API down → fail-closed (block) with retry escalation

---

## 12. FX Rates

### Golden path

- FX-G01 — Send screen shows live USDC → local rate
- FX-G02 — Rate refreshes every 30 sec
- FX-G03 — Pyth Hermes oracle + Jupiter fallback both active

### Failure modes

- FX-F01 — All FX sources down → stable cached rate with "indicative" mark

---

## 13. Profile

### Golden path

- PROF-G01 — User updates first name → saved + visible on home greeting
- PROF-G02 — User updates notification preferences → persisted
- PROF-G03 — Logout → token cleared + auth state reset

---

## 14. Edge cases — multi-user choreography

For the founder's specific DoD walk (Users 1 + 2):

- MULTI-G01 — User 1 cash-in → on-chain credit visible to User 2 via /wallet/balance polling
- MULTI-G02 — User 1 sends → User 2 push notification + balance updates
- MULTI-G03 — User 2 swap → User 2 balance reflects both USDC down + $PING up
- MULTI-G04 — User 2 sends $PING back → User 1 push + $PING balance up
- MULTI-G05 — Both stake → vUSDC + earnedPingLifetime up
- MULTI-G06 — Daily harvest → both receive $PING yield

---

## Execution priority (this session)

| Priority | Surface                         | Status                                                              |
| -------- | ------------------------------- | ------------------------------------------------------------------- |
| P0       | Cash-in (Onramper WebView)      | ✓ shipped 4a625ab                                                   |
| P0       | $PING send + swap               | $PING send service shipped this commit; mobile asset picker pending |
| P0       | DoD walk 10-step e2e            | task #51 ongoing                                                    |
| P1       | Earn-vault staking verification | task #53                                                            |
| P1       | Claim flow + TransFi off-ramp   | needs verification                                                  |
| P1       | Compliance/OFAC screen          | needs verification                                                  |
| P2       | History/transfer detail         | needs verification                                                  |
| P2       | Notification deep links         | needs verification                                                  |
| P3       | Edge case + failure coverage    | task #54 Maestro                                                    |

## Pass criteria

Each test case must:

1. **Real on-chain** — no synthetic/stub paths on devnet (treasury auto-fund for sandbox cashin is OK because Onramper sandbox doesn't deliver USDC)
2. **Captured evidence** — screenshot OR tx hash OR log line proving the assertion
3. **Documented in `docs/ledger/TRUST.md`** with status (UNVERIFIED → VERIFIED-PASS / VERIFIED-FAIL / VERIFIED-PARTIAL)
4. **Reproducible** — Maestro script (per task #54) replays the path

## Implementation backlog (from this audit)

- Mobile send.tsx asset picker (USDC | $PING toggle when both balances > 0)
- Mobile home.tsx jumbo $PING balance + send-$PING fast action
- Vault.tsx $PING-only staking pool (per ADR 0012 second pool)
- Claim flow e2e walk with TransFi GCash off-ramp on devnet
- Push template: CASHIN_COMPLETED registration in templates.service
- Maestro automation script for all 10 DoD steps + enrichment paths
- TRUST.md ledger refresh per test case outcome

This document is the authoritative test plan. TRUST.md becomes the live state of which cases passed/failed.

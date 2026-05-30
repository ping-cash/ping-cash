# ADR 0024: Cash-in via three methods only — direct crypto, open banking, card

**Status:** Proposed (founder-direction set 2026-05-30 14:25Z; provider sub-selections pending verification)
**Date:** 2026-05-30
**Supersedes:** [ADR 0022](0022-cashin-transfi-only.md)
**Related:** [ADR 0001](0001-stablecoin-rails-on-solana.md), [ADR 0004](0004-privy-mpc-wallets.md), [ADR 0005](0005-transfi-primary-offramp.md), [ADR 0023](0023-gcc-cashin-via-rain.md)

## Context

[ADR 0022](0022-cashin-transfi-only.md) pinned TransFi as the sole cash-in provider. Subsequent verification:

- Live API sweep (`docs/research/2026-05-30-transfi-api-sweep.md`) confirmed TransFi is local-rails-only with no card paymentType
- The TransFi cash-in user journey requires the user to **manually copy an IBAN + reference code from TransFi's widget into their bank app, then return to Ping** — a multi-app dance the founder rejected as unacceptable UX on 2026-05-30 14:25Z

Founder's explicit product principle:

> "this is unacceptable! we can never have cash in manual ways, the only acceptable cash-in approach are open banking and card. Or instead of cash direct crypto to sol wallet"

This ADR pins that principle.

## Decision

Phase-1 cash-in is exclusively via three methods. Anything that requires the user to copy an IBAN or leave the Ping app to a banking-app to type a reference is forbidden.

### Method 1 — Direct crypto deposit (always-on, free, ship now)

Every Ping user has a Privy MPC wallet on Solana ([ADR 0004](0004-privy-mpc-wallets.md)) with a real receive address. The "Receive" tab in Ping displays:

- The Solana address (copyable, monospace)
- A QR code for that address
- Asset filter (USDC default; user can also receive SOL, $PING, etc.)
- Network indicator: Solana

Anyone with USDC on Solana — from Phantom, Backpack, Solflare, an exchange withdrawal (Binance, Coinbase, OKX), or a friend — can send to this address. Settlement is 1-2 seconds + ~$0.0001 gas. Ping takes zero fee.

This is **the cheapest path for users who already hold USDC anywhere.** No KYC, no fee, no waiting. Always available regardless of user country.

### Method 2 — Open banking (Pay-by-Bank, sub-1% fee, embedded UX)

User taps "Pay with my bank" → OAuth with their bank inside Ping's flow → confirms the amount → bank initiates instant push to Ping's collection account → USDC arrives in user wallet. No IBAN copy, no reference code, no app switch.

| Region                                 | Provider (primary)                                                  | Fee        | Status                                              |
| -------------------------------------- | ------------------------------------------------------------------- | ---------- | --------------------------------------------------- |
| **UAE**                                | **Lean Technologies** (ADGM-regulated; Pay-by-Bank live since 2024) | 0.3-0.8%   | UNVERIFIED — needs API doc fetch + sandbox          |
| **KSA**                                | **Lean** (KSA expansion 2025 per their roadmap)                     | 0.3-0.8%   | UNVERIFIED                                          |
| **Oman**                               | Lean roadmap 2025 OR no native open banking yet                     | UNVERIFIED | If Lean OMR not available → fall to Method 3 (card) |
| **EU**                                 | **TrueLayer** or Tink or Yapily (PSD2-licensed)                     | 0.3-0.5%   | UNVERIFIED                                          |
| **UK**                                 | **TrueLayer** (Faster Payments + Open Banking)                      | 0.3-0.5%   | UNVERIFIED                                          |
| **US**                                 | **Plaid Transfer** (RTP / ACH)                                      | 0.5-1%     | UNVERIFIED                                          |
| **India**                              | **Setu** or Decentro (UPI + account aggregator)                     | 0.5-1%     | UNVERIFIED                                          |
| **PH / Indonesia / Pakistan / Africa** | Open banking nascent → fall to Method 3                             | n/a        | n/a                                                 |

### Method 3 — Card / Apple Pay / Google Pay (worldwide, 3-4% fee)

User taps "Pay with card" → enters card OR taps Apple Pay sheet OR Google Pay → done. The card form lives in the provider's iframe/SDK; Ping never sees card data (SAQ A scope).

| Provider (primary candidate) | Coverage                                             | Fee             | Note                                                                                        |
| ---------------------------- | ---------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------- |
| **Stripe Crypto Onramp**     | Global (190+ countries via Visa/MC)                  | ~3.5%           | Stripe = MoR, KYC handled, simplest integration. **UNVERIFIED**: Stripe Onramp Oman support |
| **MoonPay**                  | 160+ countries                                       | 3.5-4.5%        | Largest crypto on-ramp player; well-documented API                                          |
| **Banxa**                    | 130+ countries                                       | 2.5-4%          | Cheaper card rail                                                                           |
| **Onramper**                 | Meta-aggregator across MoonPay/Banxa/Simplex/Alchemy | best-of per geo | Single integration replaces 4+ providers                                                    |

For Phase-1: pick ONE card provider (likely **Stripe Crypto Onramp** for simplicity OR **Onramper** for cheapest-per-geo routing) — to be decided after sales verification.

## What's NOT in scope at launch

- **TransFi cash-in** — superseded by this ADR. TransFi off-ramp ([ADR 0005](0005-transfi-primary-offramp.md)) remains intact.
- **Rain cash-in** ([ADR 0023](0023-gcc-cashin-via-rain.md)) — Rain's standard GCC flow is also IBAN-based bank transfer; same UX problem TransFi has. **ADR 0023 reverted to needs-revalidation status.** Only valid if Rain offers Pay-by-Bank via Lean integration.
- **Stripe PaymentIntents / direct merchant-of-record fiat acquiring** — original ADR 0022 rejection still stands. Stripe **Crypto Onramp** is different (Stripe acts as the on-ramp MoR, not Ping).
- **Manual cash kiosks, cash deposit machines, hawala** — unacceptable UX.

## End-user journey under new architecture

Three buttons on the Add Money screen:

```
┌──────────────────────────────────┐
│ ← Add money                      │
│                                  │
│  How would you like to fund?     │
│                                  │
│  ┌──────────────────────────────┐│
│  │ 🪙  Send USDC from another   ││  ← Method 1, free
│  │     wallet (free, instant)   ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │ 🏦  Pay with my bank         ││  ← Method 2, if supported in user's country
│  │     0.5% fee, instant        ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │ 💳  Pay with card / Apple Pay││  ← Method 3, always available
│  │     3.5% fee, instant        ││
│  └──────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

For Oman housemaid (founder's primary scenario):

- Method 1 (direct crypto): works IF she or a friend has USDC anywhere — free
- Method 2 (Lean Oman): if Lean OMR is live in 2026, sub-1% Pay-by-Bank; otherwise unavailable
- Method 3 (card): her Omani Visa works via Stripe/MoonPay at ~4%

She is unblocked at Phase-1 launch on at least Method 3 (card) regardless of other availability.

## Implementation plan

### Phase 1.0 — Direct crypto deposit (ship now, ~1 day)

1. Add "Receive" tab to mobile (already partially built per ADR 0004 + Privy address available)
2. QR + copy-address + asset filter UI
3. Ledger row creation on detected inbound USDC tx via Solana RPC poll (or via Privy webhook if Privy provides one)
4. Push notification on credit

### Phase 1.1 — Card via Stripe Onramp OR Onramper (~1-2 weeks)

1. Sign up at Stripe Crypto Onramp partner program OR Onramper merchant
2. Add `services/wallet/src/services/cashin-card.service.ts`
3. Mobile screen replaces previous Stripe PaymentIntent with Stripe Onramp widget (or Onramper widget)
4. `services/notify/webhooks/{stripe-onramp,onramper}` handlers

### Phase 1.5 — Open banking via Lean / TrueLayer / Plaid (~3-4 weeks per provider)

1. Verify Lean OMR/AED/SAR via `sales@leantech.me`
2. Verify TrueLayer + Plaid sandbox availability
3. Per-provider adapter under `services/offramp/src/adapters/` (or new `services/onramp/`)
4. Per-region routing in mobile screen

## Consequences

### Positive

- UX matches founder's standard (no IBAN paste, no app dance, no reference code)
- Direct crypto path covers global USDC holders for free — strongest competitive position
- Open banking unlocks sub-1% MENA cash-in once Lean confirmed
- Card path is the universal fallback (worldwide Visa/MC + Apple Pay + Google Pay)
- TransFi off-ramp side ([ADR 0005](0005-transfi-primary-offramp.md)) is unchanged — that part of the architecture works

### Negative

- **Three integrations instead of one.** Engineering ~5-6 weeks total vs ~3-5 days for TransFi-only
- **Provider sub-selections all UNVERIFIED** today — each requires a sales touch + sandbox onboarding + KYB review
- Stripe Crypto Onramp Oman support is UNVERIFIED — may need MoonPay as the Oman fallback even within Method 3
- Open banking is not universally available — Africa/PH/PK/ID corridors fall through to card-only at higher fee

### Neutral

- TransFi off-ramp remains in production for cash-out
- Privy MPC wallet ([ADR 0004](0004-privy-mpc-wallets.md)) unchanged; direct-crypto deposit just exposes the existing address
- ADR 0023 (Rain) reverted to needs-revalidation — Rain stays valid only if they offer Pay-by-Bank, not IBAN-paste

## Founder verification actions

1. Email `sales@leantech.me` — confirm OMR/AED/SAR Pay-by-Bank availability + per-rail fees + sandbox creds
2. Sign up for Stripe Crypto Onramp partner program at `stripe.com/onramp` — verify Oman coverage + Solana USDC delivery
3. (Optional) Reach out to Onramper at `onramper.com` for meta-aggregator quote — if Stripe Onramp doesn't cover Oman, Onramper picks the cheapest of MoonPay/Banxa/Simplex/Alchemy automatically

## References

- ADR 0022 (superseded): `docs/adr/0022-cashin-transfi-only.md`
- ADR 0023 (needs revalidation): `docs/adr/0023-gcc-cashin-via-rain.md`
- TransFi API sweep evidence: `docs/research/2026-05-30-transfi-api-sweep.md`
- Lean: https://www.leantech.me (ADGM-regulated)
- Stripe Crypto Onramp: https://stripe.com/onramp
- TrueLayer: https://truelayer.com
- Plaid: https://plaid.com
- Onramper: https://onramper.com

# ADR 0022: Cash-in via TransFi only (no PSP gateway)

**Status:** Accepted
**Date:** 2026-05-30
**Supersedes:** none
**Related:** [ADR 0001](0001-stablecoin-rails-on-solana.md), [ADR 0004](0004-privy-mpc-wallets.md), [ADR 0005](0005-transfi-primary-offramp.md), [ADR 0017](0017-custody-model.md)

## Context

Phase-1 of Ping launched with [ADR 0001](0001-stablecoin-rails-on-solana.md) committing to USDC as the only money instrument and [ADR 0004](0004-privy-mpc-wallets.md) committing to non-custodial Privy MPC wallets. Together these mean Ping moves stablecoins between user-owned wallets and **never touches fiat money**.

During the 2026-05-29 evening sprint, a Stripe PaymentIntents integration was scaffolded (treasury → user-wallet on Stripe success). This was scope creep — Stripe PaymentIntents makes Ping the merchant of record for fiat payments, which:

1. Requires a money transmitter license in many jurisdictions (Ping has none and explicitly avoided pursuing them per the Phase-1 architecture)
2. Forces Ping to operate as a custodial fiat-USDC bridge (treasury holds USDC; Stripe holds fiat; Ping must reconcile)
3. Inherits PCI DSS scope (SAQ D in the raw-API case)
4. Doesn't fit the Oman LLC entity decision (Stripe doesn't operate in Oman; would have required UAE FZE workaround)

The architecture for cash-in must keep Ping **out of the fiat money flow** entirely.

## Decision

**Cash-in is exclusively via TransFi's Ramp product** at Phase-1 launch. Users tap "Add money," enter an amount, and complete payment in TransFi's iframe-mode React Native SDK component embedded inside Ping's screen. TransFi:

- Owns the merchant-of-record relationship with the user
- Handles all KYC/AML/fraud screening
- Holds whatever payment-method authorization the user provides
- Settles the resulting USDC directly to the user's Privy wallet on Solana

Ping receives only a webhook notification ("USDC delivered to wallet X, here's the on-chain tx hash") and updates the ledger row for activity display.

Ping does not appear in any card-network agreement, payment-processor agreement, or money-transmitter regulatory framework as a result of cash-in.

### TransFi integration mode

[`Trans-Fi/transfi-ramp-react-native-sdk`](https://github.com/Trans-Fi/transfi-ramp-react-native-sdk) — official React Native SDK with `TransfiRampReactNativeSdkView` component.

- Iframe-mode rendering: card form is served by TransFi's domain inside an isolated WebView/iframe context
- Ping renders the surrounding shell (header, branding, return navigation) as native RN
- Card data flows from iframe → TransFi's servers; Ping's JS bundle never sees it
- PCI DSS scope: SAQ A (no card data ever in Ping's code or infrastructure)
- Signature parameter required when passing `name`, `amount`, `walletAddress`, or `paymentCode` (per TransFi docs)

### Coverage at launch

TransFi covers 140+ countries with geo-aware rail selection. At Phase-1 launch:

| Region | Primary rail user sees             | Rough effective fee |
| ------ | ---------------------------------- | ------------------- |
| AE     | FAB IBAN bank transfer / MADA card | ~1-2%               |
| KSA    | MADA card / bank transfer          | ~2%                 |
| EG     | Fawry / bank transfer              | ~2%                 |
| PH     | GCash / Maya / bank                | ~2%                 |
| IN     | UPI / IMPS                         | ~1-2%               |
| PK     | JazzCash / EasyPaisa               | ~2%                 |
| TR     | IBAN                               | ~1%                 |
| US     | ACH / card                         | $0.50-3%            |
| EU     | SEPA / card                        | ~1-3%               |

User pays TransFi directly; Ping has zero direct cost on cash-in.

### What is explicitly NOT in scope at launch

The following were considered and rejected for Phase-1:

- **Stripe (any product — PaymentIntents, Crypto Onramp)** — Ping-touches-fiat issue + Oman incompatibility
- **Circle Mint** — redundant with TransFi for MENA-focused launch; adds KYB delay and second-provider complexity for no corridor gain
- **MoonPay** — redundant with TransFi; ~4.5% all-in fee undermines competitive positioning
- **PayTabs / Telr / MyFatoorah / Thawani / iyzico / PayTR / OmanNet** — all PSP fiat-acquiring with the same money-transmitter incompatibility as Stripe
- **GoCardless** — EU/UK only; TransFi's SEPA coverage is sufficient at launch
- **Plaid Transfer** — US only; TransFi's ACH coverage is sufficient at launch
- **Lean Pay-by-Bank** — UAE-specific cheaper rail (0.3-0.8% vs TransFi 1-2%); add when UAE volume justifies integration cost (~50 tx/day threshold) — Phase-1.5 or Phase-2 trigger, not pre-built

### Cash-out is unchanged

Cash-out has been on TransFi since Phase-1-prep ([ADR 0005](0005-transfi-primary-offramp.md), issue #65 closed). The same TransFi credentials and adapter pattern extend to cash-in.

## Consequences

### Positive

- Ping never becomes a money transmitter
- Ping never holds PCI DSS scope above SAQ A
- Single vendor relationship for both cash-in and cash-out (operationally simpler)
- Global day-1 launch coverage (140+ countries)
- Aligns with non-custodial promise on the Ping side (treasury auto-fund seeding is the only Ping-mediated transfer and is devnet-only)
- Aligns with Oman LLC entity decision (no jurisdiction conflicts)
- Engineering: ~3-5 days to extend existing TransFi adapter for on-ramp + scaffold mobile component, vs ~4-6 hours per alternative PSP

### Negative

- **Single-vendor dependency on TransFi.** If TransFi has an outage, no cash-in works. Mitigation: cash-out continues to work independently; ledger reconciliation cron catches delayed credits; SLA monitoring on TransFi webhook + API latency. Add second provider when volume + downtime risk justify it.
- **TransFi takes a margin** in their effective fees. Some users may end up paying ~2% vs. theoretical floor of ~0.5% (open-banking direct). Trade-off accepted in exchange for non-custodial architecture preservation.
- **Phase-1 demo Stripe scaffolding is wasted work.** Reverting commits `0bb743b`, `82a74e4`, `5193c73` and openova-private `0cd9920e`/`66175c67`.

### Neutral

- Treasury auto-fund chain (5 USDC seed for fresh signups via `/wallet/internal/fund-new-wallet`) stays as devnet-demo seeding for the iOS Build screenshots. Mainnet path is "first cash-in via TransFi" not "treasury seed"; the auto-fund chain becomes dormant at mainnet cutover.

## Implementation plan

1. Extend `services/offramp/src/adapters/transfi.adapter.ts` to handle on-ramp checkout creation
2. New `services/wallet/src/services/cashin.service.ts` replacing the Stripe PaymentIntent builder with TransFi checkout session builder
3. New `services/notify/src/controllers/notify.controller.ts` `/webhooks/transfi-onramp` handler (separate from existing TransFi off-ramp webhook)
4. Mobile `apps/mobile/app/cashin.tsx` replaces `StripeProvider` + `PaymentSheet` with `TransfiRampReactNativeSdkView` from the official SDK
5. Cluster `openova-private`: drop `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` bindings from wallet-service env; keep `ping-stripe-credentials` Secret as orphan for ~1 sprint then delete
6. Update `docs/MAINNET-READINESS.md §3` to reflect this ADR
7. Remove Stripe references from `docs/STATUS.md`, `docs/ARCHITECTURE.md`, mobile READMEs, and any session notes that imply Stripe is in-scope

## References

- [TransFi Ramp Docs](https://ramp-docs.transfi.com/)
- [Trans-Fi/transfi-ramp-react-native-sdk](https://github.com/Trans-Fi/transfi-ramp-react-native-sdk)
- [ADR 0001 — Stablecoin Rails on Solana](0001-stablecoin-rails-on-solana.md)
- [ADR 0004 — Privy MPC Wallets](0004-privy-mpc-wallets.md)
- [ADR 0005 — TransFi Primary Offramp](0005-transfi-primary-offramp.md)
- [ADR 0017 — Custody Model](0017-custody-model.md)

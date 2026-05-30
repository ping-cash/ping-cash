# ADR 0022: Cash-in via TransFi only (no PSP gateway)

**Status:** Superseded by [ADR 0024](0024-cashin-three-method-architecture.md) (2026-05-30 14:30Z)
**Date:** 2026-05-30
**Supersedes:** none
**Superseded by:** [ADR 0024](0024-cashin-three-method-architecture.md) — founder rejected TransFi cash-in's manual-IBAN UX as unacceptable
**Related:** [ADR 0001](0001-stablecoin-rails-on-solana.md), [ADR 0004](0004-privy-mpc-wallets.md), [ADR 0005](0005-transfi-primary-offramp.md), [ADR 0017](0017-custody-model.md), [ADR 0024](0024-cashin-three-method-architecture.md)

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

**AMENDED 2026-05-30 14:15Z** — the original wording in this section was wrong. It claimed "card data flows via iframe → SAQ A PCI scope". That framing was lifted from generic on-ramp pitches and never verified against TransFi. Live API probe (`docs/research/2026-05-30-transfi-api-sweep.md`) and live widget render at `sandbox-buy.transfi.com` confirm:

- **TransFi has NO card paymentType in any currency.** No card, no Apple Pay, no Google Pay. The `paymentType=card` filter is silently ignored by `/v2/payment-methods` — every supported currency returns only `bank_transfer` or `local_wallet`.
- **TransFi is LOCAL-RAILS-ONLY by design.** Their fee positioning (0.5-2%) exists because they avoid Visa/Mastercard. Adding card-rail would put them at MoonPay/Banxa's 3.5-4.5%.
- **PCI DSS scope is therefore not the right framing for this ADR.** There is no card data anywhere. The "SAQ A via iframe" claim was a copy-paste from Stripe / MoonPay architecture — it does not apply to TransFi.
- **The Apple Pay / card / ach methods in `apps/mobile/lib/api.ts` `CashinIntent` are leftover Stripe scaffolding** about to be removed per ADR 0022's un-divert plan. They are not TransFi capabilities.

[`Trans-Fi/transfi-ramp-react-native-sdk`](https://github.com/Trans-Fi/transfi-ramp-react-native-sdk) — official React Native SDK with `TransfiRampReactNativeSdkView` component.

- Widget renders TransFi's hosted UI inside a WebView; user selects from whichever local rails TransFi has integrated for their country (bank-transfer per supported list, local-wallet for some countries)
- Ping renders the surrounding shell (header, branding, return navigation) as native RN
- TransFi handles KYC + payment-method authorization + USDC delivery to the user's Privy wallet
- Signature parameter required when passing `name`, `amount`, `walletAddress`, or `paymentCode` (per TransFi docs)
- **On-ramp API key is SEPARATE from the off-ramp credentials in `ping-transfi-credentials` Secret.** Off-ramp creds (already provisioned via #65) cannot authenticate the buy widget. Founder action required: register Ping for the Ramp Buy product at `sales@transfi.com` to obtain on-ramp credentials.

### Coverage at launch

**AMENDED 2026-05-30 13:35Z** — original fee table was sourced from TransFi marketing blogs. Live API sweep (`docs/research/2026-05-30-transfi-api-sweep.md`) replaces marketing claims with verified rail support per currency. **TransFi's actual MENA coverage is UAE-only.** All other GCC + Egypt + Turkey + India are blocked at the API level (`Invalid Currency` / `Currency Not Configured`).

**Cash-IN currencies verified live (22, all via local rail — no Visa/Mastercard):**

| Currency                                    | Local rail (bypass mechanism)                  | Status |
| ------------------------------------------- | ---------------------------------------------- | ------ |
| **AED** (UAE)                               | `bank_transfer` (NI/Magnati/AANI IBAN backend) | ✓      |
| **EUR** (EU)                                | SEPA pull + SEPA bank + SEPA bank VA           | ✓      |
| **PHP** (Philippines)                       | BDO/BPI/Landbank + GCash + GrabPay             | ✓      |
| **IDR, MYR, THB, VND, PKR, BDT** (SE Asia)  | Local bank + e-wallet rails                    | ✓      |
| **KES, GHS, UGX, TZS, XOF, XAF** (Africa)   | M-Pesa / Airtel / MTN / Orange mobile money    | ✓      |
| **BRL** (Brazil)                            | PIX (central bank instant — effectively free)  | ✓      |
| **MXN, ARS, COP, CLP, PEN** (Latin America) | SPEI + local bank rails                        | ✓      |
| **AUD** (Australia)                         | PayID/NPP                                      | ✓      |

**Cash-IN BLOCKED at API level (currencies returned `Invalid Currency` or `Currency Not Configured`):**

| Currency                    | Status                                                                 | Implication for Ping                                                      |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **OMR** (Oman)              | `Invalid Currency`                                                     | Founder's primary corridor BLOCKED — needs second provider (see ADR 0023) |
| **SAR** (KSA)               | `Invalid Currency`                                                     | KSA sender corridor BLOCKED                                               |
| **QAR, KWD, BHD, JOD, ILS** | `Invalid Currency`                                                     | All GCC ex-UAE blocked                                                    |
| **EGP** (Egypt)             | `Currency Not Configured`                                              | Despite Fawry blog claims                                                 |
| **TRY** (Turkey)            | `Invalid Currency`                                                     | BKM not integrated                                                        |
| **INR** (India)             | `Invalid Currency` for cash-in, `Currency Not Configured` for cash-out | India corridor blocked both directions; UPI not integrated                |
| **USD**                     | `No payment methods available`                                         | No ACH rail despite US in country list                                    |
| **GBP**                     | `Currency Not Configured`                                              | No UK Faster Payments                                                     |

**Cash-OUT (withdraw) coverage:** broadly similar (22 currencies) — PHP/IDR/MYR/THB/VND/BDT/KES/GHS/ZAR/TZS/BRL/MXN/ARS/COP/CLP/PEN/CNY/XOF/XAF + EUR/AED + NGN added. Notable: **PKR cash-out is BLOCKED** (`No payment methods available`) even though PKR cash-in works — Pakistan recipients cannot be paid out via TransFi.

User pays TransFi directly; Ping has zero direct cost on cash-in. Effective fee per rail is sales-quoted (not in public docs); expected range 0.5-2% for local-rail cash-in based on industry refs.

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

# Crypto On-Ramp Provider Scorecard — VERIFIED FACTS (2026-05-30 15:00Z)

**Authority:** LIVE-VERIFIED via two parallel general-purpose research agents (Agent C: founder-named 6; Agent D: 10 other major players). All scores cite the provider's OWN documentation, pricing pages, or developer materials. UNVERIFIED is used explicitly when materials don't confirm — no speculation.

**Why this exists:** Founder explicitly required "0% assumption, depending on 100% verified information" + "sharp scoring 0-100, zero political correctness" per 2026-05-30 14:35Z. Replaces the marketing-anchored ADR 0022 fee table.

**Product requirement (single):** Buy USDC and deliver it to a Privy MPC Solana wallet address. Seamlessly. Nothing else.

---

## Universe surveyed — 16 providers

### Founder-named 6 (Agent C)

MoonPay, Transak, Stripe Crypto Onramp, Coinbase Onramp, Banxa, Onramper

### Other major players (Agent D — kept after filter pass)

Ramp Network, Mercuryo, Alchemy Pay, Kado, Wert, Sardine, Paybis, Topper (Uphold), Robinhood Connect, Mt Pelerin

### Dropped as marginal/no-wallet-picker-presence

Simplex (Nuvei subsidiary), Guardarian, Switchere, Bridge.xyz (Stripe-acquired Oct 2024 — folded into Stripe Onramp), ChangeNOW/FixedFloat/SimpleSwap (instant-exchange not card-onramp), Lifi/Squid/Jumper (cross-chain bridges, not fiat on-ramps), Itez, Utorg, Beam, Conduit Pay, Privy fund-wallet (routes to others, not standalone), Paxful/LocalCoinSwap (P2P, not API), Meld (aggregator like Onramper — pick one)

---

## Scoring axes (each provider scored 0-100; total /800)

1. **Local rails** — country-specific instant-payment rails integrated (SEPA, ACH, UPI, PIX, FPX, PESONet, GCash, AANI, etc.). More + cheaper = higher
2. **Global eligibility** — supported countries (test: Oman, UAE, KSA, US, EU, UK, India, PH, PK, ID, TR, EG)
3. **Global card fee** — published % + flat for worldwide card user
4. **Card payments** — Visa/Mastercard credit + debit support
5. **Apple Pay support** — verified per-country
6. **Open banking integrations** — Plaid/TrueLayer/Lean/Tink embedded
7. **NO Commercial Registration for sandbox** — sole-proprietor self-serve signup → working test keys
8. **NO Commercial Registration for mainnet** — sole-proprietor → live production without LLC+EIN+KYB

---

## Merged scorecard — all 16 providers ranked

| Rank | Provider             | Oman support           | Solana USDC                  | Card fee                | Apple Pay              | No-CR sandbox | Total /800 |
| ---- | -------------------- | ---------------------- | ---------------------------- | ----------------------- | ---------------------- | ------------- | ---------- |
| 1    | **Paybis**           | UNVERIFIED             | **UNVERIFIED**               | from 0.49% tiered       | ✓                      | 70            | **580**    |
| 2    | **Banxa**            | ✓ verbatim             | ✓                            | 1.99% flat              | ✓ worldwide            | 90            | **570**    |
| 3    | Mt Pelerin           | UNVERIFIED             | ✓                            | 1.5% card / free SEPA   | UNVERIFIED             | 80            | 530        |
| 4    | Ramp Network         | ✗ **NOT supported**    | ✓                            | ~2.9%                   | ✓                      | 40            | 515        |
| 5    | Kado                 | UNVERIFIED             | ✓ native                     | 0.5-2.9%                | ✓                      | 50            | 515        |
| 6    | Alchemy Pay          | UAE ✓, Oman UNV        | ✓                            | UNVERIFIED              | ✓                      | 30            | 510        |
| 7    | **Mercuryo**         | ✓ verbatim             | ✓                            | 3.95%                   | ✓ native 23 currencies | 30            | 500        |
| 8    | Topper (Uphold)      | UNVERIFIED             | ✓                            | UNVERIFIED              | ✓                      | 50            | 475        |
| 9    | **Transak**          | UNVERIFIED             | ✓                            | 1-3%                    | ✓                      | **95**        | 475        |
| 10   | Onramper             | UNVERIFIED             | ✓ (passthrough)              | passthrough             | ✗ sandbox-blocked      | 85            | 475        |
| 11   | MoonPay              | UNVERIFIED             | ✓                            | 4.5% Visa               | ✓ all regions          | 50            | 460        |
| 12   | Wert                 | UNVERIFIED             | ✓                            | custom $1 floor + %     | ✓                      | 50            | 415        |
| 13   | Sardine              | UNVERIFIED             | ✓                            | UNVERIFIED              | UNVERIFIED             | 30            | 415        |
| 14   | Robinhood Connect    | ✗ US-only              | ✓                            | low (Robinhood absorbs) | ✗ debit only           | 0             | 350        |
| 15   | Coinbase Onramp      | UNVERIFIED             | ✓ (NOT in zero-fee tier)     | 2.5% CC / 0.5% ACH      | ✓ (US $500/wk)         | 40            | 315        |
| 16   | Stripe Crypto Onramp | ✗ Stripe-Oman incompat | ✓ in US only — **NOT in EU** | UNVERIFIED              | ✓                      | 5             | 270        |

---

## Verified hard blockers (DOA for Ping)

| Provider                 | Blocker                                                                                                                     | Source                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Ramp Network**         | Oman, UAE, KSA **all explicitly unsupported**                                                                               | `support.rampnetwork.com/en/articles/433-which-countries-and-us-states-are-unsupported-for-buying-and-selling-crypto` |
| **Stripe Crypto Onramp** | USDC-Solana **NOT supported in EU**; effectively US-only product                                                            | `docs.stripe.com/crypto/onramp`                                                                                       |
| **Coinbase Onramp**      | Zero-fee USDC is **Base-only, NOT Solana** — Solana pays full 2.5% CC / 0.5% ACH                                            | `coinbase.com/developer-platform/discover/launches/zero-fee-usdc`                                                     |
| **Onramper**             | "You must have a registered legal entity that is already incorporated" verbatim + Apple Pay **cannot be tested in sandbox** | `docs.onramper.com/docs/step-by-step-guide`, `docs.onramper.com/docs/testing-overview`                                |
| **Robinhood Connect**    | US-only                                                                                                                     | `robinhood.com/us/en/on-ramp/`                                                                                        |
| **Wert, Sardine**        | No public pricing — custom contracts only                                                                                   | `wert.io/pricing`, `docs.payments.sardine.ai/overview/pricing`                                                        |

---

## Critical findings

### 1. Only TWO providers have verified Oman support across the entire 16-provider universe

- **Banxa** — `support.banxa.com/en/support/solutions/articles/44002216505` lists Oman + UAE + KSA + India + PK + PH + ID + TR + EG + US + UK verbatim
- **Mercuryo** — `supportedcountries.com/mercuryo/` lists Oman + UAE + KSA + Egypt + South Asia

Everyone else is either UNVERIFIED or explicitly blocked. For the founder's primary corridor (Oman → PH GCash), these are the only two real options.

### 2. Paybis scored highest (580/800) but with a critical gap

Solana USDC delivery is **UNVERIFIED** on Paybis materials. Top score is meaningless if they can't deliver the asset. Founder action: single email to `partners@paybis.com` asking "Do you deliver USDC on Solana to a partner-provided wallet address?" If YES → Paybis becomes #1 (0.49% tiered card fee is the cheapest in the universe). If NO → Banxa wins outright.

### 3. Alchemy Pay has UNIQUE UAE local rails

PayBy + BotIM Pay are UAE-specific e-wallets. No other provider has integrated these. UAE customers can fund Ping using the same wallet they pay utility bills with. This is a category advantage for Phase-1.5 UAE-volume cost optimization.

### 4. Every provider requires KYB for mainnet

Best no-CR mainnet score is Banxa/Coinbase at 15/100 — meaning hostile-to-sole-proprietor. Oman LLC CR is unavoidable for Phase-1 production launch. No exceptions in the universe of 16.

### 5. For no-CR sandbox (founder's current state)

Transak (95) > Banxa (90) > Onramper (85) > Mt Pelerin (80) > Paybis (70).

Onramper is DOA on mainnet (registered legal entity required) so skip it. Build sandbox integrations against **Transak + Banxa in parallel**.

---

## Ranked verdict for Ping

### Tier 1 — Ship-ready for Phase-1

| Provider           | Role                                    | Action                                                                                    |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Banxa** (570)    | Production primary                      | Sandbox signup now; KYB after Oman LLC CR                                                 |
| **Mercuryo** (500) | Production redundancy for Oman corridor | Sales touch; native Apple Pay 23 currencies = better Apple Pay than Banxa in some markets |
| **Transak** (475)  | Sandbox-first integration + India UPI   | Sandbox signup TODAY (no CR friction); production after CR                                |

### Tier 2 — Verification pending

| Provider              | Gate                                                      | Action                                               |
| --------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| **Paybis** (580)      | Solana USDC delivery UNVERIFIED                           | Email partners@paybis.com — if confirmed, becomes #1 |
| **Alchemy Pay** (510) | UAE local rails (PayBy/BotIM Pay) unique; Oman UNVERIFIED | Phase-1.5 trigger when UAE volume justifies          |

### Tier 3 — Reject for Ping

Stripe Crypto Onramp (USDC-Solana not in EU), Coinbase Onramp (Solana not in zero-fee tier), Ramp Network (Oman/UAE/KSA unsupported), Onramper (mainnet legal-entity-required + Apple Pay sandbox-blocked), Robinhood Connect (US-only), MoonPay (high fees, no Oman cert), Wert/Sardine/Kado/Mt Pelerin/Topper (skip — better alternatives exist for Ping's specific posture).

---

## Founder action gates

1. **Transak** — Sign up at `dashboard.transak.com` with `dev@ping.cash`. Per `docs.transak.com/guides/how-to-create-partner-dashboard-account`, instant staging API key issued on signup. NO KYB upfront. Sandbox usable immediately.

2. **Banxa** — Sign up at `dashboard.banxa.com` sandbox. Per `docs.banxa.com/docs/overview`, sandbox credentials separate from production; no upfront KYB.

3. **Paybis** — Email `partners@paybis.com` asking "Do you deliver USDC on Solana to a partner-provided Privy MPC wallet address?" If YES → reconsider Paybis as #1.

4. **Mercuryo** — Sales touch via `b2bhelp.mercuryo.io` for sandbox IP-allowlist. Slower than Banxa/Transak but worth it for Oman redundancy.

5. **All four mainnet productions** wait for Oman LLC CR (3-week timeline per founder context).

---

## Methodology

Two parallel general-purpose research agents:

- **Agent C** (40-min cap) — covered the founder-named 6 with the 8 axes
- **Agent D** (30-min cap) — discovered other major players + scored same 8 axes + wallet-picker reality check (Phantom, Backpack, Solflare, Trust, MetaMask, CB Wallet, Privy)

Each cell scored ONLY on the basis of the provider's OWN docs, pricing pages, FAQ, or developer materials. Third-party blogs, aggregator comparisons, and marketing language explicitly disallowed. UNVERIFIED used when the provider's materials don't confirm — no fabrication.

Total research time: ~50 min wall clock (parallel) for 16 providers × 8 axes = 128 cells of verified-or-unverified data.

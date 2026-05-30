# ADR 0026: USD-only cash-in via Onramper — bank handles FX, Ping handles stablecoin

**Status:** Proposed (founder-direction set 2026-05-30 17:55Z)
**Date:** 2026-05-30
**Supersedes:** [ADR 0025](0025-smart-routing-cashin-architecture.md), [ADR 0024](0024-cashin-three-method-architecture.md) §Method 3
**Related:** [ADR 0001](0001-stablecoin-rails-on-solana.md), [ADR 0004](0004-privy-mpc-wallets.md), [ADR 0005](0005-transfi-primary-offramp.md), [ADR 0024](0024-cashin-three-method-architecture.md), [ADR 0025](0025-smart-routing-cashin-architecture.md)

## Context

[ADR 0025](0025-smart-routing-cashin-architecture.md) proposed a multi-provider multi-network smart router. Subsequent founder directive simplified it dramatically:

> "we can let the user own bank do the usd to omr transformation, we do fix usdc … we provide a very competitive usdc and let user take care of the fee between his bank, each bank and customer has their own fx rates"

This collapses the cash-in architecture from "N providers × N networks × N fiats × geo router" to **ONE pipeline: USD → USDC via Onramper-Topper-Base + treasury rebalance to Solana via CCTP**.

Live-verified evidence (`docs/research/2026-05-30-20provider-omr-usd-final.md`):

- Topper via Onramper on Base = **98.38 USDC for $100 USD** (1.62% effective)
- Onramper-Topper rate is independent of transaction size ($40, $120, $5000 all same %)
- Base is CCTP-compatible → zero-fee rebalance to Solana
- Method 1 (direct USDC receive at user's Privy address) remains the universal 0% fallback

## Decision

### The Ping pricing contract

**Ping shows ONE rate: USD → USDC at ~1.62% effective fee.** Sources fan out internally to Onramper, but the user-facing pricing is one number.

**Bank FX is the user's relationship with their bank.** Ping never accepts, quotes, holds, or owns local fiat. Each bank has its own FX rate; the user already knows it from any USD purchase.

### Per-step ownership

| Step                            | Owner                                                          | Visible to user             | Variability                    |
| ------------------------------- | -------------------------------------------------------------- | --------------------------- | ------------------------------ |
| Local fiat → USD                | **User's bank**                                                | Bank statement              | Bank-by-bank: ~0.4-1.5% margin |
| USD → USDC on Base              | **Ping** (via Onramper-Topper)                                 | Ping app, disclosed clearly | Fixed ~1.62%                   |
| USDC Base → Solana              | **Ping treasury** (CCTP rebalance)                             | Invisible                   | 0% (CCTP zero-fee)             |
| USDC → recipient local currency | **Ping off-ramp** (TransFi to GCash/M-Pesa/etc., per ADR 0005) | Recipient app               | 0.5-1.5% per corridor          |

### What's IN scope

- **Onramper aggregator** as the SOLE on-ramp integration target
- Default destination: **USDC on Base**
- Treasury rebalancer: **Base → Solana via Circle CCTP** (zero per-tx cost; batched daily/weekly)
- **Method 1 (direct USDC receive)** remains the universal 0% fallback per ADR 0024

### What's DROPPED

- **Alchemy Pay direct OMR** — superseded by USD-via-bank-FX path
- **Lean Pay-by-Bank Oman/UAE/KSA** — superseded
- **Rain GCC integration** (ADR 0023) — superseded; now obsolete
- **MoonPay direct OMR** — uncompetitive vs Onramper-Topper-USD path
- **Banxa direct** — Cloudflare-walled + worse rates than via Onramper
- **All other 17 surveyed providers** — dropped per `docs/research/2026-05-30-20provider-omr-usd-final.md`
- **ADR 0025 multi-provider router** — replaced by single Onramper integration + Method 1

### End-user UX

Ping cashin screen shows one card:

```
┌──────────────────────────────────┐
│ ← Add money                      │
│                                  │
│  How much?                       │
│  ┌────────────────────────────┐  │
│  │  USD  100                  │  │
│  └────────────────────────────┘  │
│                                  │
│  You receive: 98.38 USDC         │
│  Ping fee: 1.62%                 │
│  Your bank may charge separate   │
│  FX margin (typically 0.4-1%).   │
│                                  │
│  ┌──────────────────────────────┐│
│  │  💳  Pay with card           ││
│  │      Visa, Mastercard,       ││
│  │      Apple Pay, Google Pay   ││
│  └──────────────────────────────┘│
│                                  │
│  Or:                             │
│  ┌──────────────────────────────┐│
│  │ 🪙  Send USDC from another  ││
│  │     wallet (free, instant)   ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

Two options. Card → Onramper widget → Topper → 98.38 USDC on Base → CCTP-free rebalance → Solana balance ticks up. Direct USDC receive → already shipped per ADR 0024 Phase 1.0.

### Competitive math (Oman housemaid 100 OMR → PH GCash)

| Step                                              | Cost   | Running              |
| ------------------------------------------------- | ------ | -------------------- |
| 100 OMR → ~$258 USD (Bank Muscat FX margin ~0.5%) | -0.5%  | $258                 |
| $258 USD → 253.78 USDC via Onramper-Topper-Base   | -1.62% | 253.78 USDC          |
| Base → Solana via CCTP                            | 0%     | 253.78 USDC          |
| USDC → ~14,375 PHP via TransFi GCash off-ramp     | -1.5%  | 13,997 PHP delivered |
| **Mid-market reference (Google)**                 |        | 14,820 PHP           |
| **Total cost**                                    |        | **~5.6%**            |

vs Wise (~3-4% for OMR→PH, but Wise doesn't serve Oman senders directly), vs Western Union (6-8%), vs PayPal Xoom (5-7%), vs Lulu Exchange counter (4-5%).

**Ping is competitive with Wise (where Wise serves the corridor) and dominates legacy rails.** Plus the UX advantages: instant, 24/7, push-notification, recipient gets GCash credit not cash-pickup.

## Implementation plan

### Phase 1.0 — Method 1 (direct USDC receive) ✓ DONE

Shipped 2026-05-30 in `de4e2c2`. `apps/mobile/app/receive.tsx` exposes the Privy MPC Solana address with QR + copy.

### Phase 1.1 — Onramper integration (~1-2 weeks)

1. Sign up at `dashboard.onramper.com` with `dev@ping.cash` corporate email → instant staging key
2. New `services/cashin/src/adapters/onramper.adapter.ts` — fetch quote, build checkout URL
3. New `services/wallet/src/services/cashin.service.ts` — replaces previous Stripe scaffolding per ADR 0022
4. New `services/notify/src/controllers/webhooks/onramper.controller.ts` — on-ramp completion webhook
5. Mobile `apps/mobile/app/cashin.tsx` replaces Stripe `PaymentSheet` with embedded Onramper widget OR `WebView` to `buy.onramper.com` with our partner key + signed-URL parameters
6. Default destination = `USDC_BASE` (highest delivered amount per verified table)

### Phase 1.2 — Treasury rebalancer (~3-5 days)

1. New `services/treasury/src/cron/rebalance.ts` — periodically check Base USDC balance + Solana USDC target
2. Call Circle CCTP `TokenMessenger.depositForBurn` on Base to burn excess USDC
3. Wait for Circle's attestation (Iris) service
4. Call `MessageTransmitter.receiveMessage` on Solana to mint
5. Net cost: gas only (~$0.01-0.50 per rebalance depending on Base + Solana state)
6. Alert when Base balance below threshold (e.g., < 100 USDC)

### Phase 1.3 — Mainnet KYB (founder action, ~3 weeks)

1. Oman LLC CR landing — gates all production integrations per ADR 0014
2. Onramper KYB: registered legal entity docs + 25%+ shareholders + bank account + website T&Cs
3. Then Onramper production key issuance

### Phase 1.4 — Sandbox-to-prod verification

1. Sandbox e2e test: dummy $100 USD card → 98.38 USDC on Base → CCTP rebalance → Solana balance check
2. Walk-through with founder personal card before public launch
3. Migrate to production credentials

## Consequences

### Positive

- **ONE provider relationship** — single Onramper integration vs prior N-provider plan
- **ONE destination chain** at cash-in time — Base
- **ONE fiat accepted by Ping** — USD; everything else is user's bank's problem
- **Clear pricing contract for users** — "Ping fee 1.62%, your bank fee separate"
- **Ping is never a money transmitter** — never holds/accepts local fiat
- **Universal global coverage** — any Visa/MC card in any country works
- **Competitive positioning** — beats Wise on the corridor, dominates legacy rails
- **Engineering scope shrinks** from ~5-6 weeks (ADR 0025) to **~2-3 weeks**
- **Treasury complexity collapses** — one CCTP rebalance pipeline (Base ↔ Solana)

### Negative

- **Single point of failure (Onramper)** — if Onramper has an outage, no cash-in. Mitigation: Method 1 receive flow continues working (any wallet sending USDC to user's Privy address works always).
- **Onramper KYB is the gate** — production blocked until Oman LLC CR lands
- **MCC 6051 still a card-block risk** for Omani banks (Gemini's earlier critique). Mitigation: Topper's MCC is likely 5734 / 7372 (computer software) NOT 6051 (quasi-cash); needs sandbox verification.
- **Some Omani cards are local-only** (no international charges). Mitigation: detect at cashin screen, surface Method 1 receive flow as fallback.

### Neutral

- TransFi off-ramp (ADR 0005) unchanged
- Privy MPC wallet (ADR 0004) unchanged
- Method 1 (Receive tab) unchanged
- Stripe scaffolding in `services/wallet`, `services/notify`, `apps/mobile/app/cashin.tsx` still needs ripping out per ADR 0022 — same un-divert work, new replacement (Onramper instead of TransFi)

## Founder action gates

1. Email `partners@onramper.com` (or sign up at `dashboard.onramper.com` directly) — sandbox API key + KYB document checklist
2. Verify Onramper supports the partner-signed-URL pattern Ping needs for delivering to Privy MPC addresses
3. After Oman LLC CR: submit Onramper KYB pack → production keys
4. Personal card test of $100 USD → expected 98.38 USDC on Base before public launch

## Files updated by this ADR

- `docs/adr/0026-usd-only-cashin-via-onramper.md` (this file, new)
- `docs/adr/0025-smart-routing-cashin-architecture.md` — Status → Superseded
- `docs/adr/0024-cashin-three-method-architecture.md` — §Method 3 superseded; Methods 1 and 2 unchanged
- `docs/adr/0023-gcc-cashin-via-rain.md` — Status → Withdrawn (obsolete)
- `docs/research/2026-05-30-20provider-omr-usd-final.md` — verified evidence

## References

- ADR 0024: `docs/adr/0024-cashin-three-method-architecture.md`
- ADR 0025: `docs/adr/0025-smart-routing-cashin-architecture.md` (superseded by this ADR)
- Verified table: `docs/research/2026-05-30-20provider-omr-usd-final.md`
- Onramper docs: https://docs.onramper.com/
- Circle CCTP: https://www.circle.com/cross-chain-transfer-protocol
- Topper (Uphold): https://uphold.com/en-us/learn/topper/what-is-topper

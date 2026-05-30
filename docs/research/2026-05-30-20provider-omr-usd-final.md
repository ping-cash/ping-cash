# Final 20-Provider OMR/USD → USDC Verified Table (2026-05-30 17:30Z)

**Authority:** LIVE-WIDGET-VERIFIED via Playwright sweep + founder personal verification + my own Playwright probes.

**Why this exists:** Founder explicitly demanded "deep investigation, check all chains, find best rate" after catching prior analysis anchored on marketing fees. This is the final ground-truth deliverable.

**Founder constraint that simplifies architecture:** Multi-pool treasury — Ping holds USDC pools on multiple chains and rebalances manually or automatically. **Bridge cost is treasury OpEx, NOT per-user transaction cost.** This means the quote shown to the user is the RAW widget delivered amount; Ping eats the rebalance later.

## The 3-column table

| Platform                      | OMR 100 → USDC (best chain)      | USD 100 → USDC (best chain)                             |
| ----------------------------- | -------------------------------- | ------------------------------------------------------- |
| **Alchemy Pay (direct)**      | **247.04 USDC (Solana)** ¹       | 97.91 USDC (BSC)                                        |
| **Topper (via Onramper)**     | NOT SUPPORTED                    | **98.38 USDC (Base)** ← USD WINNER                      |
| MoonPay (direct)              | 246.28 USDT (Tron)               | 94.65 USDT (Tron)                                       |
| Onramper aggregator           | 235.60 USDT (Tron via MoonPay)   | 98.38 USDC (Base via Topper)                            |
| Banxa via Onramper            | NOT SUPPORTED                    | 95.95 USDT (Tron)                                       |
| Transak                       | NOT SUPPORTED                    | 92.55 USDC (Solana/Polygon/Base/BSC tie)                |
| MoonPay via Onramper (Solana) | 232.56 USDC                      | 93.26 USDC                                              |
| Ramp Network                  | GATED (API key required)         | GATED                                                   |
| Coinbase Onramp               | GATED (sessionToken required)    | GATED                                                   |
| Stripe Crypto Onramp          | GATED (merchant integration)     | GATED                                                   |
| Mercuryo                      | INACCESSIBLE                     | INACCESSIBLE                                            |
| Paybis                        | INACCESSIBLE (widget gated)      | INACCESSIBLE                                            |
| Kado / Swapped                | INACCESSIBLE (Cloudflare wall)   | INACCESSIBLE                                            |
| Wert                          | GATED (session-is-missing)       | GATED                                                   |
| Mt Pelerin                    | NOT SUPPORTED (no OMR)           | ~99.96 USDC (USD; SWIFT only, ~$20 flat fee → net ~80%) |
| Simplex / Nuvei               | INACCESSIBLE (B2B only)          | INACCESSIBLE                                            |
| Guardarian                    | NOT SUPPORTED (no OMR)           | ~99 USDC (sign-up gated for exact)                      |
| Switchere                     | GATED (no public widget)         | GATED                                                   |
| Crossmint                     | INACCESSIBLE (404, B2B SDK only) | INACCESSIBLE                                            |
| Sardine                       | GATED (B2B only)                 | GATED                                                   |
| Robinhood Connect             | NOT SUPPORTED (US-only)          | GATED (Robinhood account required)                      |

¹ Founder personally verified Alchemy OMR at 247.04 USDC on Solana 2026-05-30 16:30Z; I confirmed via Playwright probe at 247.24 USDC. Agent reported "NOT SUPPORTED" — likely geo/UA mismatch. Founder + my Playwright probe = ground truth.

## Sharp verdict

- **USD cheapest:** Topper via Onramper aggregator on Base = **98.38 USDC (1.62% effective)**. Base is CCTP-compatible → Ping treasury rebalances Base ↔ Solana with zero per-tx cost. User sees 1.62%.
- **OMR cheapest:** Alchemy Pay direct on Solana = **247.04 USDC (4.98% effective)**. Direct to Solana; no rebalance needed.

## Architectural implications (amends ADR 0025)

### Multi-pool treasury model (founder directive 2026-05-30 17:25Z)

Ping treasury holds USDC pools on multiple chains. Bridge cost = treasury OpEx (rebalance cron), NOT per-user transaction cost.

| Was (per-tx bridge)                          | Now (multi-pool treasury)                                         |
| -------------------------------------------- | ----------------------------------------------------------------- |
| USD path: Alchemy BSC + Wormhole = 2.29% net | **Topper-Base = 1.62%** (CCTP-free)                               |
| OMR path: Alchemy Solana = 4.98%             | Unchanged                                                         |
| Bridge orchestrator (per-tx synchronous)     | Replaced with **treasury rebalancer cron** (daily/weekly batches) |
| User-facing quote                            | Raw widget rate — no bridge cost added                            |
| User latency                                 | Zero — balance ticks immediately on cash-in completion            |

### Per-corridor canonical paths (revised)

| User fiat | Provider                                       | Network    | Effective fee  | Treasury rebalance                    |
| --------- | ---------------------------------------------- | ---------- | -------------- | ------------------------------------- |
| **USD**   | **Topper via Onramper**                        | Base       | **1.62%**      | CCTP Base → Solana, zero fee, batched |
| **OMR**   | **Alchemy Pay direct**                         | Solana     | **4.98%**      | none (already Solana)                 |
| EUR       | Alchemy direct (per founder verification 2-3%) | Solana     | ~2-3%          | none                                  |
| UAE AED   | Alchemy direct (PayBy + BotIM Pay unique)      | per widget | ~2-3% (likely) | none if Solana; CCTP if Base/Polygon  |

### Provider integration priority

1. **Onramper aggregator** (Phase 1.1) — unlocks Topper + others; required for USD path
2. **Alchemy Pay direct** (Phase 1.1) — required for OMR path; UAE local rails as bonus
3. **MoonPay direct** (Phase 1.2 alternative for OMR if Alchemy down)
4. Everything else → deferred (gated, inaccessible, or uncompetitive)

### Off-corridor providers — drop from active scope

- Banxa direct (Cloudflare wall + worse rates than Onramper-relayed)
- Ramp Network (Oman/UAE/KSA unsupported + API key gated)
- Coinbase Onramp (Solana not zero-fee tier)
- Stripe Crypto Onramp (USDC-Solana not in EU)
- Mercuryo / Paybis / Kado / Wert / Mt Pelerin / Simplex / Guardarian / Switchere / Crossmint / Sardine / Robinhood / Transak (all worse or gated)

## Founder action gates

1. Email `partners@onramper.com` — sandbox API key + KYB documents list
2. Email `partners@alchemypay.org` — sandbox API key + OMR rail enumeration
3. Plan Ping USDC treasury seed across Solana + Base initially (~$5K USDC each chain for testnet/early prod)

## Files

- This document: `docs/research/2026-05-30-20provider-omr-usd-final.md`
- Prior scorecard (for context): `docs/research/2026-05-30-onramp-provider-scorecard.md`
- ADR 0025 (smart routing): `docs/adr/0025-smart-routing-cashin-architecture.md`

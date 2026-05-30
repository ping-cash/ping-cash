# ADR 0025: Smart-routing cash-in architecture (multi-provider, multi-network, bridge-to-Solana)

**Status:** Superseded by [ADR 0026](0026-usd-only-cashin-via-onramper.md) 2026-05-30 18:00Z — founder collapsed the multi-provider router to single Onramper integration with bank-FX-pass-through model.

**Amendment summary (17:30Z):** Founder directive 17:25Z: "we don't have concern about holding multiple pools of USDC in multiple chains and we can manually or automatically move from the pools." Bridge cost becomes treasury OpEx, not per-tx cost. User-facing quote = raw widget rate (no bridge cost added). 20-provider sweep yielded NEW USD winner: **Topper via Onramper on Base = 98.38 USDC (1.62% effective)** — beats prior BSC+Wormhole assumption (2.29%) by 0.67pp. OMR winner unchanged: Alchemy direct on Solana = 247.04 USDC (4.98%).
**Date:** 2026-05-30
**Supersedes:** none (extends [ADR 0024](0024-cashin-three-method-architecture.md))
**Related:** [ADR 0001](0001-stablecoin-rails-on-solana.md), [ADR 0004](0004-privy-mpc-wallets.md), [ADR 0024](0024-cashin-three-method-architecture.md)

## Context

[ADR 0024](0024-cashin-three-method-architecture.md) pinned three cash-in methods (direct crypto, open banking, card) without specifying WHICH provider per method. Live-widget verification across multiple providers and networks (2026-05-30 14:00Z-16:50Z) revealed:

- **Provider rate matters more than network**, but **network matters too**: same provider routed to different networks gives different effective fees
- **OMR is best served by Alchemy Pay direct** at 4.98% effective on Solana (founder-verified)
- **USD is best served by Alchemy Pay direct on BSC** at 2.09% effective, with bridge to Solana via Wormhole/LayerZero at ~0.1-0.3% net saving (founder-verified)
- **Onramper aggregator only competitive for USD/EU mainstream**, NOT for OMR (routes all OMR through MoonPay at flat 10.5% — much worse than Alchemy direct)
- **CCTP (Circle Cross-Chain Transfer Protocol)** supports zero-fee USDC bridges between Ethereum, Avalanche, Optimism, Arbitrum, Base, Polygon, Solana — making any of those networks acceptable as cash-in destinations
- **BSC bridge to Solana** requires Wormhole or LayerZero (~0.1-0.3% fee)

The single-provider-per-method approach in ADR 0024 leaves money on the table. Smart-routing fixes that.

## Decision

**Implement a multi-provider multi-network router that picks the cheapest path per cash-in intent.**

### Routing logic

At cash-in intent time, the backend:

1. **Quote N candidate paths in parallel** (one HTTP fan-out, ~1-2 sec):
   - Alchemy Pay direct: USDC-Solana, USDC-BSC, USDC-Base, USDC-Polygon
   - Onramper aggregator: USDC-Solana, USDC-Base, USDT-Tron
   - Method 1: direct USDC receive (always available, 0% Ping fee)
2. **Add bridge cost** for non-Solana destinations:
   - Base / Polygon / Avalanche / Arbitrum → Solana via CCTP: **0% fee, ~5-15 sec**
   - BSC → Solana via Wormhole: **~0.1-0.3% fee, ~1-2 min**
3. **Compute net delivered USDC on Solana** for each path: `delivered_amount × (1 - bridge_fee)`
4. **Pick the path with highest net delivered USDC**
5. **Render in UI**: top path with effective fee disclosed; "show all routes" expands the list

### Verified rate matrix (live-widget, 2026-05-30)

| Fiat        | Path               | Network at cash-in            | Bridge to Solana      | Net delivered (per $100 eq.) | Effective fee                    |
| ----------- | ------------------ | ----------------------------- | --------------------- | ---------------------------- | -------------------------------- |
| **OMR 100** | **Alchemy direct** | Solana                        | none                  | **247.04 USDC**              | **4.98%** ← Phase-1 OMR primary  |
| OMR 100     | Alchemy direct     | BSC                           | Wormhole ~0.2%        | 247.30 USDC                  | 4.88%                            |
| OMR 100     | Onramper (MoonPay) | Solana / ETH / Polygon / Base | varies                | 232.56 USDC                  | 10.55% — DROP                    |
| OMR 100     | Onramper           | BSC                           | n/a                   | NO ROUTE                     | —                                |
| OMR 100     | Onramper (MoonPay) | Tron (USDT)                   | n/a (different chain) | 238 USDT                     | ~8%                              |
| **USD 100** | **Alchemy direct** | BSC                           | Wormhole ~0.2%        | **~97.71 USDC**              | **~2.29% ← Phase-1 USD primary** |
| USD 100     | Onramper (Topper)  | Solana                        | none                  | 97.23 USDC                   | 2.77%                            |
| USD 100     | Alchemy direct     | Solana                        | none                  | 97.00 USDC                   | 3.00%                            |
| USD 100     | Onramper (Banxa)   | BSC                           | n/a                   | 91.74 USDC                   | 8.26% — DROP                     |
| USD 100     | Onramper (Banxa)   | Tron (USDT)                   | not bridgeable        | 96.15 USDT                   | 3.85% — DROP                     |

### Per-corridor canonical paths

| User fiat   | Primary path                                                                | Secondary (if primary down)               |
| ----------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| **OMR**     | Alchemy direct → USDC-Solana                                                | Method 1 (direct USDC receive)            |
| **USD**     | Alchemy direct → USDC-BSC → CCTP-incompatible → Wormhole to Solana          | Onramper (Topper) → USDC-Solana           |
| **EUR**     | Alchemy direct → USDC-Solana (founder data: 113.55 USDC for 100 EUR ≈ 2-3%) | Onramper open-banking SEPA when available |
| **UAE AED** | Alchemy direct (UAE local rails PayBy + BotIM Pay unique)                   | Lean Pay-by-Bank when sandbox accessible  |

## Implementation plan

### Phase 1.0 — Method 1 (Receive tab) ✓ DONE

Shipped 2026-05-30 in commit `de4e2c2`. `apps/mobile/app/receive.tsx` exposes the Privy MPC Solana address. Universal fallback at 0% Ping fee.

### Phase 1.1 — Cash-in router service

New `services/cashin-router/`:

- `src/adapters/alchemy.adapter.ts` — quote endpoint + checkout session builder
- `src/adapters/onramper.adapter.ts` — quote endpoint (multi-provider aggregator)
- `src/services/router.service.ts` — fan-out quote, add bridge cost, pick winner
- `src/services/bridge-cost.service.ts` — static cost table per source-destination chain
- `src/types.ts` — `QuoteRequest`, `QuoteResponse`, `RouteWithBridge`

### Phase 1.2 — Mobile cash-in screen

Replace existing `apps/mobile/app/cashin.tsx` (Stripe scaffolding) with:

- Country detection
- Calls `POST /wallet/cashin/quote { fiatCurrency, fiatAmount }`
- Renders top path + "show all routes" details
- Launches the provider's widget (Alchemy `TransfiRampReactNativeSdkView`-equivalent or Onramper widget URL)

### Phase 1.3 — Bridge orchestrator

After non-Solana on-ramp completion (BSC, Base, etc.):

- Watch destination wallet for USDC credit (Solana RPC poll OR provider webhook)
- If non-Solana: trigger CCTP burn (Base/Polygon/etc.) or Wormhole transfer (BSC)
- Watch Solana wallet for USDC mint credit
- Update ledger row with final on-Solana balance

CCTP integration: Circle SDK or direct `TokenMessenger` contract call on source chain. Costs gas on both sides (~$0.05-1 depending on source).
Wormhole integration: Wormhole TS SDK or relayer service. Costs ~0.1-0.3% on the transferred amount.

### Phase 1.4 — Mainnet KYB

All providers require KYB for production. Wait for Oman LLC CR (3-week timeline per founder context). Until CR lands, ship sandbox integrations only.

## Consequences

### Positive

- Best cash-in rate per user, per intent — no provider lock-in
- Method 1 (direct USDC receive) as universal 0% fallback
- BSC + bridge path saves ~0.4-0.7pp for USD users vs direct-Solana
- Aligns with ADR 0001 (Solana as the final settlement layer for the social money network)
- Aggregator-vs-direct asymmetry (Onramper wins US/EU, Alchemy direct wins OMR) handled deterministically per-corridor

### Negative

- Engineering: ~2-3 weeks for the router + bridge orchestrator (one engineer)
- Bridge introduces latency: 5-15 sec CCTP, 1-2 min Wormhole (user sees "processing" between cash-in completion and Solana balance)
- Bridge introduces operational complexity: monitoring both source and destination chains, handling stuck bridges
- Multi-provider KYB: every provider Ping integrates needs its own KYB; that's 2-3x the compliance work vs single-provider
- Fee table needs continuous re-verification (provider rates drift; need a weekly automated rate-check job)

### Neutral

- ADR 0024 three-method framing still stands; this ADR specifies the implementation
- TransFi off-ramp (ADR 0005) unchanged
- Privy MPC wallet (ADR 0004) unchanged

## Verification artifacts

- `docs/research/2026-05-30-onramp-provider-scorecard.md` — live-widget capture
- Screenshots in `.playwright-mcp/` (alchemy + onramper widget shots)
- Founder personally verified Alchemy OMR/USD/EUR + BSC/Solana rates 2026-05-30 16:30Z

## Founder action gates

1. Email `partners@alchemypay.org` — request sandbox API key + partner agreement to get the quote API endpoint (bypass widget URL parameter issues)
2. Email `partners@onramper.com` — sandbox staging credentials per `docs.onramper.com/docs/step-by-step-guide`
3. Verify Circle CCTP works for partner-flow USDC mint on Solana via testnet
4. After Oman LLC CR: all providers' KYB unblocks production

## References

- ADR 0024: `docs/adr/0024-cashin-three-method-architecture.md`
- ADR 0001: `docs/adr/0001-stablecoin-rails-on-solana.md`
- Live verification: `docs/research/2026-05-30-onramp-provider-scorecard.md` §"Founder-verified live-widget quotes"
- CCTP docs: https://www.circle.com/cross-chain-transfer-protocol
- Wormhole docs: https://wormhole.com/docs/build/start-here/supported-networks/
- Alchemy Pay ramp: https://ramp.alchemypay.org/
- Onramper widget: https://buy.onramper.com/

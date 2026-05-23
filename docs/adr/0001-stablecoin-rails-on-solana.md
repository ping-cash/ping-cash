# ADR 0001: Stablecoin Rails on Solana

**Status:** Accepted
**Date:** 2026-05-21

## Context

A cross-border money platform needs settlement rails. Traditional options:

- **Bank / SWIFT** — $5-50 per transfer, 1-3 days, banking hours, limited corridors
- **Card networks** — 2-3% interchange + FX, instant authorization but slow chargeback windows
- **Stablecoin on blockchain** — sub-cent fees, sub-second finality on the right chain, 24/7, global

We need rails that support **zero in-network transfer fees** as a core value prop. Bank rails make this impossible (per-transfer cost > $0). Stablecoin rails make it trivial (sub-cent network fee absorbed in the cash-out margin).

Among stablecoins:

- **USDC (Circle)** — most regulated, 1:1 USD backed, audited, accepted globally
- **USDT (Tether)** — largest liquidity, less regulatory clarity
- **DAI** — decentralized but capacity-constrained for our volume goals

Among chains for USDC:

- **Ethereum L1** — $5-20 per tx, 12-second blocks — TOO EXPENSIVE
- **Solana** — $0.001 per tx, 400ms blocks, USDC native — IDEAL
- **Polygon** — $0.01 per tx, 2-second blocks, USDC native — good fallback
- **Base** — $0.01 per tx, Coinbase-backed, growing — Phase 2 candidate
- **TRON** — $0.001 per tx, USDT-dominant, less USDC liquidity — Phase 2 candidate

## Decision

**Phase 1:** USDC on Solana as the primary settlement asset and chain.

**Phase 2:** Add multi-chain support (TRON, Base) for corridor-specific cost/liquidity optimization.

## Consequences

**Good:**

- Per-transfer cost ≈ $0.001 (Solana network fee)
- Sub-second user-perceived latency for in-network transfers
- USDC's regulatory cover (Circle) makes treasury operations defensible
- 24/7 settlement — no banking-hours dependency

**Bad / trade-offs:**

- Solana network outages (historically 4-6 per year, hours each) directly degrade our service
- Mitigation: Phase 2 multi-chain support lets us failover; until then, in-network transfers degrade gracefully (queue + retry)
- USDC issuer risk (Circle could freeze accounts) — we accept this in exchange for regulatory cover
- We're crypto-adjacent in the eyes of regulators — every license we apply for needs an explanation of our stablecoin model

## Alternatives Considered

- **Build on bank rails (like Wise):** Rejected — can't deliver zero in-network fees
- **Bitcoin / Lightning:** Rejected — price volatility unacceptable for remittance UX
- **Stellar (XLM):** Considered — has MoneyGram partnership, good rails, but smaller ecosystem than USDC
- **Polygon-native first:** Considered — but Solana's speed advantage is decisive for the in-network claim flow

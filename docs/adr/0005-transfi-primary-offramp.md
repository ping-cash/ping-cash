# ADR 0005: TransFi as Primary Off-Ramp Provider

**Status:** Accepted
**Date:** 2026-05-21

## Context

To deliver money to recipients in their local currency, we need an "off-ramp" — a service that takes USDC and pays out in PHP / INR / KES / NGN / etc. via local rails (mobile wallets, banks, cash pickup).

Building our own off-ramps requires:
- Money transmission licenses in EACH destination country (12-24 months per country, $300K-$1M each)
- Local bank partnerships
- Local payment-processor accounts
- Compliance teams per country

That's 2-3 years of work before we ship a single transfer. We need a partner.

Off-ramp provider landscape:
- **TransFi** — 70+ countries, mobile wallets + bank transfers, competitive rates, webhook support
- **Wise Business API** — strong in EU/UK/US, less coverage in Africa/SEA
- **Flutterwave** — Africa-focused, especially Nigeria
- **Yellow Card** — Africa crypto-native rails
- **Thunes** — global cash pickup network
- **Circle Mint** — institutional USDC ↔ fiat, not consumer-grade

## Decision

**Primary:** TransFi for cash-out across all Phase 1 corridors (PH, IN, PK, BD, KE).

**Fallback strategy:**
- **Wise** for EU/UK/US bank rails
- **Flutterwave** for Africa backup (Nigeria, Ghana)
- **Yellow Card** for Africa crypto-native rails
- **Thunes** for cash pickup (Phase 2)

Provider failover is built into `offramp-service` — see [ARCHITECTURE.md § Off-Ramp Provider Failover](../ARCHITECTURE.md#off-ramp-provider-failover).

## Consequences

**Good:**
- Single-provider integration to start (faster MVP)
- TransFi covers all Phase 1 corridors
- Webhook-based status updates fit our event-driven architecture
- Competitive rates (typically 0.3-0.5% provider cost on top of our customer-facing fee)
- They handle licensing in each country (we ride on their licenses for now)

**Bad / trade-offs:**
- Single-vendor risk — TransFi outage = our cash-out flow is down
- Mitigation: failover logic + multi-provider strategy from day one (even if backup providers don't carry volume yet)
- Margin compression — our 0.5% mobile-wallet fee is split with TransFi (we keep ~0.2%)
- Less direct control over the user experience at the off-ramp step (delivery UX is TransFi's, not ours)
- If we ever want to OWN the licenses ourselves (Year 3+), we have to switch — and TransFi will resist losing volume

## Alternatives Considered

- **Build our own licensing stack:** Rejected — 2-3 years pre-launch is unacceptable
- **Wise as primary:** Rejected — Wise's coverage in our target corridors (PH/IN/PK/BD/KE mobile wallets) is weaker than TransFi
- **Multi-provider from day one with hot routing:** Considered — but adds integration complexity; one provider primary + others as failover is simpler for MVP
- **Pure crypto off-ramp (let recipients self-bridge via Coins.ph / Yellow Card):** Considered — works for crypto-native recipients but excludes the 95% of recipients who just want money in GCash

## See Also

- [ARCHITECTURE.md § Cash-In / Cash-Out Integration](../ARCHITECTURE.md#cash-in--cash-out-integration)
- [BUSINESS-STRATEGY.md § Cash-Out Coverage by Country](../BUSINESS-STRATEGY.md#cash-out-coverage-by-country)

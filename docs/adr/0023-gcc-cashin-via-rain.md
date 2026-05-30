# ADR 0023: GCC cash-in via Rain (Oman/KSA/Bahrain/Kuwait/Qatar)

**Status:** Needs revalidation per [ADR 0024](0024-cashin-three-method-architecture.md) — Rain stays valid only if they offer Pay-by-Bank (open banking), not IBAN-paste UX
**Date:** 2026-05-30
**Supersedes:** none (extends [ADR 0022](0022-cashin-transfi-only.md))
**Related:** [ADR 0022](0022-cashin-transfi-only.md), [ADR 0005](0005-transfi-primary-offramp.md), [ADR 0014](0014-entity-jurisdiction-oman-llc.md)

## Context

[ADR 0022](0022-cashin-transfi-only.md) pinned TransFi as the sole cash-in provider at Phase-1 launch. Live API sweep on 2026-05-30 (`docs/research/2026-05-30-transfi-api-sweep.md`) revealed:

- TransFi's MENA cash-in is **UAE-only** (`AED bank_transfer`)
- **OMR, SAR, QAR, KWD, BHD, JOD all return `Invalid Currency` at the API level** — not card-fallback, not workaround-possible, the currency codes do not exist in TransFi's system
- This blocks Ping's primary launch corridor (Oman housemaid → Philippines mom)
- Founder's residence + the Ping operating entity (Oman LLC, [ADR 0014](0014-entity-jurisdiction-oman-llc.md)) both make OMR the natural Phase-1 origin

Ping needs a **second cash-in provider** that covers GCC currencies TransFi doesn't.

## Candidates evaluated

| Provider                                 | License                          | Coverage claimed                                                                    | API maturity                                       | Per-rail fees                     |
| ---------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| **Rain**                                 | Bahrain CBB cleared + ADGM (UAE) | All GCC (BHD/SAR/AED/KWD/QAR/OMR) via SARIE interbank from Al Rajhi/SNB/Riyadh Bank | Has REST API documented; partner-tier requires KYB | UNVERIFIED — sales touch required |
| **BitOasis**                             | VARA-licensed (UAE)              | UAE primary + GCC expansion announced                                               | Has API for partners                               | UNVERIFIED                        |
| **Onramp.money**                         | VARA + UAE Central Bank-aligned  | UAE OTC + multi-MENA aggregator                                                     | Partner agreement required                         | UNVERIFIED                        |
| **Card-rail aggregator** (MoonPay/Banxa) | Global card networks             | Any country with Visa/Mastercard                                                    | Open APIs                                          | 3.5-4.5% effective (no bypass)    |

## Decision

**Rain is the proposed primary GCC cash-in provider**, pending sales-side verification of:

1. Per-currency rail availability (OMR/SAR/BHD/KWD/QAR — and AED as TransFi fallback)
2. Per-rail effective fees disclosed to user
3. API maturity (REST stability, sandbox environment, webhook reliability)
4. KYB documentation requirements for Ping Oman LLC

Selection rationale:

- **Bahrain CBB + ADGM licensing matches Ping's Oman LLC posture** — same regulatory umbrella, no jurisdiction conflicts
- **GCC umbrella coverage** — single integration unlocks Oman + KSA + Bahrain + Kuwait + Qatar in one motion
- **SARIE interbank settlement** — KSA cash-in via Al Rajhi/SNB/Riyadh Bank gives institutional-grade rails (not card-only)
- **Senior to BitOasis on scope** — BitOasis is UAE-primary; Rain is GCC-primary

## Implementation plan

### Phase 1 (verification — founder action)

1. Founder emails `sales@rain.bh` with the exact verification table from "Decision" section above. Ask for:
   - REST API documentation URL
   - Sandbox credentials for `ping-cash` partner
   - Per-currency rail list (OMR/SAR/BHD/KWD/QAR cash-in)
   - Per-rail effective fees (% + flat)
   - KYB document checklist for Ping Oman LLC partner registration
   - SLA on settlement time (instant? T+1? T+2?)
2. If Rain confirms: proceed to Phase 2 (integration)
3. If Rain does NOT confirm OMR cash-in: fall back to BitOasis OR card-rail aggregator (MoonPay) for the housemaid corridor

### Phase 2 (integration — engineering)

1. Extend `services/offramp/src/adapters/` with `rain.adapter.ts` (same shape as `transfi.adapter.ts`)
2. New cash-in adapter at `services/wallet/src/services/cashin-rain.service.ts`
3. Router: if user-declared country ∈ {OM, SA, BH, KW, QA} → route to Rain; if AE → route to TransFi (cheaper for AED); if PH/PK/EU → TransFi
4. Mobile: detect country in `apps/mobile/app/cashin.tsx`, render Rain widget OR `TransfiRampReactNativeSdkView` based on country code
5. Cluster: new `ping-rain-credentials` Secret in `openova-private`; bind `RAIN_API_KEY`/`RAIN_PARTNER_ID`/`RAIN_WEBHOOK_SECRET` to wallet-service env
6. Webhook: `services/notify/src/controllers/notify.controller.ts` adds `/webhooks/rain-onramp` handler
7. Docs: update `docs/ARCHITECTURE.md` Service Catalog + `docs/MAINNET-READINESS.md` §3

Estimated engineering: 4-6 days after sandbox credentials land.

## Coverage matrix after Rain integration

| Country                                                                                                 | Cash-in provider                         | Cash-out provider                                                      |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| Oman (OMR)                                                                                              | **Rain**                                 | TransFi (PHP/IDR/PKR/etc per recipient corridor)                       |
| KSA (SAR)                                                                                               | **Rain**                                 | TransFi                                                                |
| Bahrain (BHD)                                                                                           | **Rain**                                 | TransFi                                                                |
| Kuwait (KWD)                                                                                            | **Rain**                                 | TransFi                                                                |
| Qatar (QAR)                                                                                             | **Rain**                                 | TransFi                                                                |
| UAE (AED)                                                                                               | **TransFi** (already verified API-cheap) | TransFi                                                                |
| Europe (EUR)                                                                                            | TransFi (SEPA)                           | TransFi                                                                |
| Philippines, Indonesia, Malaysia, Thailand, Vietnam, Pakistan, Bangladesh, Kenya, Africa, Latin America | TransFi                                  | TransFi                                                                |
| India (INR), Turkey (TRY), Egypt (EGP)                                                                  | **DEFERRED** (no rails available)        | DEFERRED                                                               |
| Pakistan recipients (PKR cash-out)                                                                      | n/a                                      | **DEFERRED** (TransFi `No payment methods available` for PKR withdraw) |

## Consequences

### Positive

- Founder's primary corridor (OM→PH) unlocked for Phase-1 launch
- GCC umbrella coverage via single Rain integration
- Regulatory alignment (Bahrain CBB + ADGM ↔ Ping Oman LLC)
- Maintains non-custodial promise (Rain is the MoR, Ping just receives webhook)

### Negative

- **Two-provider operational complexity** — webhook handlers for both, reconciliation across both, SLA monitoring on both
- **Rain pricing UNVERIFIED** — could be higher than TransFi's AED 1-2%; might end up 2-3% per transaction at Phase-1
- **Founder action gate** — Rain sales touch + KYB onboarding could take 2-4 weeks before integration starts

### Neutral

- Architecture symmetry is preserved (provider-adapter pattern already in `services/offramp/src/adapters/`); adding Rain is mechanically simple
- TransFi remains primary for everything outside GCC — no churn there

## References

- [ADR 0022 — Cash-in via TransFi only](0022-cashin-transfi-only.md)
- [ADR 0014 — Entity jurisdiction: Oman LLC](0014-entity-jurisdiction-oman-llc.md)
- TransFi API sweep evidence: `docs/research/2026-05-30-transfi-api-sweep.md`
- Rain corporate: https://www.rain.bh (CBB cleared)

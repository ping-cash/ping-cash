# Roadmap

**WHAT:** Target-state feature inventory for Ping. We ship the full end product (per [PRINCIPLES § 14 — No Workarounds, Target-State Shape](PRINCIPLES.md)), not iterations.

**AUTHORITY:** 📐 PERMANENT-refreshable. Update when target-state scope changes.

**Last refreshed:** 2026-05-21

> **Note:** This document used to describe phased MVP-then-later iterations. Per founder direction (2026-05-21) and PRINCIPLES § 14, we ship target-state shape end-to-end — no MVP-now-refactor-later. The list below is the target product spec; build order is operational (foundation services first, see [STATUS.md § Phase 1 MVP — Pillar Status](STATUS.md#phase-1-mvp--pillar-status)) but the bar at every shipping point is the full target shape, not a partial.

This document was consolidated on 2026-05-21 from the original `README.md` and reframed on 2026-05-21 per the founder's "waterfall, target-state" mandate.

---

## Target Product Surface

We build all of the below to target-state quality on the first ship. Ordering reflects dependency chain (auth must exist before transfers can be claimed), not "MVP vs later." Every surface ships with full DoD (operator-walks-with-screenshot per [DOD.md](DOD.md)) the first time.

### Deliverables

#### Mobile App
- [ ] Phone authentication flow
- [ ] Home screen with balance
- [ ] Contact list with search
- [ ] Send money flow
- [ ] Transfer history
- [ ] Cash-in (Apple Pay, Google Pay, Card, Bank, USDC)
- [ ] Cash-out (to sender's country or home country)

#### Web Claim Flow
- [ ] Claim landing page
- [ ] OTP verification
- [ ] Smart country detection from phone number
- [ ] Cash-out method selection (country-specific)
- [ ] Mobile wallet integrations (GCash, M-Pesa, bKash, etc.)
- [ ] Bank transfer integration
- [ ] Success/receipt page

#### Backend
- [ ] auth-service (phone + Privy)
- [ ] transfer-service
- [ ] claim-service
- [ ] wallet-service (Privy integration)
- [ ] notify-service (WhatsApp + SMS)
- [ ] offramp-service (TransFi)

#### Multi-Corridor Off-Ramp (all the corridors we ship to the Sovereign)
- [ ] Philippines: GCash, Maya, Bank (BDO/BPI/UnionBank/Metrobank), Cash Pickup (Cebuana Lhuillier)
- [ ] India: UPI/IMPS, Bank (NEFT), Paytm, PhonePe, Google Pay (India)
- [ ] Pakistan: JazzCash, Easypaisa, Bank (HBL/MCB/UBL)
- [ ] Bangladesh: bKash, Nagad, Rocket, Bank Transfer
- [ ] Kenya: M-Pesa, Airtel Money, Bank (KCB/Equity/Co-op)
- [ ] Multi-chain (TRON, Base) for cheaper corridor-specific rails

#### Infrastructure (shipped as Blueprints, deployed to Sovereign)
- [ ] `platform/<service>/` Helm charts for each microservice
- [ ] `products/bp-ping/blueprint.yaml` Blueprint manifest
- [ ] `.github/workflows/build.yml` — matrix build, Blueprint publish, Sovereign SHA-bump PR
- [ ] ExternalSecret CRDs for Privy / TransFi / Twilio / WhatsApp / Persona / Solana RPC
- [ ] Per-service `DESIGN.md` co-located with chart

#### Compliance (target state, not deferred)
- [ ] Persona KYC integration (Tier 1/2/3 flows)
- [ ] AML transaction monitoring + sanctions screening (OFAC, UN, EU)
- [ ] Privacy policy + Terms of Service
- [ ] GDPR data-subject request handling
- [ ] SOC 2 Type I audit kick-off

#### Growth & Network Effects (built in from day one)
- [ ] Referral program with both-sided incentives
- [ ] WhatsApp Mini App (lower friction than native install)
- [ ] Family dashboard (multi-recipient management)
- [ ] Premium subscriptions (priority support, higher limits, scheduled transfers)

#### B2B / API (built in from day one — not deferred)
- [ ] B2B API for embedded payroll/disbursement
- [ ] White-label solution scaffolding (revenue-share customers)
- [ ] Per-transfer API pricing ($0.10/transfer baseline)
- [ ] Webhook signature verification + idempotency keys

---

## Decision Points (Forward-Looking)

| Question | When We'll Know |
|---|---|
| Do we self-host treasury (vs Circle Yield) | When aggregate balance > $50M and yield delta justifies the operational overhead |
| Do we issue our own stablecoin (vs USDC) | Likely never — USDC has the regulatory cover; minting our own adds liability without offsetting value |
| Do we expand to LatAm corridors | After Africa stabilizes (Year 2 Q4) |
| Do we open the B2B API publicly | When MAU > 100K and we have evidence of organic partner demand |
| Do we raise external capital | If unit economics confirm > 65% blended gross margin AND we want to compress timeline to network-effect lock-in |

---

## Roadmap Risks

Roadmap timelines can slip on:
- **Regulatory delays** — money transmission licenses in GCC can stretch 12-24 months
- **Payment processor onboarding** — Stripe/Checkout.com approvals for fintech-adjacent products are non-trivial
- **Off-ramp provider integration** — TransFi sandbox to production cutover historically takes 3-6 weeks per country
- **App Store / Play Store review** — fintech apps face heightened scrutiny; first submission may take 4-8 weeks

See [BUSINESS-STRATEGY.md § Risk Assessment](BUSINESS-STRATEGY.md#risk-assessment) for the strategic risk catalog.

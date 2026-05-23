# Roadmap

**WHAT:** Target-state feature inventory + phased delivery sequence for Ping. Per [PRINCIPLES § 14](PRINCIPLES.md), we ship target-state shape end-to-end, not MVP iterations.

**AUTHORITY:** 📐 PERMANENT-refreshable. Updated when target-state scope changes.

**Last refreshed:** 2026-05-23

---

## Target Product Surface (Built to Completion)

All of the following is the TARGET STATE that gets built. Build order reflects dependency chains, not "phase 1 vs phase 2" feature scoping — every feature ships to target-state quality the first time.

### Sender mobile app (React Native + Expo)

- [ ] Phone OTP signup (Twilio Verify)
- [ ] Privy MPC wallet creation
- [ ] External wallet connect (Phantom / Solflare / Backpack)
- [ ] KYC Tier 1 / 2 / 3 flow via shared `dynolabs-io/kyc` SDK
- [ ] Home screen — balance display (vUSDC + Free USDC + $PING)
- [ ] Contact list + sync from phone book
- [ ] Send money flow (in-network FREE, claim-link for non-Ping recipients)
- [ ] Cash-in: Apple Pay / Google Pay / Card / Bank / USDC direct
- [ ] Cash-out: to sender's country or recipient's country
- [ ] Transfer history (sent + received)
- [ ] Tier display + tier-upgrade flow
- [ ] Welcome stake gamification tracker
- [ ] Auto-stake + auto-unstake (invisible)
- [ ] Power-user mode (advanced settings)
- [ ] Privy MPC recovery flow

### Web claim flow (Next.js)

- [ ] Claim link landing (with sender + amount visible)
- [ ] Phone OTP verification
- [ ] Smart country detection from phone
- [ ] Cash-out method selection (country-specific)
- [ ] Account / details entry
- [ ] Processing screen
- [ ] Success / receipt page
- [ ] "Get the app for free transfers" CTA (viral loop)

### Backend microservices

- [ ] `auth-service` — phone OTP + JWT + Privy wallet bind
- [ ] `user-service` — profiles + contacts + Ping Points balance
- [ ] `kyc-service` — orchestrator using `dynolabs-io/kyc` SDK
- [ ] `transfer-service` — orchestration + fee calc + tier discounts
- [ ] `wallet-service` — balance indexer + vault interaction
- [ ] `fx-service` — Pyth oracle + 0.4% cost-covering spread
- [ ] `ledger-service` — double-entry accounting + outbox events
- [ ] `claim-service` — claim links + OTP verification
- [ ] `offramp-service` — TransFi / Wise / Flutterwave / Yellow Card orchestration
- [ ] `notify-service` — WhatsApp + SMS + Push
- [ ] `gamification-service` — welcome-stake milestone tracking
- [ ] `earn-vault-svc` — Solana vault interaction layer
- [ ] `token-svc` — $PING price oracle + tier basis + clawback compute
- [ ] `swap-svc` — internal swap with 0.3% spread
- [ ] `pomm-svc` — POMM algorithmic intervention
- [ ] `compliance-svc` — Chainalysis sanctions screening

### Solana smart contracts (Anchor / Rust)

- [ ] Earn Vault program (auto-stake, harvest, 40/60 split, vUSDC mint)
- [ ] Phase 2: $PING SPL Token-2022 with emission halving + transfer hooks
- [ ] Phase 2: Welcome stake Streamflow contracts (per-user lockup)
- [ ] Phase 2: POMM algorithmic market maker
- [ ] Phase 2: Internal swap contract (0.3% spread)
- [ ] Phase 2: Squads multisig + governance timelock contracts

### Off-ramp / Cash-out coverage (target)

- [ ] Philippines: GCash, Maya, BDO/BPI/UnionBank/Metrobank, Cebuana (TransFi + PHPC direct)
- [ ] India: UPI/IMPS, NEFT, Paytm, PhonePe (TransFi)
- [ ] Pakistan: JazzCash, Easypaisa, Bank (TransFi)
- [ ] Bangladesh: bKash, Nagad, Rocket, Bank (TransFi)
- [ ] Kenya: M-Pesa, Airtel Money, KCB/Equity/Co-op (TransFi + Kotani Pay)
- [ ] Nigeria: OPay, PalmPay, GTBank/Access/Zenith (Flutterwave)
- [ ] Turkey: Garanti/İş Bankası/Akbank + iyzico (Turkey entity)
- [ ] EU SEPA / UK Faster Payments (Wise Business)
- [ ] Multi-chain expansion: TRON, Base (Wormhole NTT bridges)

### Infrastructure (deployed as Blueprints to Sovereign)

- [ ] `platform/<service>/` Helm charts (one per microservice)
- [ ] `products/bp-ping/blueprint.yaml` Blueprint manifest
- [ ] `.github/workflows/build.yml` matrix-build + Blueprint publish + Sovereign SHA-bump PR
- [ ] ExternalSecret CRDs for all provider credentials
- [ ] Per-service `DESIGN.md` co-located with chart
- [ ] Public dashboards: `vault.ping.cash`, `pomm.ping.cash`, `burn.ping.cash`
- [ ] Status page at `status.ping.cash`

### Compliance + Trust

- [ ] Persona KYC integration (Tier 1/2/3 flows)
- [ ] Chainalysis sanctions screening on every transfer
- [ ] OFAC + UN + EU sanctions list integration
- [ ] AML transaction monitoring + velocity limits
- [ ] Privacy policy + Terms of Service
- [ ] GDPR data-subject request handling
- [ ] SOC 2 Type I audit kick-off (Year 1)
- [ ] OtterSec / Halborn audit of smart contracts (Phase 2 prerequisite)

### Growth + Network Effects

- [ ] Welcome stake gamification (5 milestone unlocks)
- [ ] Referral program with milestone tracking
- [ ] WhatsApp Mini App (lower-friction onboarding)
- [ ] Family dashboard (multi-recipient management)
- [ ] Premium subscriptions (priority support, higher KYC tier limits, scheduled transfers)

### B2B / API (built in from day one, not deferred)

- [ ] B2B API for embedded payroll / disbursement (Platinum tier requirement)
- [ ] White-label solution scaffolding
- [ ] Per-transfer API pricing ($0.10/transfer)
- [ ] Webhook signature verification + idempotency keys

---

## Execution Sequence (NOT Feature Tiers — Just Build Order)

### Wave 1 — Foundation (Months 0-1)

Per dependency analysis: foundation services must exist before any user-visible flow works.

1. CI matrix workflow (per-service build + Blueprint publish + Sovereign SHA-PR)
2. Helm chart template for `platform/<service>/` pattern
3. Blueprint manifest scaffolding
4. ExternalSecret CRD pattern
5. Shared `@ping/types`, `@ping/config`, `@ping/utils` expansion
6. `auth-service` (phone OTP → Twilio → JWT → Privy wallet creation)
7. `user-service` (profiles, contacts, Ping Points balance database)
8. `dynolabs-io/kyc` shared service scaffold (separate repo, per [ADR 0011](adr/0011-kyc-shared-service.md))

### Wave 2 — Core money flows (Months 1-2)

9. `transfer-service` (orchestration, fee calc, outbox events)
10. `wallet-service` (balance indexer, Privy + external wallet support)
11. `fx-service` (Pyth oracle, 0.4% spread, currency conversion)
12. `ledger-service` (double-entry, outbox publisher)
13. Mobile app: signup + home + send + history flows
14. Initial Sovereign deploy + walks

### Wave 3 — Cash flows (Months 2-3)

15. `claim-service` (claim links, OTP, recipient flow)
16. `offramp-service` (TransFi integration first, then Wise + Flutterwave)
17. `notify-service` (WhatsApp + SMS + Push)
18. Web claim flow (Next.js)
19. End-to-end walks: send $X from Dubai → recipient claims via WhatsApp → cashes to GCash

### Wave 4 — Token + Vault (Months 2-4 in parallel with above)

20. Earn Vault Anchor program (auto-stake, harvest, 40/60 split, vUSDC mint)
21. `earn-vault-svc` indexer + UX integration
22. `token-svc` (Ping Points database for Phase 1, on-chain $PING reader for Phase 2)
23. Gamification-service (welcome-stake milestone tracking)

### Wave 5 — Phase 2 token launch (Months 3-12)

24. Cayman Foundation incorporation
25. Engage crypto-fintech counsel (DLA Piper / Cooley / Latham)
26. AML / KYC / Sanctions / Privacy policy drafting
27. $PING SPL Token-2022 contract development
28. Welcome stake Streamflow contracts
29. POMM smart contract
30. Internal swap smart contract
31. OtterSec or Halborn audit
32. Reg D / Reg S strategic raise documentation
33. Token whitepaper + public communications
34. Raydium CLMM pool seeded ($250K USDC + 50M $PING)
35. Jupiter Launchpad public sale
36. Migration cron: Ping Points → $PING for all existing users
37. Earn Vault yield distribution switches to $PING

### Wave 6 — Scale (Year 2+)

38. UAE DMCC entity + VARA license application
39. Singapore Pte Ltd for Asia operations
40. Wormhole NTT bridge to Base (Coinbase listing path)
41. Tier-2 CEX listings (Bybit, KuCoin, Gate.io)
42. B2B / API public availability
43. Virtual debit card (USDC-funded, Mastercard/Visa rails)

---

## Operational Cadence

### Daily

- Earn Vault harvest (40/60 split + $PING buyback distribution)
- POMM heartbeat (price band check, intervene if outside)
- Sanctions screening list refresh from Chainalysis
- Provider API health checks
- TRACKER / TRUST ledger cron refresh

### Weekly

- Closed PR audit + Refs-vs-Closes verification
- Coverage analysis per pillar
- Founder review of TRACKER status

### Monthly

- TRUST ledger walk-with-screenshot for each pillar
- Provider partnership review (TransFi, Lean, Tarabut)
- Treasury yield + revenue report
- POMM intervention log review

### Quarterly

- Foundation transparency report (treasury, burns, emissions)
- Smart contract upgrade review (with 30-day timelock if changing)
- Compliance audit (sanctions, AML, KYC)

---

## Strategic Priorities

### Year 1 — Establish Beachhead

1. **Launch platform** (Phase 1 — no token) with GCC → PH/IN/PK/BD/KE corridors + Turkey corridor
2. **Build network effects** via Welcome Stake gamification + referral milestones
3. **Secure first 10K MAU + $2M monthly volume**
4. **Incorporate Cayman Foundation** + draft tokenomics legal package

### Year 2 — Token Launch + Expand

1. **$PING TGE** on Jupiter Launchpad + Raydium CLMM seeding
2. **Earn Vault $PING yield distribution** activates
3. **Add Africa corridors** (Kenya, Nigeria, Ghana, Tanzania, Uganda)
4. **Reach 100K MAU + $30M monthly volume**
5. **VARA license** application (UAE DMCC entity)

### Year 3 — Scale or Exit

1. **500K MAU + $150M monthly volume + $1M+ MRR**
2. **Strategic options:** continue scaling, acquisition target (GCash / Wise / bank), Series A/B raise
3. **B2B API public availability** (Platinum tier embedded products)

---

## Decision Points (Forward-Looking)

| Question                                               | When We'll Know                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| Token launch timing (4-6 months after platform launch) | Once Foundation incorporated + audit complete                      |
| Multi-chain expansion (Base, TRON)                     | When Solana TVL exceeds $50M or specific corridor demands it       |
| Add Stripe US / US corridors                           | When ready to invest in US MTL or partner                          |
| Issue stablecoin pegged to local currency              | Never — partner with existing local stablecoins (PHPC, cKES, etc.) |
| Compete with TransFi (build own off-ramp)              | When 2-3% partnership fees exceed our own license maintenance cost |
| Acquisition exit                                       | If valued > $500M at Year 3+                                       |

---

## Roadmap Risks (mitigations in BUSINESS-STRATEGY.md and SECURITY.md)

- Solana network outages (historical: 4-6/year)
- Regulatory action in destination countries
- TransFi (single off-ramp) failure (mitigate: multi-provider from launch)
- USDC depeg event (mitigate: USDT + FDUSD secondary reserves)
- Smart contract exploit (mitigate: OtterSec + Halborn + bug bounty + Nexus Mutual insurance)
- $PING price collapse (mitigate: POMM + 5-layer deflation + Welcome stake locked)
- Provider partner consolidation (mitigate: multi-provider strategy from day 1)

See [BUSINESS-STRATEGY.md § Risk Assessment](BUSINESS-STRATEGY.md#risk-assessment) for the strategic risk catalog.

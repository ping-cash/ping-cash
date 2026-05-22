# ADR 0014: Entity Structure — Turkey + Oman + Cayman Foundation

**Status:** Accepted
**Date:** 2026-05-23

## Context

Ping must operate as a software platform orchestrating licensed payment partners (per [ADR 0006](0006-deployment-via-openova-sovereign.md)) without holding its own money-transmitter license at launch. This requires:

1. **A registered legal entity** for each commercial partner relationship (Stripe, Lean, Tarabut, TransFi all require KYB)
2. **Regional alignment** with target corridors — different entities open different doors
3. **A separate token-issuing entity** legally insulated from the operating company
4. **Tax efficiency** for token treasury management

The founder has existing entities in Turkey and Oman. The Cayman Foundation is needed in Phase 2 for token issuance (per [ADR 0008](0008-ping-tokenomics.md)).

## Decision

Three-entity structure:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PING FOUNDATION (Cayman)                                      │
│   ─ Phase 2 (when token issuance begins)                        │
│   ─ Issues $PING token                                          │
│   ─ Holds Foundation Treasury + Reserve (per ADR 0008)          │
│   ─ Governance via Squads 3-of-5 multisig                       │
│   ─ Licenses tech IP to operating entities                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                       Tech license
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌─────────────────────────┐               ┌──────────────────────────┐
│                         │               │                          │
│  PING OMAN ENTITY       │               │  PING TURKEY ENTITY      │
│  ─ Existing             │               │  ─ Existing              │
│  ─ Primary operations   │               │  ─ Secondary operations  │
│                         │               │                          │
│  Provider relationships:│               │  Provider relationships: │
│  ─ TransFi (off-ramp)   │               │  ─ Stripe Turkey         │
│  ─ Lean (GCC banks)     │               │  ─ iyzico / Param / BKM  │
│  ─ Tarabut Gateway      │               │  ─ Bitlo / Paribu        │
│  ─ Tap Payments         │               │  ─ Wise Business (EU)    │
│  ─ Thawani / regional   │               │                          │
│                         │               │  Corridors:              │
│  Corridors:             │               │  ─ DE/NL/UK → 🇹🇷         │
│  ─ GCC → PH/IN/PK/BD/KE │               │  ─ Engineering / dev base│
│  ─ Bank accounts USD/OMR│               │  ─ Stripe TL processing  │
│                         │               │                          │
└─────────────────────────┘               └──────────────────────────┘
```

## Entity Responsibilities

### Ping Foundation (Cayman) — Phase 2

**Purpose:** Token issuer + governance + long-term treasury custodian

| Responsibility | Detail |
|---|---|
| Token issuance | $PING SPL mint authority (later transferred to immutable contract) |
| Treasury custody | 10% supply Treasury (Squads multisig) + 5% Foundation reserve (10y Streamflow lock) |
| Governance | Parameter changes to POMM, Earn Vault, tier thresholds (with timelock) |
| Tech IP license | Holds the source code / trademark for Ping; licenses to operating entities |
| Bug bounty + audit funding | Pays OtterSec / Halborn / Immunefi |
| Compliance posture | Geo-block US persons; Reg D/S compliance for any token sale |
| Banking | Single Cayman bank account for Foundation operating expenses |

**Setup:** ~$5-10K incorporation + $3-5K/year, 2-6 weeks. Counsel: Cayman-specialized firm (Walkers, Maples, Ogier).

**Why Cayman:** Zero corporate tax on Foundation entities (non-profit form), proven crypto-Foundation jurisdiction (Solana Foundation, Wormhole, Pyth, Helium all use Cayman), strong investor recognition.

### Ping Oman Entity — Existing, Primary Operations

**Purpose:** GCC commercial operations + regional banking

| Responsibility | Detail |
|---|---|
| KYB with TransFi | Primary off-ramp partner for PH/IN/PK/BD/KE corridors |
| KYB with Lean Technologies | GCC bank-transfer cash-in (UAE/KSA/Kuwait/Qatar/Bahrain/Oman) |
| KYB with Tarabut Gateway | Backup/competitor to Lean for same corridors |
| KYB with Tap Payments | KNET (Kuwait), BenefitPay (Bahrain), Apple Pay (Oman) |
| KYB with Thawani | Oman-native payments (cards, bank, Thawani Pay) |
| Banking | OMR + USD accounts at Bank Muscat or NBO |
| Compliance | CBO (Central Bank of Oman) Tasdeer sandbox application |
| Customer support staffing | Arabic + English speakers in Muscat |

**Why Oman:**
- GCC member → reciprocal access to UAE / KSA / Kuwait / Qatar / Bahrain payment systems
- Lower setup cost than UAE (~$3-8K vs $10-20K)
- CBO Tasdeer sandbox is crypto-friendly
- Existing entity — no extra setup time

### Ping Turkey Entity — Existing, Secondary Operations

**Purpose:** Turkish corridor + EU/UK card processing + engineering base

| Responsibility | Detail |
|---|---|
| KYB with Stripe Turkey | Card processing + Apple Pay + Google Pay for Turkish users |
| KYB with iyzico / Param / BKM | Domestic Turkish payment rails |
| KYB with Bitlo / Paribu | TL ↔ USDC ramps for Turkish users |
| KYB with Wise Business | EU SEPA + UK Faster Payments cash-in |
| Banking | TL + USD + EUR accounts at Garanti or İş Bankası |
| Compliance | BKM (Turkish payment network) + BDDK (banking) registration |
| Engineering base | Lower-cost dev hiring; team based in Istanbul or Ankara |
| Marketing | Turkish-diaspora outreach (DE / NL / UK → TR corridor) |

**Why Turkey:**
- Unique competitive advantage: Turkish corridor is huge (DE→TR alone is €5B/year) and underserved by remittance fintech
- Stripe Turkey launched 2024 — full Apple Pay / Google Pay support
- Lower engineering cost than EU/Singapore
- Existing entity — no extra setup

## Inter-Entity Flows

```
USER PERSPECTIVE:
   User opens Ping app, doesn't see entities. Sees "Ping" brand only.

REALITY UNDER THE HOOD:
   Card payment from Turkey user           → Ping Turkey Entity (Stripe processes)
   Bank transfer from UAE user             → Ping Oman Entity (Lean processes)
   USDC deposit from any wallet            → Wallet contract (no entity needed)
   
   Cash-out to GCash (Philippines)         → Ping Oman Entity (TransFi processes)
   Cash-out to Turkish bank                → Ping Turkey Entity (iyzico processes)

INTER-ENTITY SETTLEMENT:
   Daily reconciliation: USDC balance moves between entity wallets to match
   user flows. E.g., if Turkey-side cash-in funded a PH cash-out:
   ├── Turkey Entity received USDC equivalent (after Stripe fee)
   ├── Oman Entity needs USDC to fund TransFi → GCash leg
   └── Daily USDC transfer Turkey → Oman (on-chain, free, near-instant)

PHASE 1 (NO TOKEN):
   Foundation not active yet. Two operating entities settle directly between
   themselves. Profits accrue to whichever entity's books reflect the
   transaction.

PHASE 2 (TOKEN LIVE):
   Foundation enters the picture. Tech license fees flow from operating
   entities to Foundation (covers Foundation's operating budget).
   Token treasury is Foundation-only.
```

## Provider Mapping (Which Entity for What)

| Provider | Entity | Why |
|---|---|---|
| **Stripe / Apple Pay / Google Pay (global)** | Turkey or Oman (whichever first approves) | Both work; Stripe Turkey live so likely Turkey |
| **TransFi (cash-out)** | Oman | TransFi prefers MENA entities for Middle East routing |
| **Lean Technologies** | Oman | Oman + GCC reciprocity |
| **Tarabut Gateway** | Oman | Same |
| **Tap Payments** | Oman | KNET / BenefitPay native; Oman entity required |
| **Thawani** | Oman | Native Oman-only |
| **Wise Business API** | Either (Turkey preferred for EU SEPA, Oman for USD ACH) | Flexible |
| **iyzico / Param / BKM (Turkish rails)** | Turkey | Turkish entity required |
| **Bitlo / Paribu (Turkish crypto)** | Turkey | Same |
| **Privy MPC Wallets** | Either | No entity preference |
| **Chainalysis / Elliptic (compliance)** | Either | No preference, single contract serves both |
| **Persona / Onfido (KYC)** | Either, but **dynolabs-io/kyc** shared service handles this — see [ADR 0011](0011-kyc-shared-service.md) |

## Banking Setup

```
PING OMAN ENTITY ACCOUNTS:
  ├── Bank Muscat — USD operational account (primary for TransFi settlement)
  ├── Bank Muscat — OMR local account (operational expenses)
  └── National Bank of Oman — USD secondary (backup + larger volume)

PING TURKEY ENTITY ACCOUNTS:
  ├── Garanti BBVA — TL primary
  ├── Garanti BBVA — USD secondary
  ├── İş Bankası — EUR (for EU SEPA settlements via Wise)
  └── Garanti BBVA — GBP (for UK Faster Payments)

PING FOUNDATION (CAYMAN — Phase 2):
  └── DMS Governance Ltd or Bank of Butterfield (Cayman) — USD operating
```

## Phased Activation

```
NOW (Months 0-3) — Two-entity operations:
  ├── Turkey + Oman entities active
  ├── Apply for Stripe, TransFi, Lean, Tarabut, Wise (parallel)
  ├── No token, no Foundation
  └── Platform launches with "Ping Points" (per ADR 0015)

MONTH 3-6 — Cayman Foundation incorporation begins:
  ├── Engage Cayman counsel (Walkers / Maples)
  ├── File Foundation Co documents
  └── Operating entities continue Phase-1 traffic

MONTH 4-12 — Token launch:
  ├── Foundation live
  ├── $PING TGE
  ├── Convert Ping Points 1:1 to $PING
  └── All three entities operational

YEAR 2+ — Optional UAE DMCC entity:
  ├── For VARA (Virtual Asset Regulatory Authority) crypto license
  ├── Better access to Lulu Exchange / Al Ansari cash counters
  └── When revenue justifies (~$10K/year cost)

YEAR 2+ — Optional Singapore Pte Ltd:
  ├── For Asia ops scale (PH / SG / HK corridors)
  ├── TransFi prefers Singapore entities for Asia
  └── When revenue justifies
```

## Cost Summary

| Entity | Setup cost | Ongoing | Status |
|---|---|---|---|
| Ping Oman | Founder's existing | $3-5K/yr maintenance | ✅ Live |
| Ping Turkey | Founder's existing | $3-5K/yr maintenance | ✅ Live |
| Ping Foundation (Cayman) | $5-10K | $3-5K/yr | 🟡 Phase 2 |
| Crypto-fintech counsel (DLA Piper / Cooley) | $50-100K | $20-50K/yr | 🟡 Months 1-3 |
| AML / KYC / Sanctions policies (legal drafting) | $20-40K | $5-10K/yr update | 🟡 Months 1-3 |
| **Total Phase 1** | $5-10K (Foundation only) | ~$10-15K/yr | |
| **Total to launch token (Phase 2)** | +$70-150K (legal) | +$25-60K/yr | |

## Consequences

**Good:**
- Two existing entities cover ~75% of needed jurisdictions and providers (per coverage analysis discussion)
- No US entity needed initially (skip US corridor for Year 1, avoid SEC complexity)
- Token issuance properly insulated from operating entities (Foundation = limited liability for token treasury)
- Lower setup cost than starting from scratch ($5-10K incremental for Foundation only)

**Bad / trade-offs:**
- Inter-entity USDC settlement adds operational complexity (daily reconciliation)
- Turkey + Oman currencies create FX exposure on local-currency holdings (mitigation: hold USDC primarily, minimize local-currency float)
- Some providers prefer UAE entity over Oman — may need to add DMCC in Year 2
- Stripe approval is the critical-path dependency — if both Turkey AND Oman applications get rejected, blocker emerges (mitigation: apply to both simultaneously + use Wise Business as fallback for card payments via Stripe-equivalent)

## Tax Considerations (high-level, NOT tax advice)

| Entity | Corporate income tax | Notes |
|---|---|---|
| Oman | 15% (free zone: 0%) | Set up in Madayn or Knowledge Oasis for 0% |
| Turkey | 25% | Higher; offset by lower operational costs |
| Cayman Foundation | 0% | Non-profit Foundation form |

Operating profits flow to operating entities (Oman + Turkey) per services they perform. Foundation receives tech license fees from operating entities and pays counsel/audit. This is the standard "Foundation + OpCo" pattern.

## Compliance Posture

- **No money-transmitter license required at launch.** Software-platform model orchestrating licensed partners (per [ADR 0006](0006-deployment-via-openova-sovereign.md)).
- **AML/KYC** via shared `dynolabs-io/kyc` service (per [ADR 0011](0011-kyc-shared-service.md))
- **Sanctions screening** via Chainalysis on every transfer
- **US person geo-blocking** at signup (no service offered to US persons)
- **EU MiCA preparation** — when Foundation activates, file MiCA notification (Liechtenstein TVTG license alternative if cheaper)
- **UAE VARA** — defer to Year 2 (requires UAE DMCC entity)

## Alternatives Considered

- **Single Cayman entity for everything:** Rejected — Cayman has weak banking access; operations need regional entities
- **Add Dubai DMCC at launch:** Rejected — adds $10-20K + 4-8 weeks; not critical-path; can defer to Year 2
- **Use OpenOva existing entity:** Considered but separates concerns (OpenOva is platform; Ping is product); cleaner with own entities
- **Singapore Pte Ltd as primary:** Considered — better banking, easier KYB; but requires new entity + higher setup cost; defer to Year 2

## See Also

- [ADR 0006 — Deployment via OpenOva Sovereign (Ping doesn't operate cluster, but does operate entities)](0006-deployment-via-openova-sovereign.md)
- [ADR 0008 — $PING tokenomics (Foundation issues token)](0008-ping-tokenomics.md)
- [ADR 0011 — KYC shared service (no entity-side KYC stack needed)](0011-kyc-shared-service.md)
- [ADR 0015 — Phased launch (Foundation activates in Phase 2)](0015-phased-launch-ping-points-to-token.md)
- [BUSINESS-STRATEGY.md § Compliance Roadmap](../BUSINESS-STRATEGY.md)

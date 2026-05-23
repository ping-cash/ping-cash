# ADR 0011: KYC as a Shared Cross-Product Service

**Status:** Accepted
**Date:** 2026-05-23

## Context

Multiple Dynolabs / OpenOva products need identity verification:

- **Ping** — Tier 1 / 2 / 3 onboarding for senders + claim-flow verification
- **TalentMesh** — talent identity verification + portfolio attestation
- **IO Grid** — B2B customer KYB + provider identity verification (Sybil prevention)
- **Future products** — anything consumer or B2B fintech-adjacent

If each product builds its own KYC integration with Persona / Onfido / Veriff:

- Duplicated engineering effort (~3-4 months per product)
- Duplicated vendor contracts (3+ × ~$50K/year)
- Inconsistent compliance posture across products
- Each product has to maintain audit logs separately
- Customers using multiple products do KYC multiple times

A horizontal KYC service eliminates all of this and creates a horizontal asset.

## Decision

Create a separate repo and shared service: **`dynolabs-io/kyc`** (or similar org alignment).

```
New repo:    github.com/dynolabs-io/kyc
Repo type:   Product repo (per user-global §0.C)
Deployed:    As a Blueprint to the OpenOva Sovereign at openova-private
Consumed:    By Ping, TalentMesh, IO Grid, future products
```

### Service Architecture

```
dynolabs-io/kyc/
├── coordinator/
│   ├── identity-svc/        # User identity records, tier tracking
│   ├── document-svc/        # ID document storage + extraction (S3-backed)
│   ├── sanctions-svc/       # OFAC / UN / EU sanctions screening
│   ├── webhook-svc/         # Inbound from Persona / Onfido / Veriff
│   └── api-gateway/         # REST + Connect-Go
│
├── sdks/
│   ├── typescript/          # @dynolabs/kyc-sdk (Node + browser)
│   ├── react-native/        # @dynolabs/kyc-rn (mobile)
│   ├── go/                  # github.com/dynolabs/kyc/go-sdk
│   └── python/              # dynolabs-kyc (Python)
│
├── adapters/
│   ├── persona/             # Primary vendor (Tier 2/3 ID verification)
│   ├── onfido/              # Fallback vendor
│   └── chainalysis/         # Sanctions + wallet screening
│
├── platform/                # Helm charts for each microservice
├── products/bp-kyc/         # Blueprint manifest
└── docs/                    # Architecture, runbooks, ADRs
```

### Tier Definitions (standardized across all consumer products)

| Tier   | Requirements                    | What it unlocks (Ping)                              | What it unlocks (TalentMesh)     | What it unlocks (IO Grid)      |
| ------ | ------------------------------- | --------------------------------------------------- | -------------------------------- | ------------------------------ |
| **T0** | None                            | Browse only                                         | Browse profiles                  | Browse public catalog          |
| **T1** | Phone OTP (Twilio Verify)       | Up to $200/day, $1K/month transfers; welcome stake  | View hire jobs                   | Consume VPN service            |
| **T2** | ID document + selfie (Persona)  | Up to $2K/day, $10K/month transfers; B2B API access | Apply to jobs, portfolio publish | Provide compute services       |
| **T3** | Address proof + source of funds | Up to $10K/day, $50K/month; institutional features  | Enterprise contracts             | High-volume customer contracts |

Tier definitions are owned by KYC service. Products specify "Tier ≥ T2 required" — they don't re-implement verification.

### Consumer API (REST)

```
POST /v1/identity/init                # Create new identity, returns inquiry_id
  body: { phone, country, productId }

POST /v1/identity/{id}/verify-phone   # Send + verify phone OTP
  body: { code }                      # for verify step

POST /v1/identity/{id}/start-tier2    # Launch Persona inquiry
  returns: { inquiryUrl }             # redirect user to Persona

POST /v1/identity/{id}/start-tier3    # Address + source-of-funds
  returns: { inquiryUrl }

GET  /v1/identity/{id}                # Get current status
  returns: { id, tier, status, kycProvider, verifiedAt }

POST /v1/identity/{id}/sanctions-check  # Returns immediately or queues
  body: { walletAddress?, name?, dob? }
  returns: { result: clean | hit, listsHit, score }

POST /v1/webhooks/persona             # Inbound from Persona
POST /v1/webhooks/onfido              # Inbound from Onfido
POST /v1/webhooks/chainalysis         # Daily sanctions list updates
```

### SDK Usage (TypeScript example)

```typescript
import { KycClient } from '@dynolabs/kyc-sdk';

const kyc = new KycClient({
  apiKey: process.env.KYC_API_KEY,
  productId: 'ping',
  baseUrl: 'https://kyc.openova.io',
});

// In Ping's auth-service when user wants to upgrade tier:
const session = await kyc.startTier2({
  identityId: user.kycIdentityId,
  callbackUrl: 'https://ping.cash/kyc/callback',
});

// Redirect user to session.inquiryUrl

// Later, in Ping's webhook handler:
kyc.on('identity.verified', async event => {
  await userService.upgradeTier(event.identityId, event.tier);
});
```

### Data Architecture

- **Identity records** in PostgreSQL (CP — per [ARCHITECTURE.md § Data Layer](../ARCHITECTURE.md#data-layer)) — append-only audit log
- **KYC documents** encrypted at rest (AES-256) in SeaweedFS / S3-compatible storage on Sovereign
- **Sanctions screening cache** in Redis (15-min TTL, refreshed daily from Chainalysis feed)
- **Audit log** to Postgres + replicated to long-term S3 archive (5y for closed accounts, indefinite for active)

### Privacy

- Identity data NEVER leaves the KYC service's domain
- Products query only "what tier is user X?" — they don't get back PII
- GDPR right-to-erasure: KYC service exposes deletion endpoint; products are notified to remove user
- Right-to-portability: user can request data export from KYC service directly

## Deployment

```
Sovereign Flux config:
clusters/contabo-mkt/apps/dynolabs-kyc/
└── helmrelease.yaml
       chart: ghcr.io/dynolabs-io/charts/bp-kyc:1.0.0

Each Sovereign instance hosts ONE KYC deployment shared across all products
on that Sovereign. Multi-tenant by product_id namespace.
```

Same DDD + Sovereign-deploy pattern as Ping (per [ADR 0006](0006-deployment-via-openova-sovereign.md)).

## Vendor Strategy

| Vendor                              | Use                        | Why                                                          |
| ----------------------------------- | -------------------------- | ------------------------------------------------------------ |
| **Persona** (primary)               | Tier 2 / 3 verification    | Most flexible flows, good React Native SDK, fintech-friendly |
| **Onfido** (fallback)               | Tier 2 / 3 verification    | Backup if Persona quotas exceeded or geographically inferior |
| **Twilio Verify**                   | Phone OTP (Tier 1)         | Already part of Ping stack, broad SMS reach                  |
| **Chainalysis KYT**                 | Wallet sanctions screening | Industry standard for blockchain compliance                  |
| **OFAC SDN List, UN, EU sanctions** | Daily-updated lists        | Built into sanctions-svc                                     |

## Cost Comparison

| Approach                    | Cost / year                                                    | Time      |
| --------------------------- | -------------------------------------------------------------- | --------- |
| Each product builds its own | $50K vendor × 3 + $300K engineering × 3 = $1.05M               | 12 months |
| **Shared KYC service**      | $80K vendor (volume discount) + $300K engineering once = $380K | 6 months  |

Plus the shared service is operationally easier (one team, one runbook, one audit).

## Consequences

**Good:**

- Single integration per product (~1 week vs ~3 months for full KYC build)
- Consistent tier definitions across product ecosystem
- One audit trail for compliance / regulators
- Customers using multiple products do KYC ONCE (recognized across products via opt-in identity linking)
- Volume discount with vendors (Persona offers tiered pricing)

**Bad / trade-offs:**

- Cross-product dependency: KYC service outage blocks all products. Mitigation: high availability + circuit breaker per consumer; fallback to "degraded mode" with reduced limits
- Privacy gravitas: KYC service is a high-value target. Mitigation: strongest security posture (see [SECURITY.md](../SECURITY.md))
- Versioning: tier definitions changing affects all products. Mitigation: semver + 90-day deprecation notices

## Alternatives Considered

- **Each product builds its own** — Rejected (above cost analysis)
- **Buy a SaaS like Onfido directly per product** — Rejected (no cross-product identity linking, no tier standardization)
- **Use OpenOva platform's identity-svc directly** — Rejected (OpenOva identity is for platform operators; this is consumer/B2B-facing — different requirements)

## Implementation Sequencing

1. **Now (parallel to Ping foundation code):** create dynolabs-io/kyc repo, scaffold services
2. **Month 1-2:** Persona adapter + Tier 2 flow + basic SDK (TypeScript first, then RN)
3. **Month 2-3:** Sanctions service + Chainalysis integration
4. **Month 3:** Ping wires up Tier 1 + Tier 2 KYC via SDK
5. **Month 4-5:** TalentMesh wires up
6. **Month 6+:** IO Grid wires up, Tier 3 added when high-value users emerge

## See Also

- [ARCHITECTURE.md § Service Catalog](../ARCHITECTURE.md#service-catalog) — Ping's services consume KYC via SDK
- [SECURITY.md § Identity & Authorization](../SECURITY.md#identity--authorization)
- user-global CLAUDE.md §0 — product repo conventions

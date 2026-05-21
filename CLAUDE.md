# Ping Project Memory

## Project Overview

**Ping** - A worldwide peer-to-peer social money network. Send money to anyone — friends, family, colleagues, neighbors — instantly and for free between users, with minimal sub-1% fees only on cash-out. Initial go-to-market: migrant-worker corridors (GCC → Philippines, India, Bangladesh, Egypt, Kenya).

**Brand:** Ping
**Primary domain:** ping.cash
**Repository:** https://github.com/ping-cash/ping-cash

**Key Differentiators:**
- **Zero fees in-network** - free transfers between Ping users
- No app needed to receive (claim via link)
- Minimal cash-out fees (0.5-1%) vs 5-7% traditional
- Instant delivery (seconds vs days)
- Stablecoin rails (USDC on Solana)

**Revenue Model:** Treasury yield on user balances + FX spread + minimal cash-out fees

## Tech Stack

| Component | Technology |
|-----------|------------|
| Monorepo | Turborepo + pnpm workspaces |
| Language | TypeScript |
| API Framework | Fastify |
| Databases | PostgreSQL (CP), MongoDB (AP), Redis (cache) |
| Event Streaming | Redpanda (Kafka-compatible) |
| Blockchain | Solana (USDC) |
| Wallets | Privy (MPC embedded wallets) |
| Off-ramp | TransFi (GCash, Maya, M-Pesa) |
| SMS/OTP | Twilio Verify |
| Notifications | WhatsApp Business API |
| Container | Docker |
| Orchestration | Kubernetes (Civo/Vultr) |
| Service Mesh | Istio (API Gateway + mTLS) |
| CI/CD | GitHub Actions |

## Architecture

### Bounded Contexts (DDD)

1. **Identity Context**
   - auth-service (Redis)
   - user-service (MongoDB)
   - kyc-service (PostgreSQL)

2. **Payment Context**
   - transfer-service (PostgreSQL) ← TEMPLATE IMPLEMENTED
   - wallet-service (MongoDB)
   - fx-service (Redis)
   - ledger-service (PostgreSQL)

3. **Delivery Context**
   - claim-service (MongoDB)
   - offramp-service (PostgreSQL)
   - notify-service (MongoDB)

### Design Patterns

- CQRS (Command Query Responsibility Segregation)
- Event Sourcing (for ledger)
- Saga Pattern (choreography via events)
- Circuit Breaker (for external services)
- Outbox Pattern (reliable event publishing)
- Istio Service Mesh (API Gateway + mTLS + traffic management)

## Project Structure

```
ping/
├── packages/
│   ├── types/           # Shared TypeScript types (@ping/types)
│   ├── config/          # Environment config & validation (@ping/config)
│   └── utils/           # Shared utilities (@ping/utils)
├── services/
│   └── transfer/        # Transfer service (template) (@ping/transfer-service)
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── repositories/
│       │   ├── events/
│       │   └── index.ts
│       └── prisma/
├── docs/
│   ├── ARCHITECTURE.md  # System architecture with Mermaid diagrams
│   ├── NFR.md           # Non-functional requirements & design patterns
│   ├── BUSINESS.md      # Competitors, revenue model, fee structure
│   ├── CASHFLOW.md      # Cash-in and cash-out options by country
│   ├── COMPETITORS.md   # GCash/Maya comparison, why we're different
│   ├── STRATEGY.md      # Competitive moat, defensibility, risks
│   ├── FLOWS.md         # User journeys, sequence diagrams, routing logic
│   ├── DATABASE.md      # Schema documentation
│   └── API.md           # REST API specification
├── scripts/
│   ├── init-postgres.sql
│   └── init-mongo.js
├── docker-compose.yml   # Local dev infrastructure
├── turbo.json
├── pnpm-workspace.yaml
└── .github/workflows/ci.yml
```

## Local Development

```bash
# Start infrastructure
docker-compose up -d

# Install dependencies
pnpm install

# Run migrations
pnpm db:migrate

# Start all services
pnpm dev
```

## Services to Implement

### Priority Order (Phase 1)

1. **auth-service** ← NEXT TO IMPLEMENT
   - Phone OTP verification (Twilio Verify)
   - JWT token management
   - Session storage (Redis)
   - Privy user creation

2. **user-service**
   - User profiles (MongoDB)
   - Contact sync
   - KYC status tracking

3. **wallet-service**
   - Privy wallet integration
   - Balance queries (Solana)
   - USDC transfers

4. **claim-service**
   - Claim link generation
   - OTP verification for claims
   - Cash-out method selection

5. **offramp-service**
   - TransFi integration
   - GCash/Maya/Bank transfers
   - Webhook handling

6. **notify-service**
   - WhatsApp Business API
   - Twilio SMS fallback
   - Push notifications

## Key External Services

| Service | Purpose | Docs |
|---------|---------|------|
| Privy | Embedded wallets, social login | https://docs.privy.io |
| TransFi | Off-ramp to GCash/M-Pesa | https://docs.transfi.com |
| Twilio Verify | Phone OTP | https://www.twilio.com/docs/verify |
| WhatsApp Business | Notifications | https://developers.facebook.com/docs/whatsapp |

## Current Status

- [x] Project scaffolding complete
- [x] Shared packages created (types, config, utils)
- [x] Transfer service template implemented
- [x] Docker Compose for local dev
- [x] CI/CD pipeline (GitHub Actions)
- [x] Documentation with Mermaid diagrams
- [x] Business model defined (BUSINESS.md)
- [x] Cash-in/Cash-out options documented (CASHFLOW.md)
- [x] Competitor comparison vs GCash/Maya (COMPETITORS.md)
- [x] Competitive strategy & moat analysis (STRATEGY.md)
- [x] User journey flows & sequence diagrams (FLOWS.md)
- [ ] Auth service implementation
- [ ] User service implementation
- [ ] Wallet service implementation
- [ ] Claim service implementation
- [ ] Off-ramp service implementation
- [ ] Notify service implementation
- [ ] Mobile app (React Native)
- [ ] Web claim flow (Next.js)

## Key Business Decisions

### Fee Structure
- **Zero fees in-network** - transfers between Ping users are free
- **Cash-in fees** - passed through from payment providers (Apple Pay 1.5-2.5%, Card 2-3%, Bank 0.5-1%, USDC direct FREE)
- **Cash-out fees** - our revenue: Mobile wallet 0.5%, Bank 0.75%, Cash pickup 1%

### Revenue Model
1. **Treasury Yield (45%)** - Deploy user USDC balances to Circle Yield, T-Bills (Ondo), DeFi lending
2. **FX Spread (30%)** - 0.3-0.5% margin on currency conversion (vs 2-4% at banks)
3. **Cash-out Fees (15%)** - Small fees when exiting the network
4. **Premium/B2B (10%)** - Future: subscriptions, API access

### Cash-In Options
- Apple Pay, Google Pay (instant, 1.5-2.5%)
- Debit/Credit Card (instant, 2-3%)
- Bank Transfer (1-24hr, 0.5-1%)
- USDC Direct (instant, FREE)

### Cash-Out Options
- Auto-detect country from recipient phone number
- Show relevant options first (GCash for PH, M-Pesa for KE, etc.)
- Available in BOTH mobile app (senders) and web claim (recipients)
- 40+ countries, 100+ methods

### Competitors
- Global: Wise, Remitly, Western Union, WorldRemit
- Africa: Chipper Cash, Sendwave, Lemfi, Eversend
- Crypto: Strike, Coinbase, Circle
- Domestic e-wallets (NOT competitors): GCash, Maya, M-Pesa (we cash OUT to these)

See `docs/COMPETITORS.md` for detailed comparison with GCash/Maya.
See `docs/STRATEGY.md` for moat analysis and why they can't easily replicate us.

## Technical Notes

- Use Mermaid diagrams for all architecture documentation
- Follow the transfer-service as template for new services
- All financial data goes to PostgreSQL (CP)
- User/claim data goes to MongoDB (AP)
- Events published via Outbox pattern to Redpanda
- CloudEvents format for all events
- **Istio** for service mesh, API gateway, and mTLS (not Kong/Traefik)

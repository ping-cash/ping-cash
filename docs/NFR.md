# Non-Functional Requirements & System Design

## Executive Summary

This document defines the technical excellence standards for Cash - a world-class, globally scalable remittance platform. We prioritize:

- **Scale-ready from day one** - Architecture that handles 1M+ daily transactions
- **Cost-efficient bootstrap** - Start at ~$100/month, scale to enterprise
- **Event-driven microservices** - Loosely coupled, independently deployable
- **Modern UX** - Sub-100ms perceived latency, offline-first, delightful interactions
- **Zero compromise on security** - Bank-grade without bank complexity

---

## Table of Contents

1. [Architecture Principles](#architecture-principles)
2. [Microservices Design](#microservices-design)
3. [Design Patterns](#design-patterns)
4. [Data Architecture (CAP Theorem)](#data-architecture)
5. [Event-Driven Architecture](#event-driven-architecture)
6. [Caching Strategy](#caching-strategy)
7. [Kubernetes Infrastructure](#kubernetes-infrastructure)
8. [UX Requirements](#ux-requirements)
9. [Performance Requirements](#performance-requirements)
10. [Security Requirements](#security-requirements)
11. [Cost Optimization](#cost-optimization)

---

## Architecture Principles

### The Twelve-Factor App (Extended)

We follow and extend the [12-Factor methodology](https://12factor.net):

| Factor | Our Implementation |
|--------|-------------------|
| **Codebase** | Monorepo with Turborepo, service isolation |
| **Dependencies** | Explicit via pnpm workspaces, lockfiles |
| **Config** | Environment variables, K8s ConfigMaps/Secrets |
| **Backing Services** | Treated as attached resources, URL-configured |
| **Build, Release, Run** | GitOps with ArgoCD, immutable images |
| **Processes** | Stateless services, state in Redis/DB |
| **Port Binding** | Self-contained HTTP servers |
| **Concurrency** | Horizontal pod autoscaling |
| **Disposability** | Fast startup (<5s), graceful shutdown |
| **Dev/Prod Parity** | Identical containers, feature flags |
| **Logs** | Event streams to stdout, aggregated |
| **Admin Processes** | K8s Jobs for migrations, one-off tasks |

### Additional Principles

| Principle | Description |
|-----------|-------------|
| **API-First** | OpenAPI specs before implementation |
| **Event-First** | Every state change emits an event |
| **Observability-First** | Metrics, logs, traces from day one |
| **Security-First** | Zero-trust, encrypt everything |
| **Mobile-First** | UX optimized for 4G networks |

---

## Microservices Design

### Service Decomposition

We use **Domain-Driven Design (DDD)** to identify bounded contexts:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CASH PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         API GATEWAY                                  │    │
│  │                        (Kong / Traefik)                             │    │
│  │  • Rate limiting  • JWT validation  • Request routing               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         │                          │                          │             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│  │   IDENTITY  │           │   PAYMENT   │           │  DELIVERY   │       │
│  │   CONTEXT   │           │   CONTEXT   │           │   CONTEXT   │       │
│  ├─────────────┤           ├─────────────┤           ├─────────────┤       │
│  │             │           │             │           │             │       │
│  │ • Auth      │           │ • Transfer  │           │ • Claim     │       │
│  │ • User      │           │ • Wallet    │           │ • Off-ramp  │       │
│  │ • KYC       │           │ • FX        │           │ • Notify    │       │
│  │             │           │ • Ledger    │           │             │       │
│  └──────┬──────┘           └──────┬──────┘           └──────┬──────┘       │
│         │                          │                          │             │
│         └──────────────────────────┼──────────────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          EVENT BUS                                   │    │
│  │                     (Apache Kafka / Redpanda)                       │    │
│  │  • Domain events  • Integration events  • Audit log                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Catalog

| Service | Bounded Context | Responsibility | Database | Queue Topics |
|---------|----------------|----------------|----------|--------------|
| **auth-service** | Identity | Phone verification, JWT tokens | Redis | `auth.events` |
| **user-service** | Identity | User profiles, contacts | MongoDB | `user.events` |
| **kyc-service** | Identity | Identity verification | PostgreSQL | `kyc.events` |
| **transfer-service** | Payment | Transfer orchestration | PostgreSQL | `transfer.events` |
| **wallet-service** | Payment | Balance, blockchain ops | MongoDB | `wallet.events` |
| **fx-service** | Payment | Exchange rates, quotes | Redis | `fx.events` |
| **ledger-service** | Payment | Double-entry accounting | PostgreSQL | `ledger.events` |
| **claim-service** | Delivery | Claim links, verification | MongoDB | `claim.events` |
| **offramp-service** | Delivery | Cash-out orchestration | PostgreSQL | `offramp.events` |
| **notify-service** | Delivery | WhatsApp, SMS, Push | MongoDB | `notify.events` |

### Service Communication Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMMUNICATION PATTERNS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SYNCHRONOUS (gRPC/REST)              ASYNCHRONOUS (Kafka)                  │
│  ════════════════════════             ═════════════════════                 │
│                                                                              │
│  • Query operations                   • Commands (state changes)            │
│  • Real-time data needs               • Event notifications                 │
│  • Simple request/response            • Saga orchestration                  │
│                                                                              │
│  ┌─────────┐    gRPC     ┌─────────┐                                        │
│  │ Gateway │────────────▶│ Service │  (Queries: GET balance, GET user)     │
│  └─────────┘             └─────────┘                                        │
│                                                                              │
│  ┌─────────┐   Kafka    ┌─────────┐                                        │
│  │ Service │───────────▶│ Service │  (Events: TransferCreated, Claimed)    │
│  └─────────┘            └─────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Inter-Service Communication

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Sync Query** | Get user balance | gRPC with protobuf |
| **Sync Command** | Validate phone | REST with circuit breaker |
| **Async Event** | Transfer created | Kafka topic |
| **Async Command** | Send notification | Kafka with reply topic |
| **Saga** | Transfer + Claim + Offramp | Choreography via events |

---

## Design Patterns

### 1. CQRS (Command Query Responsibility Segregation)

Separate read and write models for optimal performance:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CQRS PATTERN                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌─────────────┐                                │
│                              │   Client    │                                │
│                              └──────┬──────┘                                │
│                                     │                                        │
│                    ┌────────────────┴────────────────┐                      │
│                    │                                 │                      │
│                    ▼                                 ▼                      │
│             ┌─────────────┐                  ┌─────────────┐                │
│             │  COMMANDS   │                  │   QUERIES   │                │
│             │  (Writes)   │                  │   (Reads)   │                │
│             └──────┬──────┘                  └──────┬──────┘                │
│                    │                                 │                      │
│                    ▼                                 ▼                      │
│             ┌─────────────┐                  ┌─────────────┐                │
│             │  Command    │                  │   Query     │                │
│             │  Handler    │                  │   Handler   │                │
│             └──────┬──────┘                  └──────┬──────┘                │
│                    │                                 │                      │
│                    ▼                                 ▼                      │
│             ┌─────────────┐                  ┌─────────────┐                │
│             │ PostgreSQL  │ ───Events───▶   │  MongoDB    │                │
│             │ (Write DB)  │                  │ (Read DB)   │                │
│             └─────────────┘                  └─────────────┘                │
│                                                                              │
│  Benefits:                                                                  │
│  • Optimized read models (denormalized for queries)                        │
│  • Independent scaling of read/write workloads                             │
│  • Event sourcing ready                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation**:

```typescript
// Command Model (PostgreSQL)
interface TransferCommand {
  id: string;
  senderId: string;
  recipientPhone: string;
  amount: Decimal;
  currency: Currency;
}

// Event emitted after command processing
interface TransferCreatedEvent {
  transferId: string;
  senderId: string;
  recipientPhone: string;
  amount: string;
  currency: string;
  claimCode: string;
  timestamp: Date;
}

// Read Model (MongoDB - denormalized for fast queries)
interface TransferReadModel {
  _id: string;
  sender: {
    id: string;
    name: string;
    phone: string;
  };
  recipient: {
    phone: string;
    phoneMasked: string;
  };
  amount: number;
  currency: string;
  localAmount: number;
  localCurrency: string;
  status: string;
  claimUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Event Sourcing (For Ledger Service)

Store all changes as immutable events:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EVENT SOURCING                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Traditional CRUD:           Event Sourcing:                                │
│  ════════════════            ═══════════════                                │
│                                                                              │
│  UPDATE balance              INSERT event                                   │
│  SET amount = 50             (BalanceDebited, $50)                          │
│  WHERE user_id = 1           │                                              │
│                              INSERT event                                   │
│  ❌ History lost             (BalanceCredited, $30)                         │
│                              │                                              │
│                              ✅ Full audit trail                            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                        EVENT STORE                                  │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │ stream_id │ version │ event_type      │ data            │ timestamp│     │
│  ├───────────┼─────────┼─────────────────┼─────────────────┼──────────┤     │
│  │ wallet_1  │    1    │ WalletCreated   │ {user: "abc"}   │ 10:00:00 │     │
│  │ wallet_1  │    2    │ BalanceCredited │ {amount: 100}   │ 10:01:00 │     │
│  │ wallet_1  │    3    │ BalanceDebited  │ {amount: 50}    │ 10:02:00 │     │
│  │ wallet_1  │    4    │ BalanceCredited │ {amount: 30}    │ 10:03:00 │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  Current State = Replay(all events for stream)                              │
│  Balance = 0 + 100 - 50 + 30 = $80                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Use Cases**:
- **Ledger Service**: Complete audit trail for all financial transactions
- **Compliance**: Immutable record for regulators
- **Debugging**: Replay to any point in time

### 3. Saga Pattern (Choreography)

Manage distributed transactions across services:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TRANSFER SAGA (Choreography)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Happy Path:                                                                │
│  ═══════════                                                                │
│                                                                              │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐               │
│  │Transfer │     │ Wallet  │     │ Claim   │     │ Notify  │               │
│  │ Service │     │ Service │     │ Service │     │ Service │               │
│  └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘               │
│       │               │               │               │                     │
│       │ TransferInitiated             │               │                     │
│       │──────────────▶│               │               │                     │
│       │               │               │               │                     │
│       │               │ BalanceDebited│               │                     │
│       │               │──────────────▶│               │                     │
│       │               │               │               │                     │
│       │               │               │ ClaimCreated  │                     │
│       │               │               │──────────────▶│                     │
│       │               │               │               │                     │
│       │               │               │               │ NotificationSent    │
│       │◀──────────────┴───────────────┴───────────────│                     │
│       │                                               │                     │
│                                                                              │
│  Compensation (Rollback):                                                   │
│  ════════════════════════                                                   │
│                                                                              │
│  If ClaimCreation fails:                                                    │
│  1. Notify Service receives ClaimFailed event                              │
│  2. Wallet Service receives ClaimFailed → emits BalanceRefunded            │
│  3. Transfer Service receives BalanceRefunded → marks transfer FAILED      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Event Flow**:

```typescript
// 1. Transfer Service initiates
TransferInitiated {
  transferId: "txn_123",
  senderId: "usr_abc",
  amount: "100.00",
  recipientPhone: "+639181234567"
}

// 2. Wallet Service reacts
BalanceDebited {
  walletId: "wal_xyz",
  transferId: "txn_123",
  amount: "100.00",
  newBalance: "50.00"
}

// 3. Claim Service reacts
ClaimCreated {
  claimId: "clm_456",
  transferId: "txn_123",
  code: "x7Kp2mN9qL4r",
  expiresAt: "2025-01-22T10:00:00Z"
}

// 4. Notify Service reacts
NotificationSent {
  notificationId: "ntf_789",
  transferId: "txn_123",
  channel: "whatsapp",
  recipientPhone: "+639181234567"
}
```

### 4. Circuit Breaker Pattern

Prevent cascade failures when external services fail:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CIRCUIT BREAKER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  States:                                                                    │
│  ═══════                                                                    │
│                                                                              │
│  ┌─────────┐     failures > threshold    ┌─────────┐                       │
│  │ CLOSED  │ ─────────────────────────▶  │  OPEN   │                       │
│  │         │                              │         │                       │
│  │ Normal  │                              │ Failing │                       │
│  │ traffic │  ◀─────────────────────────  │ fast    │                       │
│  └─────────┘     success in half-open    └────┬────┘                       │
│       ▲                                       │                             │
│       │                                       │ timeout                     │
│       │                                       ▼                             │
│       │                               ┌─────────────┐                       │
│       └───────────────────────────────│ HALF-OPEN  │                       │
│                success                │             │                       │
│                                       │ Test single │                       │
│                                       │ request     │                       │
│                                       └─────────────┘                       │
│                                                                              │
│  Configuration:                                                             │
│  ══════════════                                                             │
│  • Failure threshold: 5 failures in 30 seconds                             │
│  • Open duration: 30 seconds                                                │
│  • Half-open max requests: 3                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation with Resilience4j**:

```typescript
// Circuit breaker configuration
const circuitBreaker = new CircuitBreaker({
  name: 'transfi-offramp',
  failureRateThreshold: 50,        // 50% failure rate triggers open
  waitDurationInOpenState: 30000,  // 30 seconds
  permittedNumberOfCallsInHalfOpenState: 3,
  slidingWindowSize: 10,
  slowCallDurationThreshold: 5000, // 5 seconds
  slowCallRateThreshold: 80,       // 80% slow calls triggers open
});

// Usage
const result = await circuitBreaker.execute(async () => {
  return await transfiClient.createPayout(payoutRequest);
});
```

### 5. Outbox Pattern

Ensure reliable event publishing with database transactions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OUTBOX PATTERN                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Problem: How to atomically update DB AND publish event?                    │
│                                                                              │
│  ❌ Anti-pattern (dual-write):                                              │
│     1. Update database                                                      │
│     2. Publish to Kafka ← This can fail, leaving inconsistent state        │
│                                                                              │
│  ✅ Outbox Pattern:                                                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     SINGLE TRANSACTION                               │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ 1. INSERT INTO transfers (...)                               │    │    │
│  │  │ 2. INSERT INTO outbox (topic, payload, created_at)          │    │    │
│  │  │ COMMIT                                                       │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    OUTBOX PUBLISHER (Background)                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ 1. SELECT * FROM outbox WHERE published = false              │    │    │
│  │  │ 2. Publish to Kafka                                          │    │    │
│  │  │ 3. UPDATE outbox SET published = true WHERE id = ?           │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Outbox Table:                                                              │
│  ┌─────────┬────────────────┬─────────────────────────┬───────────┐        │
│  │ id      │ topic          │ payload                 │ published │        │
│  ├─────────┼────────────────┼─────────────────────────┼───────────┤        │
│  │ 1       │ transfer.events│ {TransferCreated...}    │ true      │        │
│  │ 2       │ transfer.events│ {TransferClaimed...}    │ false     │        │
│  └─────────┴────────────────┴─────────────────────────┴───────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6. API Gateway Pattern

Single entry point with cross-cutting concerns:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        KONG / Traefik                                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  Request Flow:                                                       │    │
│  │  ═════════════                                                       │    │
│  │                                                                      │    │
│  │  1. TLS Termination                                                 │    │
│  │     └─▶ Decrypt HTTPS, forward HTTP internally                      │    │
│  │                                                                      │    │
│  │  2. Rate Limiting                                                   │    │
│  │     └─▶ Redis-backed, per-user/IP limits                           │    │
│  │                                                                      │    │
│  │  3. Authentication                                                  │    │
│  │     └─▶ Validate JWT, extract user context                         │    │
│  │                                                                      │    │
│  │  4. Request Validation                                              │    │
│  │     └─▶ JSON schema validation                                      │    │
│  │                                                                      │    │
│  │  5. Routing                                                         │    │
│  │     └─▶ /auth/* → auth-service                                     │    │
│  │     └─▶ /transfers/* → transfer-service                            │    │
│  │     └─▶ /claims/* → claim-service                                  │    │
│  │                                                                      │    │
│  │  6. Response Transformation                                         │    │
│  │     └─▶ Consistent error format, CORS headers                      │    │
│  │                                                                      │    │
│  │  7. Observability                                                   │    │
│  │     └─▶ Request ID, distributed tracing, metrics                   │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7. Strangler Fig Pattern (For Future Migrations)

Incrementally replace components without big-bang rewrites:

```
Phase 1: New service handles new features
Phase 2: Route specific paths to new service
Phase 3: Migrate remaining traffic
Phase 4: Decommission old service
```

---

## Data Architecture

### CAP Theorem Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CAP THEOREM                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         CONSISTENCY                                         │
│                              △                                               │
│                             /│\                                              │
│                            / │ \                                             │
│                           /  │  \                                            │
│                          /   │   \                                           │
│                         /    │    \                                          │
│                        /  CA │ CP  \                                         │
│                       /      │      \                                        │
│                      /       │       \                                       │
│                     ▼────────┴────────▼                                      │
│              AVAILABILITY            PARTITION                               │
│                                     TOLERANCE                                │
│                                                                              │
│  Network partitions WILL happen. Choose between:                            │
│  • CP: Consistency + Partition Tolerance (reject writes during partition)   │
│  • AP: Availability + Partition Tolerance (accept writes, resolve later)    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Selection by Service

| Service | Database | CAP | Rationale |
|---------|----------|-----|-----------|
| **ledger-service** | PostgreSQL | CP | Financial data MUST be consistent, ACID required |
| **transfer-service** | PostgreSQL | CP | Transaction integrity critical |
| **kyc-service** | PostgreSQL | CP | Compliance data, audit requirements |
| **user-service** | MongoDB | AP | Profile reads > writes, eventual consistency OK |
| **wallet-service** | MongoDB | AP | Balance derived from events, fast reads |
| **claim-service** | MongoDB | AP | High read volume for claim lookups |
| **notify-service** | MongoDB | AP | Best-effort delivery, retries handle failures |
| **auth-service** | Redis | AP | Session data, TTL-based, fast |
| **fx-service** | Redis | AP | Cache, rates update frequently |

### PostgreSQL (CP - Strong Consistency)

For financial data requiring ACID guarantees:

```sql
-- Ledger entries with double-entry accounting
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    account_id UUID NOT NULL,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    balance_after DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure debits and credits balance
    CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Optimistic locking for concurrent updates
CREATE TABLE transfers (
    id UUID PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,  -- Optimistic lock
    status VARCHAR(20) NOT NULL,
    -- ... other fields

    CONSTRAINT valid_status CHECK (status IN (
        'PENDING', 'CONFIRMED', 'CLAIMED', 'PROCESSING',
        'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'
    ))
);

-- Update with optimistic lock
UPDATE transfers
SET status = 'CLAIMED', version = version + 1
WHERE id = $1 AND version = $2;
```

### MongoDB (AP - High Availability)

For read-heavy, eventually consistent data:

```javascript
// User read model (denormalized for queries)
{
  _id: ObjectId("..."),
  phone: "+639171234567",
  phoneHash: "sha256...",  // For lookups
  profile: {
    name: "John Doe",
    email: "john@example.com",
    avatar: "https://..."
  },
  kyc: {
    status: "verified",
    tier: 2,
    verifiedAt: ISODate("...")
  },
  wallet: {
    address: "7xKp...",
    chain: "solana"
  },
  stats: {
    totalSent: 1500.00,
    totalReceived: 200.00,
    transferCount: 15
  },
  contacts: [
    { name: "Mom", phone: "+639181234567", isRegistered: true },
    { name: "Dad", phone: "+639191234567", isRegistered: false }
  ],
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// Indexes for fast queries
db.users.createIndex({ "phoneHash": 1 }, { unique: true });
db.users.createIndex({ "wallet.address": 1 });
db.users.createIndex({ "contacts.phone": 1 });
```

### Redis (Caching & Sessions)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REDIS DATA STRUCTURES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Sessions (String with TTL):                                                │
│  ══════════════════════════                                                 │
│  KEY: session:{session_id}                                                  │
│  VALUE: {userId, phone, createdAt, ...}                                    │
│  TTL: 24 hours                                                              │
│                                                                              │
│  Rate Limiting (Sorted Set):                                                │
│  ═══════════════════════════                                                │
│  KEY: ratelimit:{user_id}:{endpoint}                                       │
│  MEMBERS: request timestamps                                                │
│  Use ZRANGEBYSCORE to count requests in window                             │
│                                                                              │
│  OTP Codes (String with TTL):                                               │
│  ════════════════════════════                                               │
│  KEY: otp:{phone_hash}                                                      │
│  VALUE: {code, attempts, createdAt}                                        │
│  TTL: 10 minutes                                                            │
│                                                                              │
│  FX Rates Cache (Hash):                                                     │
│  ══════════════════════                                                     │
│  KEY: fx:rates:USD                                                          │
│  FIELDS: PHP=55.80, INR=83.25, PKR=278.50                                  │
│  TTL: 60 seconds                                                            │
│                                                                              │
│  Claim Code Lookup (String):                                                │
│  ═══════════════════════════                                                │
│  KEY: claim:{code}                                                          │
│  VALUE: {claimId, transferId, status}                                      │
│  TTL: 7 days                                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Event-Driven Architecture

### Apache Kafka / Redpanda

We use **Redpanda** (Kafka-compatible, simpler operations) for event streaming:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVENT STREAMING ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         REDPANDA CLUSTER                             │    │
│  │                      (Kafka-compatible)                              │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  Topics:                                                             │    │
│  │  ═══════                                                             │    │
│  │                                                                      │    │
│  │  transfer.events (partitioned by sender_id)                         │    │
│  │  ├── TransferInitiated                                              │    │
│  │  ├── TransferConfirmed                                              │    │
│  │  ├── TransferClaimed                                                │    │
│  │  ├── TransferCompleted                                              │    │
│  │  ├── TransferCancelled                                              │    │
│  │  └── TransferFailed                                                 │    │
│  │                                                                      │    │
│  │  wallet.events (partitioned by wallet_id)                           │    │
│  │  ├── BalanceDebited                                                 │    │
│  │  ├── BalanceCredited                                                │    │
│  │  └── BalanceRefunded                                                │    │
│  │                                                                      │    │
│  │  claim.events (partitioned by claim_id)                             │    │
│  │  ├── ClaimCreated                                                   │    │
│  │  ├── ClaimVerified                                                  │    │
│  │  └── ClaimExpired                                                   │    │
│  │                                                                      │    │
│  │  offramp.events (partitioned by offramp_id)                         │    │
│  │  ├── OfframpInitiated                                               │    │
│  │  ├── OfframpProcessing                                              │    │
│  │  ├── OfframpCompleted                                               │    │
│  │  └── OfframpFailed                                                  │    │
│  │                                                                      │    │
│  │  notify.commands (partitioned by recipient_phone)                   │    │
│  │  ├── SendWhatsApp                                                   │    │
│  │  ├── SendSMS                                                        │    │
│  │  └── SendPush                                                       │    │
│  │                                                                      │    │
│  │  audit.events (all events mirrored for compliance)                  │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event Schema (CloudEvents + Avro)

```typescript
// CloudEvents envelope
interface CloudEvent<T> {
  specversion: "1.0";
  type: string;                    // e.g., "com.cash.transfer.created"
  source: string;                  // e.g., "/services/transfer"
  id: string;                      // UUID
  time: string;                    // ISO 8601
  datacontenttype: "application/json";
  data: T;

  // Extensions
  correlationid: string;           // For distributed tracing
  causationid: string;             // Event that caused this event
}

// Example event
{
  "specversion": "1.0",
  "type": "com.cash.transfer.created",
  "source": "/services/transfer",
  "id": "evt_abc123",
  "time": "2025-01-15T10:00:00Z",
  "datacontenttype": "application/json",
  "correlationid": "corr_xyz789",
  "causationid": "cmd_def456",
  "data": {
    "transferId": "txn_123",
    "senderId": "usr_abc",
    "recipientPhone": "+639181234567",
    "amount": "100.00",
    "currency": "USD",
    "claimCode": "x7Kp2mN9qL4r"
  }
}
```

### Consumer Groups & Ordering

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONSUMER GROUPS & PARTITIONING                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Topic: transfer.events (6 partitions)                                      │
│                                                                              │
│  ┌───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐ │
│  │Partition 0│Partition 1│Partition 2│Partition 3│Partition 4│Partition 5│ │
│  └─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┘ │
│        │           │           │           │           │           │        │
│        │           │           │           │           │           │        │
│  ┌─────┴───────────┴───────────┴───────────┴───────────┴───────────┴─────┐ │
│  │                    Consumer Group: claim-service                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                             │ │
│  │  │Consumer 1│  │Consumer 2│  │Consumer 3│                             │ │
│  │  │ P0, P1   │  │ P2, P3   │  │ P4, P5   │                             │ │
│  │  └──────────┘  └──────────┘  └──────────┘                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Consumer Group: notify-service                      │ │
│  │  ┌──────────┐  ┌──────────┐                                           │ │
│  │  │Consumer 1│  │Consumer 2│  (separate group, sees all events)        │ │
│  │  │ P0,P1,P2 │  │ P3,P4,P5 │                                           │ │
│  │  └──────────┘  └──────────┘                                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Partitioning Key: sender_id                                                │
│  Guarantees: All events for same sender processed in order                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Caching Strategy

### Multi-Layer Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CACHING LAYERS                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: CDN (Cloudflare)                                                  │
│  ═════════════════════════                                                  │
│  • Static assets (JS, CSS, images)                                          │
│  • API responses with Cache-Control headers                                 │
│  • Geographic distribution                                                  │
│  • TTL: 1 hour - 1 year                                                    │
│                                                                              │
│  Layer 2: API Gateway Cache (Kong)                                          │
│  ═════════════════════════════════                                          │
│  • Frequently accessed, public endpoints                                    │
│  • FX rates, claim info                                                     │
│  • TTL: 60 seconds                                                          │
│                                                                              │
│  Layer 3: Application Cache (Redis)                                         │
│  ══════════════════════════════════                                         │
│  • Sessions, OTP codes                                                      │
│  • User profiles, wallet balances                                           │
│  • TTL: varies by data type                                                │
│                                                                              │
│  Layer 4: Database Query Cache                                              │
│  ═════════════════════════════                                              │
│  • PostgreSQL prepared statements                                           │
│  • MongoDB working set in RAM                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cache Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Cache-Aside** | User profiles | Read from cache, fallback to DB, populate cache |
| **Write-Through** | Session data | Write to cache + DB simultaneously |
| **Write-Behind** | Analytics | Write to cache, async persist to DB |
| **Refresh-Ahead** | FX rates | Proactively refresh before expiry |

### Cache Invalidation Strategy

```typescript
// Event-driven cache invalidation
@EventHandler('user.updated')
async handleUserUpdated(event: UserUpdatedEvent) {
  // Invalidate user cache
  await redis.del(`user:${event.userId}`);
  await redis.del(`user:phone:${event.phoneHash}`);

  // Publish cache invalidation event for CDN
  await kafka.publish('cache.invalidation', {
    keys: [`/api/users/${event.userId}`],
    tags: ['user-profile'],
  });
}
```

---

## Kubernetes Infrastructure

### Provider Comparison

| Provider | Monthly Cost | Pros | Cons |
|----------|--------------|------|------|
| **Civo** | $20 | Cheapest, K3s (fast), developer-friendly | Smaller ecosystem |
| **Vultr** | $30 | Best resources/price, global | Newer K8s offering |
| **Linode** | $34 | Akamai backing, reliable | Higher cost |
| **DigitalOcean** | $36 | Great docs, easy | Most expensive |

**Recommendation**: Start with **Civo** ($20/mo), migrate to **Vultr** for production.

### Cluster Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KUBERNETES CLUSTER ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  NAMESPACE: cash-system                                                     │
│  ══════════════════════                                                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         INGRESS LAYER                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Traefik    │  │ Cert-Manager │  │  External    │               │    │
│  │  │   Ingress    │  │ (Let's Enc.) │  │    DNS       │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         SERVICE MESH                                 │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Linkerd (lightweight)                      │   │    │
│  │  │  • mTLS between services                                      │   │    │
│  │  │  • Traffic splitting (canary)                                 │   │    │
│  │  │  • Observability (golden metrics)                            │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      APPLICATION SERVICES                            │    │
│  │                                                                      │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │   auth     │ │   user     │ │  transfer  │ │   wallet   │       │    │
│  │  │  service   │ │  service   │ │  service   │ │  service   │       │    │
│  │  │  (2 pods)  │ │  (2 pods)  │ │  (3 pods)  │ │  (2 pods)  │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  │                                                                      │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │   claim    │ │  offramp   │ │   notify   │ │    fx      │       │    │
│  │  │  service   │ │  service   │ │  service   │ │  service   │       │    │
│  │  │  (2 pods)  │ │  (2 pods)  │ │  (2 pods)  │ │  (1 pod)   │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       DATA SERVICES                                  │    │
│  │                                                                      │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐                       │    │
│  │  │ PostgreSQL │ │  MongoDB   │ │   Redis    │                       │    │
│  │  │  (Crunchy) │ │ (Percona)  │ │  (Bitnami) │                       │    │
│  │  │            │ │            │ │            │                       │    │
│  │  │ Primary +  │ │ ReplicaSet │ │  Sentinel  │                       │    │
│  │  │ Read Rep.  │ │  (3 nodes) │ │  (3 nodes) │                       │    │
│  │  └────────────┘ └────────────┘ └────────────┘                       │    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────┐                     │    │
│  │  │              Redpanda                       │                     │    │
│  │  │         (Kafka-compatible)                  │                     │    │
│  │  │            (3 brokers)                      │                     │    │
│  │  └────────────────────────────────────────────┘                     │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      OBSERVABILITY                                   │    │
│  │                                                                      │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │ Prometheus │ │   Grafana  │ │   Loki     │ │   Tempo    │       │    │
│  │  │  (metrics) │ │  (dashb.)  │ │   (logs)   │ │  (traces)  │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Resource Allocation (Bootstrap → Scale)

**Bootstrap (MVP - $100/month)**:

```yaml
# Minimal viable cluster
nodes:
  - type: small  # 2 vCPU, 4GB RAM
    count: 3

resources:
  services:
    auth: { cpu: 100m, memory: 128Mi, replicas: 1 }
    user: { cpu: 100m, memory: 128Mi, replicas: 1 }
    transfer: { cpu: 200m, memory: 256Mi, replicas: 1 }
    wallet: { cpu: 100m, memory: 128Mi, replicas: 1 }
    claim: { cpu: 100m, memory: 128Mi, replicas: 1 }
    offramp: { cpu: 100m, memory: 128Mi, replicas: 1 }
    notify: { cpu: 100m, memory: 128Mi, replicas: 1 }
    fx: { cpu: 50m, memory: 64Mi, replicas: 1 }

  data:
    postgresql: { cpu: 500m, memory: 1Gi }  # Managed or single pod
    mongodb: { cpu: 500m, memory: 1Gi }     # Single replica
    redis: { cpu: 100m, memory: 256Mi }     # Single pod
    redpanda: { cpu: 500m, memory: 1Gi }    # Single broker
```

**Growth (1K daily transfers - $300/month)**:

```yaml
nodes:
  - type: medium  # 4 vCPU, 8GB RAM
    count: 3

resources:
  services:
    auth: { cpu: 200m, memory: 256Mi, replicas: 2 }
    user: { cpu: 200m, memory: 256Mi, replicas: 2 }
    transfer: { cpu: 500m, memory: 512Mi, replicas: 2 }
    # ... scaled appropriately

  data:
    postgresql: { cpu: 1, memory: 2Gi, replicas: 2 }
    mongodb: { cpu: 1, memory: 2Gi, replicas: 3 }
    redis: { cpu: 500m, memory: 1Gi, replicas: 3 }
    redpanda: { cpu: 1, memory: 2Gi, replicas: 3 }
```

**Scale (100K daily transfers - $2000/month)**:

```yaml
nodes:
  - type: large  # 8 vCPU, 16GB RAM
    count: 6
  - type: medium  # Spot instances for workers
    count: 4
    spot: true

# Add HPA for auto-scaling
horizontalPodAutoscaler:
  transfer-service:
    minReplicas: 3
    maxReplicas: 10
    targetCPU: 70%
```

### Helm Charts Structure

```
helm/
├── cash-platform/               # Umbrella chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── charts/
│       ├── auth-service/
│       ├── user-service/
│       ├── transfer-service/
│       ├── wallet-service/
│       ├── claim-service/
│       ├── offramp-service/
│       ├── notify-service/
│       └── fx-service/
├── cash-data/                   # Data layer
│   ├── postgresql/
│   ├── mongodb/
│   ├── redis/
│   └── redpanda/
└── cash-observability/          # Monitoring
    ├── prometheus/
    ├── grafana/
    ├── loki/
    └── tempo/
```

---

## UX Requirements

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UX DESIGN PRINCIPLES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. INVISIBLE COMPLEXITY                                                    │
│     ═══════════════════════                                                 │
│     • User sees: "Send $100 to Mom"                                        │
│     • We handle: Blockchain, stablecoins, FX, off-ramp                     │
│     • Zero crypto jargon in UI                                              │
│                                                                              │
│  2. PROGRESSIVE DISCLOSURE                                                  │
│     ═══════════════════════                                                 │
│     • Start simple, reveal complexity only when needed                      │
│     • Default options that work for 90% of users                           │
│     • Advanced options hidden but accessible                                │
│                                                                              │
│  3. INSTANT FEEDBACK                                                        │
│     ══════════════════                                                      │
│     • Every action acknowledged < 100ms                                     │
│     • Optimistic updates (show success, reconcile async)                   │
│     • Skeleton screens, not spinners                                        │
│                                                                              │
│  4. ERROR PREVENTION > ERROR HANDLING                                       │
│     ══════════════════════════════════                                      │
│     • Validate phone numbers as typed                                       │
│     • Confirm large amounts before sending                                  │
│     • Undo option for 5 seconds after action                               │
│                                                                              │
│  5. OFFLINE-FIRST                                                           │
│     ═════════════                                                           │
│     • App works without network (view balance, history)                     │
│     • Queue actions when offline, sync when connected                       │
│     • Clear indicators of sync status                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile App UX Specifications

#### Animation & Motion

```typescript
// React Native Reanimated configuration
const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

// Screen transitions
const screenTransition = {
  animation: 'spring',
  config: springConfig,
};

// Micro-interactions
const buttonPress = {
  scale: withSpring(0.95, { damping: 10, stiffness: 400 }),
  opacity: withTiming(0.8, { duration: 100 }),
};

// Success celebration
const successAnimation = {
  confetti: true,
  haptic: 'success',
  sound: 'cash-register.mp3',
};
```

#### Haptic Feedback

| Action | Haptic Type | Duration |
|--------|-------------|----------|
| Button press | Light | 10ms |
| Toggle switch | Medium | 15ms |
| Amount confirm | Heavy | 25ms |
| Transfer success | Success | - |
| Error | Error | - |

#### Loading States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOADING STATE HIERARCHY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  < 100ms:  No indicator (imperceptible)                                     │
│  ─────────────────────────────────────                                      │
│                                                                              │
│  100ms - 1s:  Skeleton screen                                               │
│  ──────────────────────────────────                                         │
│  ┌─────────────────────────────┐                                            │
│  │ ████████████  ████████████  │  ← Pulsing placeholder                    │
│  │ ████████████████████        │                                            │
│  │ ██████████                  │                                            │
│  └─────────────────────────────┘                                            │
│                                                                              │
│  1s - 5s:  Skeleton + progress indicator                                    │
│  ─────────────────────────────────────                                      │
│  ┌─────────────────────────────┐                                            │
│  │ Loading your transfers...   │  ← Contextual message                     │
│  │ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░  │  ← Progress bar                           │
│  └─────────────────────────────┘                                            │
│                                                                              │
│  > 5s:  Full progress with cancel option                                    │
│  ──────────────────────────────────────                                     │
│  ┌─────────────────────────────┐                                            │
│  │ Processing transfer...      │                                            │
│  │ This may take a moment      │                                            │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░  │                                            │
│  │                             │                                            │
│  │        [Cancel]             │                                            │
│  └─────────────────────────────┘                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Empty States

Every empty state is an opportunity to guide the user:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          ┌─────────┐                                        │
│                          │   📤    │                                        │
│                          └─────────┘                                        │
│                                                                              │
│                    No transfers yet                                         │
│                                                                              │
│           Send money to family and friends                                  │
│           anywhere in the world.                                            │
│                                                                              │
│                  ┌─────────────────────┐                                    │
│                  │  Send your first $  │                                    │
│                  └─────────────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Web Claim Flow UX

#### Mobile-First Responsive

```css
/* Design breakpoints */
--mobile: 320px;   /* Minimum supported */
--tablet: 768px;   /* iPad portrait */
--desktop: 1024px; /* Optional desktop support */

/* Touch targets */
--min-touch-target: 44px;  /* Apple HIG */
--comfortable-touch: 56px; /* Our standard */

/* Typography scale */
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;  /* Minimum for mobile forms */
--text-lg: 18px;
--text-xl: 24px;
--text-2xl: 32px;
--text-3xl: 48px;   /* Hero amounts */
```

#### Claim Page States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLAIM FLOW STATES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  State 1: Landing                    State 2: Verify                        │
│  ┌─────────────────────────┐        ┌─────────────────────────┐            │
│  │                         │        │                         │            │
│  │     You received        │        │   Enter the code sent   │            │
│  │       $100.00           │        │   to +63 *** *** 4567   │            │
│  │                         │        │                         │            │
│  │     from John           │        │   ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐│            │
│  │                         │        │   │ │ │ │ │ │ │ │ │ │ │ ││            │
│  │  [Claim Now]            │        │   └─┘ └─┘ └─┘ └─┘ └─┘ └─┘│            │
│  │                         │        │                         │            │
│  │  Expires in 6 days      │        │   Resend code (0:45)    │            │
│  │                         │        │                         │            │
│  └─────────────────────────┘        └─────────────────────────┘            │
│                                                                              │
│  State 3: Cash-out Selection         State 4: Success                       │
│  ┌─────────────────────────┐        ┌─────────────────────────┐            │
│  │                         │        │                         │            │
│  │  Choose how to receive  │        │         ✓               │            │
│  │       ₱5,580            │        │                         │            │
│  │                         │        │   ₱5,580 sent to        │            │
│  │  ┌───────────────────┐  │        │   your GCash!           │            │
│  │  │ 📱 GCash  Instant │  │        │                         │            │
│  │  └───────────────────┘  │        │   Reference: CASH-12345 │            │
│  │  ┌───────────────────┐  │        │                         │            │
│  │  │ 📱 Maya   Instant │  │        │   ┌───────────────────┐ │            │
│  │  └───────────────────┘  │        │   │  Send money back  │ │            │
│  │  ┌───────────────────┐  │        │   └───────────────────┘ │            │
│  │  │ 🏦 Bank   1-2 hrs │  │        │                         │            │
│  │  └───────────────────┘  │        │                         │            │
│  │                         │        │                         │            │
│  └─────────────────────────┘        └─────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Performance Perception

```typescript
// Optimistic Updates
const handleSend = async () => {
  // 1. Immediately show success UI
  setStatus('success');
  showConfetti();
  playSuccessSound();

  // 2. Actually process transfer
  try {
    await createTransfer(data);
    // Already showing success, nothing to do
  } catch (error) {
    // 3. Rollback UI if failed
    setStatus('error');
    showError(error.message);
  }
};

// Skeleton Loading
const TransferListSkeleton = () => (
  <View>
    {[1, 2, 3].map(i => (
      <Animated.View
        key={i}
        style={[styles.skeleton, pulseAnimation]}
      />
    ))}
  </View>
);
```

### Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | 4.5:1 minimum for text |
| Touch targets | 44x44px minimum |
| Screen reader | Full VoiceOver/TalkBack support |
| Reduce motion | Respect system preference |
| Text scaling | Support up to 200% |

---

## Performance Requirements

### Latency SLOs

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| API response | 50ms | 150ms | 300ms |
| Transfer creation | 100ms | 300ms | 500ms |
| Claim page load | 200ms | 500ms | 1s |
| Cash-out initiation | 200ms | 500ms | 1s |
| Mobile app cold start | 1s | 2s | 3s |

### Throughput Targets

| Phase | Daily Transfers | TPS Peak | Concurrent Users |
|-------|-----------------|----------|------------------|
| MVP | 100 | 1 | 50 |
| Growth | 10,000 | 10 | 500 |
| Scale | 1,000,000 | 100 | 10,000 |

### Database Performance

```sql
-- All critical queries must have explain plans
-- Target: All queries < 10ms

-- Example: Transfer lookup (indexed)
EXPLAIN ANALYZE
SELECT * FROM transfers
WHERE id = 'txn_123';
-- Expected: Index Scan, < 1ms

-- Example: User transfers (compound index)
CREATE INDEX idx_transfers_sender_created
ON transfers (sender_id, created_at DESC);

EXPLAIN ANALYZE
SELECT * FROM transfers
WHERE sender_id = 'usr_abc'
ORDER BY created_at DESC
LIMIT 20;
-- Expected: Index Scan, < 5ms
```

---

## Security Requirements

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: Edge (Cloudflare)                                                 │
│  ══════════════════════════                                                 │
│  • DDoS protection                                                          │
│  • WAF rules                                                                │
│  • Bot detection                                                            │
│  • Rate limiting                                                            │
│                                                                              │
│  Layer 2: Network (K8s)                                                     │
│  ══════════════════════                                                     │
│  • Network policies (pod isolation)                                         │
│  • Service mesh mTLS (Linkerd)                                             │
│  • Ingress TLS termination                                                  │
│                                                                              │
│  Layer 3: Application                                                       │
│  ════════════════════                                                       │
│  • JWT authentication                                                       │
│  • Input validation (Zod schemas)                                          │
│  • CORS, CSP headers                                                        │
│  • SQL injection prevention (parameterized)                                │
│                                                                              │
│  Layer 4: Data                                                              │
│  ═════════════                                                              │
│  • Encryption at rest (AES-256)                                            │
│  • Encryption in transit (TLS 1.3)                                         │
│  • PII hashing/masking                                                     │
│  • Audit logging                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Secrets Management

```yaml
# External Secrets Operator + Doppler/Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: cash-api-secrets
spec:
  secretStoreRef:
    name: doppler
    kind: ClusterSecretStore
  target:
    name: cash-api-secrets
  data:
    - secretKey: PRIVY_APP_SECRET
      remoteRef:
        key: PRIVY_APP_SECRET
    - secretKey: DATABASE_URL
      remoteRef:
        key: DATABASE_URL
```

---

## Cost Optimization

### Bootstrap to Scale Cost Projection

| Phase | Monthly Cost | Components |
|-------|--------------|------------|
| **MVP** | ~$150 | Civo K8s ($20) + Managed DBs ($80) + External services ($50) |
| **Growth** | ~$500 | Vultr K8s ($100) + Larger DBs ($250) + Services ($150) |
| **Scale** | ~$3,000 | Multi-node cluster + HA databases + Premium services |

### Cost-Saving Strategies

1. **Spot/Preemptible Nodes**: Use for stateless workers (50% savings)
2. **Reserved Capacity**: Commit to 1-year for databases (30% savings)
3. **Right-sizing**: Start small, scale based on actual usage
4. **Managed vs Self-hosted**: Start managed, self-host at scale
5. **CDN Caching**: Reduce API calls with aggressive caching

---

## Summary

This architecture provides:

- ✅ **World-class design patterns** (CQRS, Event Sourcing, Saga, Circuit Breaker)
- ✅ **CAP-aware database selection** (PostgreSQL for finance, MongoDB for reads)
- ✅ **Event-driven with Kafka/Redpanda** (reliable, scalable messaging)
- ✅ **Kubernetes-first** (Civo/Vultr for cost efficiency)
- ✅ **Modern UX** (offline-first, sub-100ms feedback, delightful interactions)
- ✅ **Scale-ready** (horizontal scaling from day one)
- ✅ **Cost-efficient bootstrap** (~$150/month to start)

Ready to proceed with implementation?

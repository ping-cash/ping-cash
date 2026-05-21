# Architecture

**WHAT:** Single source of truth for how Ping is engineered — system components, services, design patterns, data layer, user journeys, API surface, and infrastructure.

**AUTHORITY:** 📐 PERMANENT. If something contradicts this, the work is wrong.

This document was consolidated on 2026-05-21 from the following predecessor files (now retired):
- `docs/ARCHITECTURE.md` (original Phase 1 technical architecture)
- `docs/NFR.md` (non-functional requirements — design patterns, infra, microservices)
- `docs/API.md` (REST API specification)
- `docs/DATABASE.md` (schema documentation)
- `docs/FLOWS.md` (user journey sequence diagrams)
- `docs/CASHFLOW.md` (on/off-ramp integration sections)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Bounded Contexts (DDD)](#bounded-contexts-ddd)
3. [Service Catalog](#service-catalog)
4. [Design Patterns](#design-patterns)
5. [Data Layer](#data-layer)
6. [User Journeys](#user-journeys)
7. [Route Selection Logic](#route-selection-logic)
8. [API Reference](#api-reference)
9. [Cash-In / Cash-Out Integration](#cash-in--cash-out-integration)
10. [Caching Strategy](#caching-strategy)
11. [Event-Driven Architecture](#event-driven-architecture)
12. [Infrastructure (Kubernetes)](#infrastructure-kubernetes)
13. [UX Requirements](#ux-requirements)

---

## System Overview

Ping is a worldwide P2P social money network. Senders interact via a mobile app; recipients claim via a web link (no app required). Settlement happens on stablecoin rails (USDC on Solana) with off-ramps to local mobile wallets, bank accounts, and cash pickup.

```mermaid
flowchart TB
    subgraph Clients["📱 Clients"]
        Mobile["Mobile App<br/>(React Native + Expo)"]
        Web["Web Claim<br/>(Next.js)"]
        Admin["Admin Panel<br/>(Next.js)"]
    end

    subgraph Gateway["🚪 Istio Service Mesh"]
        Istio["Istio Gateway<br/>mTLS • Rate Limit • JWT • Traffic Mgmt"]
    end

    subgraph Services["⚙️ Backend Services"]
        Auth["Auth Service<br/>Phone verify • Sessions"]
        Transfer["Transfer Service<br/>Create • Execute • Status"]
        Claim["Claim Service<br/>Generate • Verify • Process"]
        User["User Service<br/>Profile • KYC • Contacts"]
        Wallet["Wallet Service<br/>Balance • Addresses • Privy"]
        Notify["Notify Service<br/>WhatsApp • SMS • Push"]
        Offramp["Off-ramp Service<br/>TransFi • Webhooks"]
        FX["FX Service<br/>Rates • Conversion"]
        Compliance["Compliance Service<br/>AML • Sanctions • Limits"]
    end

    subgraph Data["💾 Data Layer"]
        PG[(PostgreSQL<br/>Transfers • Ledger)]
        Mongo[(MongoDB<br/>Users • Claims)]
        Redis[(Redis<br/>Sessions • Cache)]
        S3[(S3/Minio<br/>KYC docs • Logs)]
    end

    subgraph External["🌐 External Services"]
        Privy["Privy<br/>Embedded Wallets"]
        TransFi["TransFi<br/>Off-ramp"]
        Twilio["Twilio<br/>SMS/OTP"]
        WhatsApp["WhatsApp API<br/>Notifications"]
        Solana["Solana<br/>USDC"]
        Persona["Persona<br/>KYC/ID"]
    end

    Mobile --> Istio
    Web --> Istio
    Admin --> Istio

    Istio --> Auth & Transfer & Claim & User & Wallet

    Auth --> Redis
    User --> Mongo
    Transfer --> PG
    Wallet --> Privy
    Wallet --> Solana
    Claim --> Mongo
    Offramp --> TransFi
    Notify --> WhatsApp & Twilio
    Compliance --> Persona

    style Gateway fill:#003459,color:#fff
    style Clients fill:#1e40af,color:#fff
    style Services fill:#10b981,color:#fff
    style Data fill:#7c3aed,color:#fff
    style External fill:#ea580c,color:#fff
```

### Architecture Principles

We follow the [12-Factor methodology](https://12factor.net) plus our own additions:

| Principle | Implementation |
|---|---|
| **API-First** | OpenAPI specs before implementation |
| **Event-First** | Every state change emits an event |
| **Observability-First** | Metrics, logs, traces from day one |
| **Security-First** | Zero-trust, encrypt everything |
| **Mobile-First** | UX optimized for 4G networks |
| **Stateless Services** | All state in Redis/DB; pods are disposable |
| **GitOps** | Flux/ArgoCD, immutable images, declarative config |

> **Source:** previously docs/NFR.md § "Architecture Principles" (merged here on 2026-05-21).

---

## Bounded Contexts (DDD)

We use Domain-Driven Design to split the system into three bounded contexts:

```mermaid
flowchart TB
    subgraph Platform["PING PLATFORM"]
        subgraph Gateway["🚪 ISTIO SERVICE MESH"]
            GW[mTLS • Rate Limiting • JWT • Traffic Mgmt]
        end

        subgraph Identity["🔐 IDENTITY CONTEXT"]
            Auth[auth-service]
            User[user-service]
            KYC[kyc-service]
        end

        subgraph Payment["💰 PAYMENT CONTEXT"]
            Transfer[transfer-service]
            Wallet[wallet-service]
            FX[fx-service]
            Ledger[ledger-service]
        end

        subgraph Delivery["📦 DELIVERY CONTEXT"]
            Claim[claim-service]
            Offramp[offramp-service]
            Notify[notify-service]
        end

        subgraph EventBus["📨 EVENT BUS (Redpanda)"]
            Events[Domain Events • Integration Events • Audit Log]
        end

        GW --> Identity & Payment & Delivery
        Identity & Payment & Delivery --> EventBus
    end

    style Gateway fill:#003459,color:#fff
    style Identity fill:#7c3aed,color:#fff
    style Payment fill:#10b981,color:#fff
    style Delivery fill:#ea580c,color:#fff
    style EventBus fill:#e11d48,color:#fff
```

> **Source:** previously docs/NFR.md § "Microservices Design" (merged here on 2026-05-21).

---

## Service Catalog

| Service | Bounded Context | Responsibility | Database | Event Topic |
|---|---|---|---|---|
| `auth-service` | Identity | Phone verification, JWT tokens | Redis | `auth.events` |
| `user-service` | Identity | User profiles, contacts | MongoDB | `user.events` |
| `kyc-service` | Identity | Identity verification | PostgreSQL | `kyc.events` |
| `transfer-service` | Payment | Transfer orchestration | PostgreSQL | `transfer.events` |
| `wallet-service` | Payment | Balance, blockchain ops | MongoDB | `wallet.events` |
| `fx-service` | Payment | Exchange rates, quotes | Redis | `fx.events` |
| `ledger-service` | Payment | Double-entry accounting | PostgreSQL | `ledger.events` |
| `claim-service` | Delivery | Claim links, verification | MongoDB | `claim.events` |
| `offramp-service` | Delivery | Cash-out orchestration | PostgreSQL | `offramp.events` |
| `notify-service` | Delivery | WhatsApp, SMS, Push | MongoDB | `notify.events` |

### Auth Service

```mermaid
sequenceDiagram
    participant C as Client
    participant A as auth-service
    participant R as Redis
    participant T as Twilio
    participant P as Privy

    C->>A: POST /auth/init {phone}
    A->>T: Send OTP
    A->>R: Store OTP attempt
    A-->>C: {session_id}

    C->>A: POST /auth/verify {otp}
    A->>T: Verify OTP
    A->>P: Create/Get User
    P-->>A: {wallet_address}
    A->>R: Create session
    A-->>C: {jwt, user}
```

### Transfer Service State Machine

```mermaid
stateDiagram-v2
    [*] --> pending: Create transfer
    pending --> confirmed: Blockchain confirmed
    confirmed --> claimed: Recipient verified
    claimed --> processing: Off-ramp initiated
    processing --> completed: Funds delivered

    pending --> cancelled: Sender cancels
    confirmed --> expired: 7 days passed
    processing --> failed: Off-ramp failed

    cancelled --> [*]
    expired --> [*]
    completed --> [*]
    failed --> processing: Retry
```

### Wallet Service (Privy MPC)

```mermaid
flowchart LR
    subgraph App["Mobile App"]
        U[User]
    end

    subgraph Backend["wallet-service"]
        WS[Wallet API]
    end

    subgraph Privy["Privy MPC"]
        S1[Shard 1<br/>Device]
        S2[Shard 2<br/>Privy]
        S3[Shard 3<br/>Recovery]
    end

    subgraph Solana["Solana"]
        USDC[USDC Token]
    end

    U --> WS
    WS --> S1 & S2
    S1 & S2 --> |2-of-3 Sign| USDC

    style Privy fill:#10b981,color:#fff
```

### Notification Service Channels

| Channel | Primary Use | Fallback |
|---|---|---|
| WhatsApp | Claim notifications | SMS |
| SMS | OTP codes | — |
| Push | App users | SMS |

**Templates:**

| Template ID | Example |
|---|---|
| `TRANSFER_RECEIVED` | "You received $100 from Mom" |
| `CLAIM_REMINDER` | "Don't forget to claim your $100" |
| `CASHOUT_COMPLETE` | "₱5,580 sent to your GCash" |

### Service Communication Patterns

| Pattern | Use Case | Implementation |
|---|---|---|
| Sync Query | Get user balance | gRPC with protobuf |
| Sync Command | Validate phone | REST with circuit breaker |
| Async Event | Transfer created | Kafka topic |
| Async Command | Send notification | Kafka with reply topic |
| Saga | Transfer + Claim + Offramp | Choreography via events |

---

## Design Patterns

> **Source:** previously docs/NFR.md § "Design Patterns" (merged here on 2026-05-21).

### 1. CQRS (Command Query Responsibility Segregation)

Separate read and write models for optimal performance:

```mermaid
flowchart TB
    Client[Client]

    subgraph Commands["COMMANDS (Writes)"]
        CH[Command Handler]
        WDB[(PostgreSQL<br/>Write DB)]
    end

    subgraph Queries["QUERIES (Reads)"]
        QH[Query Handler]
        RDB[(MongoDB<br/>Read DB)]
    end

    Client --> CH & QH
    CH --> WDB
    WDB -->|Events| RDB
    QH --> RDB

    style Commands fill:#ef4444,color:#fff
    style Queries fill:#10b981,color:#fff
```

**Benefits:** Optimized read models (denormalized for queries), independent scaling of read/write workloads, event-sourcing ready.

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

// Read Model (MongoDB - denormalized)
interface TransferReadModel {
  _id: string;
  sender: { id: string; name: string; phone: string };
  recipient: { phone: string; phoneMasked: string };
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

### 2. Event Sourcing (Ledger Service)

Store all changes as immutable events. Current state = Replay(all events for stream).

```mermaid
flowchart LR
    subgraph EventStore["EVENT STORE"]
        direction TB
        ES1["wallet_1 | v1 | WalletCreated | {user: abc}"]
        ES2["wallet_1 | v2 | BalanceCredited | {amount: 100}"]
        ES3["wallet_1 | v3 | BalanceDebited | {amount: 50}"]
        ES4["wallet_1 | v4 | BalanceCredited | {amount: 30}"]
    end

    EventStore --> Balance["Balance = 0 + 100 - 50 + 30 = $80"]
    style EventStore fill:#10b981,color:#fff
```

**Use cases:** ledger-service audit trail, regulator-grade immutable records, replay-to-any-point-in-time debugging.

### 3. Saga Pattern (Choreography)

Manage distributed transactions across services via event-driven choreography:

```mermaid
sequenceDiagram
    participant T as Transfer Service
    participant W as Wallet Service
    participant C as Claim Service
    participant N as Notify Service

    Note over T,N: Happy Path
    T->>W: TransferInitiated
    W->>C: BalanceDebited
    C->>N: ClaimCreated
    N-->>T: NotificationSent

    Note over T,N: Compensation (if ClaimCreation fails)
    C--xN: ClaimFailed
    N-->>W: ClaimFailed
    W->>T: BalanceRefunded
    T->>T: Mark FAILED
```

### 4. Circuit Breaker Pattern

Prevent cascade failures when external services fail:

```mermaid
stateDiagram-v2
    [*] --> CLOSED
    CLOSED --> OPEN: failures > threshold
    OPEN --> HALF_OPEN: timeout elapsed
    HALF_OPEN --> CLOSED: success
    HALF_OPEN --> OPEN: failure

    CLOSED: Normal traffic
    OPEN: Fail fast
    HALF_OPEN: Test single request
```

**Configuration:**
- Failure threshold: 5 failures in 30 seconds
- Open duration: 30 seconds
- Half-open max requests: 3

```typescript
const circuitBreaker = new CircuitBreaker({
  name: 'transfi-offramp',
  failureRateThreshold: 50,
  waitDurationInOpenState: 30000,
  permittedNumberOfCallsInHalfOpenState: 3,
  slidingWindowSize: 10,
  slowCallDurationThreshold: 5000,
  slowCallRateThreshold: 80,
});

const result = await circuitBreaker.execute(async () => {
  return await transfiClient.createPayout(payoutRequest);
});
```

### 5. Outbox Pattern

Atomically update DB AND publish event by writing to an outbox table in the same transaction; a background publisher drains it:

```mermaid
flowchart TB
    subgraph Transaction["SINGLE TRANSACTION"]
        I1[INSERT INTO transfers]
        I2[INSERT INTO outbox]
        C[COMMIT]
        I1 --> I2 --> C
    end

    subgraph Publisher["OUTBOX PUBLISHER (Background)"]
        S1[SELECT unpublished]
        S2[Publish to Kafka]
        S3[UPDATE published=true]
        S1 --> S2 --> S3
    end

    Transaction --> Publisher

    style Transaction fill:#10b981,color:#fff
    style Publisher fill:#3b82f6,color:#fff
```

**Anti-pattern (dual-write):** Update DB, then publish to Kafka — can fail between the two, leaving inconsistent state.

### 6. Istio Service Mesh

Single entry point with service mesh capabilities. Chosen over Kong/Traefik because Istio has native mTLS, traffic management, observability (Kiali/Jaeger/Prometheus), and K8s-native CRDs (VirtualService, DestinationRule).

```mermaid
flowchart TB
    subgraph Gateway["🚪 ISTIO SERVICE MESH"]
        subgraph Ingress["Istio Ingress Gateway"]
            TLS[1. TLS Termination]
            RL[2. Rate Limiting]
            Auth[3. JWT Authentication]
        end

        subgraph Mesh["Envoy Sidecars"]
            mTLS[4. mTLS Between Services]
            Route[5. Virtual Service Routing]
            CB[6. Circuit Breaker]
            Retry[7. Retries & Timeouts]
        end

        subgraph Observe["Observability"]
            Kiali[Kiali - Service Graph]
            Jaeger[Jaeger - Distributed Tracing]
            Prom[Prometheus - Metrics]
        end

        TLS --> RL --> Auth --> mTLS --> Route --> CB --> Retry
    end

    style Gateway fill:#003459,color:#fff
    style Mesh fill:#466bb0,color:#fff
```

**Why Istio over Kong/Traefik:**

| Feature | Kong/Traefik | Istio |
|---|---|---|
| Service mesh | Separate add-on | Native |
| mTLS | Plugin-based | Built-in, automatic |
| Traffic mgmt | Basic routing | Canary, mirror, fault injection |
| Observability | Requires plugins | Kiali / Jaeger / Prometheus built-in |
| Cost | Enterprise features paid | Fully open source |
| K8s integration | External resources | Native CRDs |

**Example VirtualService:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: transfer-service
spec:
  hosts:
    - transfer-service
  http:
    - match:
        - uri:
            prefix: /transfers
      route:
        - destination:
            host: transfer-service
            port:
              number: 8080
```

---

## Data Layer

> **Source:** previously docs/DATABASE.md (merged here on 2026-05-21).
> **Source:** previously docs/NFR.md § "Data Architecture" (merged here on 2026-05-21).

### CAP Theorem Selection

```mermaid
flowchart TB
    subgraph CAP["CAP THEOREM"]
        C[CONSISTENCY]
        A[AVAILABILITY]
        P[PARTITION TOLERANCE]
    end

    subgraph Choice["Network partitions WILL happen"]
        CP["CP: Consistency + Partition<br/>(reject writes during partition)"]
        AP["AP: Availability + Partition<br/>(accept writes, resolve later)"]
    end

    style CP fill:#3b82f6,color:#fff
    style AP fill:#10b981,color:#fff
```

| Service | Database | CAP | Rationale |
|---|---|---|---|
| `ledger-service` | PostgreSQL | CP | Financial data MUST be consistent, ACID required |
| `transfer-service` | PostgreSQL | CP | Transaction integrity critical |
| `kyc-service` | PostgreSQL | CP | Compliance data, audit requirements |
| `user-service` | MongoDB | AP | Profile reads > writes, eventual consistency OK |
| `wallet-service` | MongoDB | AP | Balance derived from events, fast reads |
| `claim-service` | MongoDB | AP | High read volume for claim lookups |
| `notify-service` | MongoDB | AP | Best-effort delivery, retries handle failures |
| `auth-service` | Redis | AP | Session data, TTL-based, fast |
| `fx-service` | Redis | AP | Cache, rates update frequently |

### PostgreSQL — Entity Relationships

```mermaid
erDiagram
    TRANSFERS ||--o{ LEDGER_ENTRIES : has
    TRANSFERS ||--o| OFFRAMPS : triggers
    TRANSFERS }o--|| USERS : sender
    OFFRAMPS }o--|| CASHOUT_METHODS : uses
    KYC_RECORDS }o--|| USERS : belongs_to

    TRANSFERS {
        uuid id PK
        uuid sender_id FK
        string recipient_phone
        decimal amount
        string currency
        string status
        string claim_code UK
        timestamp created_at
        int version
    }

    LEDGER_ENTRIES {
        uuid id PK
        uuid transaction_id FK
        uuid account_id
        string entry_type
        decimal amount
        string currency
        decimal balance_after
        timestamp created_at
    }

    OFFRAMPS {
        uuid id PK
        uuid transfer_id FK
        string method
        string provider
        string status
        json provider_response
        timestamp completed_at
    }

    KYC_RECORDS {
        uuid id PK
        uuid user_id FK
        string status
        int tier
        string provider_id
        json verification_data
        timestamp verified_at
    }

    OUTBOX {
        uuid id PK
        string topic
        json payload
        boolean published
        timestamp created_at
    }

    CASHOUT_METHODS {
        uuid id PK
        string country
        string provider
        string method_type
        boolean is_active
        json config
    }
```

#### `transfers` table

```sql
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_phone_hash VARCHAR(64) NOT NULL,

    -- Amount
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    local_amount DECIMAL(20, 8),
    local_currency VARCHAR(3),
    fx_rate DECIMAL(20, 8),

    -- Fees
    platform_fee DECIMAL(20, 8) NOT NULL DEFAULT 0,
    network_fee DECIMAL(20, 8) NOT NULL DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Claim
    claim_code VARCHAR(16) NOT NULL,
    claim_url TEXT NOT NULL,

    -- Blockchain
    tx_hash VARCHAR(128),
    chain VARCHAR(20) DEFAULT 'solana',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'confirmed', 'claimed', 'processing',
        'completed', 'cancelled', 'expired', 'failed'
    )),
    CONSTRAINT valid_currency CHECK (currency IN ('USD', 'USDC', 'USDT')),
    CONSTRAINT unique_claim_code UNIQUE (claim_code)
);

CREATE INDEX idx_transfers_sender ON transfers(sender_id);
CREATE INDEX idx_transfers_recipient ON transfers(recipient_phone_hash);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_sender_created ON transfers(sender_id, created_at DESC);
CREATE INDEX idx_transfers_expires ON transfers(expires_at) WHERE status IN ('pending', 'confirmed');
```

#### `ledger_entries` table — Double-entry accounting

```sql
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    account_id UUID NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    entry_type VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    balance_before DECIMAL(20, 8) NOT NULL,
    balance_after DECIMAL(20, 8) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_account_type CHECK (account_type IN (
        'user_wallet', 'platform_fee', 'network_fee', 'offramp_reserve'
    )),
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
        'deposit', 'transfer', 'claim', 'offramp', 'refund', 'fee'
    ))
);

-- Ensure double-entry balance via trigger
CREATE OR REPLACE FUNCTION check_double_entry_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END), 0)
        FROM ledger_entries
        WHERE transaction_id = NEW.transaction_id
    ) != 0 THEN
        RAISE EXCEPTION 'Double-entry balance violation for transaction %', NEW.transaction_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### `offramps`, `kyc_records`, `outbox` tables

```sql
CREATE TABLE offramps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES transfers(id),
    method VARCHAR(20) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    recipient_account VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(100),
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider_reference VARCHAR(100),
    provider_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT valid_method CHECK (method IN ('gcash', 'maya', 'bank', 'mpesa', 'paytm')),
    CONSTRAINT valid_offramp_status CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
    ))
);

CREATE TABLE kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    tier INTEGER NOT NULL DEFAULT 0,
    provider VARCHAR(50) NOT NULL DEFAULT 'persona',
    provider_inquiry_id VARCHAR(100),
    full_name VARCHAR(200),
    date_of_birth DATE,
    nationality VARCHAR(3),
    document_type VARCHAR(50),
    document_number_hash VARCHAR(64),
    verification_result JSONB,
    rejection_reasons TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    CONSTRAINT valid_kyc_status CHECK (status IN (
        'pending', 'submitted', 'reviewing', 'verified', 'rejected', 'expired'
    )),
    CONSTRAINT valid_tier CHECK (tier BETWEEN 0 AND 3)
);

CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    correlation_id VARCHAR(100),
    causation_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_unpublished ON outbox(created_at) WHERE published = FALSE;
```

### MongoDB Collections

#### `users` collection

```javascript
{
  _id: ObjectId("..."),
  phoneHash: "sha256...",           // Indexed, unique
  phone: "+639171234567",           // Encrypted
  email: "user@example.com",        // Optional, sparse index

  profile: {
    name: "John Doe",
    displayName: "John",
    avatar: "https://cdn.ping.cash/avatars/...",
    language: "en",
    timezone: "Asia/Manila"
  },

  kyc: {
    status: "verified",
    tier: 2,
    verifiedAt: ISODate("..."),
    expiresAt: ISODate("...")
  },

  wallet: {
    address: "7xKp2mN9qL4rYz...",
    chain: "solana",
    privyUserId: "did:privy:..."
  },

  limits: {
    dailySend: 500,
    monthlySend: 5000,
    dailyRemaining: 350,
    monthlyRemaining: 4500,
    resetDaily: ISODate("..."),
    resetMonthly: ISODate("...")
  },

  stats: { totalSent: 1500, totalReceived: 200, transferCount: 15 },
  contacts: [ /* { name, phone, phoneHash, isRegistered, lastTransferAt } */ ],
  settings: { notifications: {...}, privacy: {...} },

  createdAt: ISODate("..."),
  updatedAt: ISODate("..."),
  lastActiveAt: ISODate("...")
}

db.users.createIndex({ phoneHash: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { sparse: true });
db.users.createIndex({ "wallet.address": 1 });
db.users.createIndex({ "contacts.phoneHash": 1 });
```

#### `claims` collection

```javascript
{
  _id: ObjectId("..."),
  transferId: "txn_abc123",         // PostgreSQL transfer ID
  code: "x7Kp2mN9qL4r",            // 12-char unique code
  url: "https://ping.cash/c/x7Kp2mN9qL4r",
  sender: { id, name, phone /* masked */ },
  recipientPhone: "+639181234567",
  recipientPhoneHash: "sha256...",
  amount: { value: 100, currency: "USD", localValue: 5580, localCurrency: "PHP", fxRate: 55.80 },
  status: "pending",                // pending, verified, claimed, expired, cancelled
  verification: { attempts: 0, maxAttempts: 5, lockedUntil: null },
  cashout: { method: null, account: null, selectedAt: null },
  createdAt: ISODate("..."),
  expiresAt: ISODate("...")
}

db.claims.createIndex({ code: 1 }, { unique: true });
db.claims.createIndex({ transferId: 1 });
db.claims.createIndex({ recipientPhoneHash: 1 });
db.claims.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL
```

#### `notifications` collection

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  phone: "+639181234567",
  phoneHash: "sha256...",
  entityType: "transfer",
  entityId: "txn_abc123",
  channel: "whatsapp",              // whatsapp, sms, push, email
  template: "TRANSFER_RECEIVED",
  templateParams: { senderName: "John", amount: "$100", claimUrl: "..." },
  content: { body: "..." },
  status: "delivered",              // pending, sent, delivered, failed, read
  provider: "twilio",
  retryCount: 0,
  maxRetries: 3,
  createdAt: ISODate("..."),
  sentAt: ISODate("..."),
  deliveredAt: ISODate("...")
}
```

### Redis Data Structures

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `session:{session_id}` | Hash | 24h | Active sessions |
| `otp:{phone_hash}` | Hash | 10m | OTP codes + attempts |
| `ratelimit:{user_id}:{endpoint}` | Sorted Set | 1h | Rate limiting via sliding window |
| `fx:rates:USD` | Hash | 60s | FX rates cache |
| `claim:{code}` | String (JSON) | 7d | Fast claim code validation |
| `balance:{user_id}` | String | 5m | User balance cache (invalidated on wallet event) |

### Backup & Recovery

| Database | Type | Frequency | Retention | Method |
|---|---|---|---|---|
| PostgreSQL | Full backup | Daily | 30 days | `pg_dump` |
| PostgreSQL | WAL archiving | Continuous | 7 days | `pg_basebackup` |
| MongoDB | Full backup | Daily | 30 days | `mongodump` |
| MongoDB | Oplog backup | Continuous | 7 days | Oplog tailing |
| Redis | RDB snapshot | Hourly | 24 hours | `BGSAVE` |
| Redis | AOF | Continuous | 24 hours | `appendonly` |

---

## User Journeys

> **Source:** previously docs/FLOWS.md (merged here on 2026-05-21).

### Flow 1: User Registration

```mermaid
sequenceDiagram
    autonumber
    participant M as Mobile App
    participant A as auth-service
    participant T as Twilio
    participant P as Privy
    participant R as Redis

    M->>A: Enter phone number
    A->>T: Send OTP
    T-->>M: SMS received
    M->>A: Enter OTP code
    A->>T: Verify OTP
    T-->>A: Valid
    A->>P: Create user wallet
    P-->>A: Wallet address
    A->>R: Store session
    A-->>M: JWT + user data
```

### Flow 2: Send Money

```mermaid
sequenceDiagram
    autonumber
    participant M as Mobile App
    participant T as transfer-service
    participant W as wallet-service
    participant S as Solana
    participant N as notify-service
    participant WA as WhatsApp

    M->>T: Create transfer {recipient, amount}
    T->>W: Check balance
    W-->>T: Balance OK
    T->>W: Sign & send USDC
    W->>S: Transfer USDC
    S-->>W: Tx hash
    W-->>T: Confirmed
    T->>N: Send notification
    N->>WA: Claim link message
    WA-->>N: Delivered
    T-->>M: Success + claim link
```

### Flow 3: Claim via Web (no app required)

```mermaid
sequenceDiagram
    autonumber
    participant B as Web Browser
    participant C as claim-service
    participant T as Twilio
    participant O as offramp-service
    participant TF as TransFi
    participant G as GCash

    B->>C: Open claim link
    C-->>B: Show amount & sender
    B->>C: Request OTP
    C->>T: Send OTP
    T-->>B: SMS received
    B->>C: Submit OTP
    C->>T: Verify
    T-->>C: Valid
    C-->>B: Show cash-out options
    B->>C: Select GCash
    C->>O: Execute off-ramp
    O->>TF: POST /payout
    TF->>G: Send PHP
    G-->>TF: Success
    TF-->>O: Webhook
    O-->>C: Complete
    C-->>B: Success! ₱5,580 received
```

### Flow 4: In-Network Transfer (FREE)

Both sender and recipient have Ping app — zero fees, just Solana network fee (~$0.001).

```mermaid
sequenceDiagram
    autonumber
    participant S as Sender (Dubai)
    participant SApp as Sender App
    participant SW as Sender Wallet
    participant RW as Recipient Wallet
    participant RApp as Recipient App
    participant R as Recipient (Philippines)

    Note over S,R: BOTH USERS ON PING — FREE TRANSFER
    S->>SApp: Open app, select recipient
    SApp->>SApp: Detect: Recipient on Ping
    SApp->>S: FREE transfer
    S->>SApp: Enter amount: $200
    SApp->>SW: Deduct 200 USDC
    SW->>RW: Transfer 200 USDC (Solana)
    Note right of SW: Fee: $0.001 (network only)
    RW->>RApp: Update balance
    RApp->>R: Push notification
    Note over S,R: Transfer fee: $0 (FREE)
```

### Recipient Claim State Machine

```mermaid
stateDiagram-v2
    [*] --> LinkReceived: WhatsApp/SMS notification
    LinkReceived --> ClickLink: Recipient clicks link
    ClickLink --> WebPage: Opens in browser
    WebPage --> EnterOTP: Prompted for OTP
    EnterOTP --> VerifyOTP: Enter 6-digit code
    VerifyOTP --> OTPFailed: Invalid
    OTPFailed --> EnterOTP: Try again
    VerifyOTP --> SelectMethod: Valid
    SelectMethod --> GCash
    SelectMethod --> Maya
    SelectMethod --> Bank
    SelectMethod --> CashPickup
    SelectMethod --> DownloadApp: Get Ping app for FREE transfers
    GCash --> EnterDetails
    Maya --> EnterDetails
    Bank --> EnterDetails
    CashPickup --> EnterDetails
    EnterDetails --> Confirm: Review and Confirm
    Confirm --> Processing
    Processing --> Success: Money sent!
    Success --> [*]
```

---

## Route Selection Logic

```mermaid
flowchart TD
    Start([Sender initiates transfer]) --> CheckRecipient{Recipient on Ping?}

    CheckRecipient -->|Yes| FreeTransfer[FREE In-Network<br/>USDC to USDC]

    CheckRecipient -->|No| CheckCountry{Which country?}

    CheckCountry -->|Philippines| CheckPHPC{PHPC available?}
    CheckCountry -->|Kenya| KotaniPay[Kotani Pay<br/>to M-Pesa<br/>0.75%]
    CheckCountry -->|Mexico| Bitso[Bitso<br/>to SPEI<br/>0.5%]
    CheckCountry -->|India| TransFiIndia[TransFi<br/>to UPI<br/>1%]
    CheckCountry -->|Other| TransFiOther[TransFi<br/>to Local<br/>1%]

    CheckPHPC -->|Yes| CheckCoins{Has Coins.ph?}
    CheckPHPC -->|No| TransFiPH[TransFi<br/>to GCash<br/>1%]

    CheckCoins -->|Yes| PHPCDirect[PHPC Direct<br/>to Coins.ph<br/>0.1%]
    CheckCoins -->|No| ClaimLink[Claim Link via TransFi<br/>1%]

    style FreeTransfer fill:#00ff00,color:#000
    style PHPCDirect fill:#90EE90,color:#000
    style Bitso fill:#ffff00,color:#000
    style KotaniPay fill:#ffff00,color:#000
    style TransFiIndia fill:#ffcc00,color:#000
    style TransFiOther fill:#ffcc00,color:#000
    style TransFiPH fill:#ffcc00,color:#000
```

### Fee Comparison

| Route | Fee | Speed | Recipient Need |
|---|---|---|---|
| In-Network (USDC→USDC) | **FREE** | Instant | Ping app |
| PHPC Direct (PH) | 0.1% | Instant | Coins.ph account |
| USDC → Coins.ph | 0.5% | Instant | Coins.ph account |
| Claim link → TransFi → GCash | 1% | Instant | Just a phone |

---

## API Reference

> **Source:** previously docs/API.md (merged here on 2026-05-21).

Ping API follows REST conventions with JSON payloads. All endpoints are versioned (`/v1/`) and require JWT auth unless marked Public.

### Base URLs

| Environment | URL |
|---|---|
| Production | `https://api.ping.cash/v1` |
| Staging | `https://api.staging.ping.cash/v1` |
| Development | `http://localhost:3000/v1` |

### Authentication

All authenticated endpoints require a Bearer token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

```typescript
interface JWTPayload {
  sub: string;     // User ID
  phone: string;   // Phone number (hashed)
  tier: number;    // KYC tier (0-3)
  iat: number;
  exp: number;     // 15 min TTL on access tokens
  jti: string;
}
```

Refresh:

```http
POST /auth/refresh
Authorization: Bearer {refresh_token}
```

### Error Format

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Your balance is insufficient for this transfer",
    "details": { "required": "100.00", "available": "50.00" },
    "requestId": "req_abc123"
  }
}
```

| Code | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `INSUFFICIENT_BALANCE` | 400 | Not enough funds |
| `KYC_REQUIRED` | 403 | Higher KYC tier needed |
| `TRANSFER_LIMIT_EXCEEDED` | 400 | Daily/monthly limit reached |
| `CLAIM_EXPIRED` | 400 | Claim link has expired |
| `CLAIM_ALREADY_USED` | 400 | Claim already processed |
| `INTERNAL_ERROR` | 500 | Server error |

### Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| `POST /auth/init` | 5 | 10 min |
| `POST /auth/verify` | 10 | 10 min |
| `POST /transfers` | 20 | 1 hour |
| `POST /claims/:code/verify` | 5 | 10 min |
| General | 100 | 1 min |

Response includes:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642000000
```

### Endpoint Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/init` | Public | Start phone verification |
| POST | `/auth/verify` | Public | Verify OTP, get JWT |
| POST | `/auth/refresh` | Refresh JWT | Refresh access token |
| POST | `/auth/logout` | Required | Invalidate session |
| GET | `/users/me` | Required | Get current user |
| PATCH | `/users/me` | Required | Update profile |
| GET | `/users/me/contacts` | Required | List contacts |
| POST | `/users/me/contacts/sync` | Required | Sync phone contacts |
| POST | `/transfers` | Required | Create new transfer |
| GET | `/transfers` | Required | List user's transfers |
| GET | `/transfers/:id` | Required | Get transfer details |
| POST | `/transfers/:id/cancel` | Required | Cancel pending transfer |
| GET | `/claims/:code` | Public | Get claim details |
| POST | `/claims/:code/otp` | Public | Request OTP for claim |
| POST | `/claims/:code/verify` | Public | Verify claim ownership |
| POST | `/claims/:code/cashout` | Public + verify token | Execute cash-out |
| GET | `/claims/:code/status` | Public | Poll cash-out status |
| GET | `/wallet/balance` | Required | Get USDC balance |
| GET | `/wallet/address` | Required | Get deposit address |
| GET | `/wallet/transactions` | Required | Transaction history |
| GET | `/fx/rates` | Public | Exchange rates |
| POST | `/fx/quote` | Required | FX quote with fees |

### Key Request/Response Examples

#### POST /auth/verify

**Request:**
```json
{ "sessionId": "sess_abc123", "code": "123456" }
```

**Response 200:**
```json
{
  "user": {
    "id": "usr_xyz789",
    "phone": "+63 *** *** 4567",
    "kyc": { "status": "none", "tier": 0 },
    "wallet": { "address": "7xKp2mN9qL4rYz...", "chain": "solana" }
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900
  },
  "isNewUser": true
}
```

#### POST /transfers

**Request:**
```json
{
  "recipientPhone": "+639181234567",
  "amount": "100.00",
  "currency": "USD",
  "note": "For groceries"
}
```

**Response 201:**
```json
{
  "id": "txn_abc123",
  "status": "pending",
  "amount": { "value": "100.00", "currency": "USD", "localValue": "5580.00", "localCurrency": "PHP", "fxRate": "55.80" },
  "fees": { "platform": "0.50", "network": "0.01", "total": "0.51" },
  "claim": {
    "code": "x7Kp2mN9qL4r",
    "url": "https://ping.cash/c/x7Kp2mN9qL4r",
    "expiresAt": "2025-01-22T10:00:00Z"
  }
}
```

#### POST /claims/:code/cashout

**Request:**
```json
{
  "method": "gcash",
  "account": "09171234567",
  "accountName": "Maria Santos"
}
```

**Response 200:**
```json
{
  "status": "processing",
  "offramp": {
    "id": "off_abc123",
    "method": "gcash",
    "account": "0917 *** 4567",
    "amount": { "value": "5580.00", "currency": "PHP" },
    "estimatedTime": "Instant",
    "reference": "PING-ABC123"
  }
}
```

### Webhooks

Verify with HMAC-SHA256 of the body using shared secret, via `X-Ping-Signature` header.

| Event | Description |
|---|---|
| `transfer.created` | Transfer initiated |
| `transfer.confirmed` | Blockchain confirmed |
| `transfer.claimed` | Recipient verified |
| `transfer.completed` | Cash-out complete |
| `transfer.failed` | Transfer failed |
| `transfer.expired` | Claim expired |
| `kyc.submitted` | KYC submitted |
| `kyc.verified` | KYC approved |
| `kyc.rejected` | KYC rejected |

### API Versioning

URL-path versioned (`/v1/`, `/v2/`). When breaking changes ship:
1. New version released
2. Previous version remains for 12 months
3. Deprecation notices via email + dashboard
4. Old version retired after migration window

---

## Cash-In / Cash-Out Integration

> **Source:** previously docs/CASHFLOW.md § integration sections (merged here on 2026-05-21).

User-facing fee tables, country lists, and provider catalog live in [BUSINESS-STRATEGY.md](BUSINESS-STRATEGY.md). This section documents the **integration architecture** — provider selection, failover, and webhook flow.

### Cash-In Flow

```mermaid
flowchart LR
    subgraph Instant["Instant"]
        AP[Apple Pay]
        GP[Google Pay]
        Card[Debit/Credit Card]
    end

    subgraph SameDay["Same Day"]
        Bank[Bank Transfer]
        FPX[FPX/iDEAL/Local Rails]
    end

    subgraph Crypto["Crypto Native"]
        USDC[USDC Direct]
        CEX[Exchange Withdrawal]
    end

    Instant --> Wallet[(Ping Wallet<br/>USDC on Solana)]
    SameDay --> Wallet
    Crypto --> Wallet
```

### Off-Ramp Provider Failover

```mermaid
flowchart TB
    Start[Cash-out Request] --> TF{TransFi<br/>Available?}
    TF -->|Yes| TransFi[Use TransFi]
    TF -->|No| Backup{Route to<br/>Backup}
    Backup -->|EU/UK/US| Wise[Use Wise]
    Backup -->|Africa| Flutter[Use Flutterwave]
    Backup -->|Cash Pickup| Thunes[Use Thunes]

    TransFi --> Complete[Complete]
    Wise --> Complete
    Flutter --> Complete
    Thunes --> Complete
```

### Provider Catalog

| Provider | Coverage | Use Case |
|---|---|---|
| **TransFi** (primary) | 70+ countries | Mobile wallets + bank transfers in EM markets |
| **Wise Business API** | EU, UK, US | Developed markets, large transfers |
| **Flutterwave** | Africa | Nigeria, Ghana backup |
| **Yellow Card** | Africa | Crypto-native African rails |
| **Thunes** | Global | Cash pickup network |

### Off-Ramp Sequence (TransFi → GCash)

```mermaid
sequenceDiagram
    participant W as Web Claim
    participant O as offramp-service
    participant T as TransFi
    participant G as GCash

    W->>O: POST /offramp/quote
    O->>T: GET /quote
    T-->>O: {rate, fees, eta}
    O-->>W: {quote}

    W->>O: POST /offramp/execute
    O->>T: POST /payout
    T->>G: Send PHP
    G-->>T: Success
    T-->>O: Webhook: completed
    O-->>W: {status: completed}
```

---

## Caching Strategy

> **Source:** previously docs/NFR.md § "Caching Strategy" (merged here on 2026-05-21).

### Multi-Layer Architecture

```mermaid
flowchart TB
    L1["Layer 1: CDN (Cloudflare) — static assets, API responses, TTL 1h-1y"]
    L2["Layer 2: Istio Gateway — frequently-accessed endpoints, Envoy cache 60s"]
    L3["Layer 3: Application (Redis) — sessions, OTP, profiles, balances"]
    L4["Layer 4: Database Query Cache — PG prepared statements, Mongo working set"]
    L1 --> L2 --> L3 --> L4
```

| Pattern | Use Case | Implementation |
|---|---|---|
| Cache-Aside | User profiles | Read cache → fallback to DB → populate cache |
| Write-Through | Session data | Write cache + DB simultaneously |
| Write-Behind | Analytics | Write cache, async persist to DB |
| Refresh-Ahead | FX rates | Proactively refresh before expiry |

### Event-Driven Cache Invalidation

```typescript
@EventHandler('user.updated')
async handleUserUpdated(event: UserUpdatedEvent) {
  await redis.del(`user:${event.userId}`);
  await redis.del(`user:phone:${event.phoneHash}`);
  await kafka.publish('cache.invalidation', {
    keys: [`/api/users/${event.userId}`],
    tags: ['user-profile'],
  });
}
```

---

## Event-Driven Architecture

> **Source:** previously docs/NFR.md § "Event-Driven Architecture" (merged here on 2026-05-21).

We use **Redpanda** (Kafka-compatible, simpler operations) for event streaming.

### Topics

```mermaid
flowchart TB
    subgraph Topics["REDPANDA TOPICS"]
        T1[transfer.events]
        T2[wallet.events]
        T3[claim.events]
        T4[offramp.events]
        T5[notify.commands]
        T6[audit.events]
    end
```

### Event Envelope (CloudEvents)

```typescript
interface CloudEvent<T> {
  specversion: "1.0";
  type: string;            // e.g., "com.ping.transfer.created"
  source: string;          // e.g., "/services/transfer"
  id: string;              // UUID
  time: string;            // ISO 8601
  datacontenttype: "application/json";
  data: T;
  correlationid: string;   // For distributed tracing
  causationid: string;     // Event that caused this event
}
```

### Example Event

```json
{
  "specversion": "1.0",
  "type": "com.ping.transfer.created",
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

### Partitioning

Partition key: `sender_id`. Guarantees all events for the same sender are processed in order across consumer groups.

```mermaid
flowchart TB
    subgraph Topic["transfer.events (6 partitions)"]
        P0[P0]
        P1[P1]
        P2[P2]
        P3[P3]
        P4[P4]
        P5[P5]
    end

    subgraph ClaimGroup["Consumer Group: claim-service"]
        CC1["Consumer 1<br/>P0, P1"]
        CC2["Consumer 2<br/>P2, P3"]
        CC3["Consumer 3<br/>P4, P5"]
    end

    P0 & P1 --> CC1
    P2 & P3 --> CC2
    P4 & P5 --> CC3
```

---

## Infrastructure (Kubernetes)

> **Source:** previously docs/NFR.md § "Kubernetes Infrastructure" + docs/ARCHITECTURE.md § "Infrastructure" (merged here on 2026-05-21).

Ping is a **product repo** that ships **Blueprints** (`bp-<name>:<semver>` OCI artifacts) onto the existing **OpenOva Sovereign** instance at [openova-io/openova-private](https://github.com/openova-io/openova-private). We do NOT operate our own Kubernetes cluster, our own Istio mesh, or our own observability stack — those are provided by the Sovereign. See [ADR 0006](adr/0006-deployment-via-openova-sovereign.md).

### Deployment Topology

```mermaid
flowchart LR
    subgraph Ping["ping-cash/ping-cash (THIS REPO)"]
        Src[Source code]
        CI[GitHub Actions CI]
        Img[ghcr.io/ping-cash/...:SHA]
        BP[Blueprint bp-ping:semver]
    end

    subgraph Priv["openova-io/openova-private (Sovereign)"]
        Flux[Flux GitOps]
        Cluster[K8s Cluster + Istio + Observability]
    end

    Src -->|push| CI
    CI -->|matrix build| Img
    CI -->|publish| BP
    BP -->|version bump PR| Priv
    Flux -->|reconcile| Cluster

    style Ping fill:#10b981,color:#fff
    style Priv fill:#003459,color:#fff
```

The Sovereign provides:
- Kubernetes cluster (vCluster-isolated per tenant)
- Istio service mesh with automatic mTLS
- PostgreSQL (CNPG operator), MongoDB (replica set), Redis (Sentinel), Redpanda (3 brokers)
- Observability: Prometheus + Grafana + Loki + Tempo + Kiali
- Secrets management: OpenBao + External Secrets Operator
- Container registry: Harbor (proxy-cached ghcr.io)
- DNS + cert-manager + external-dns
- PowerDNS authoritative + DNSSEC + lua-records for geo-failover

Ping's responsibility is to:
1. Build container images in CI (one per service)
2. Publish a versioned Blueprint that declares: which images, which Helm charts to compose, what config values to surface to the Sovereign
3. Open a SHA-bump PR against `openova-io/openova-private` when a new Blueprint version ships

The Sovereign's Flux picks up the PR merge and deploys.

### What Ping Repo Owns vs Doesn't

| Concern | Owner |
|---|---|
| Application code (services, mobile app) | **Ping repo** |
| Service Helm charts (under `platform/<chart>/`) | **Ping repo** |
| Blueprint manifests (`bp-ping/blueprint.yaml`) | **Ping repo** |
| Container build (CI matrix per service) | **Ping repo** |
| Image registry (ghcr.io) | Shared (GitHub) |
| Kubernetes cluster lifecycle | OpenOva Sovereign |
| Istio mesh + observability | OpenOva Sovereign |
| DNS records (`*.ping.cash`) | OpenOva Sovereign (PowerDNS + Dynadot for apex) |
| Secrets (Privy, TransFi, Twilio, WhatsApp, Persona keys) | OpenBao on the Sovereign; ESO mounts |
| Backups, DR, multi-region failover | OpenOva Sovereign |

### CI/CD Pipeline

```yaml
# .github/workflows/build.yml (target shape)
on:
  push:
    branches: [main]
jobs:
  matrix-build:
    strategy:
      matrix:
        service: [auth, user, kyc, transfer, wallet, fx, ledger, claim, offramp, notify, mobile, web]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          tags: ghcr.io/ping-cash/${{ matrix.service }}:${{ github.sha }}
  bump-blueprint:
    needs: matrix-build
    steps:
      - run: ./scripts/bump-blueprint.sh ${{ github.sha }}
      - uses: peter-evans/create-pull-request@v6
        with:
          repository: openova-io/openova-private
          title: "bump(ping): SHA ${{ github.sha }}"
```

### Public-Repo Toggle for iOS Builds

GitHub Actions gives **unlimited minutes to public repos** but caps free private-repo minutes. Expo iOS builds with full simulator boot take ~20 min each. To unblock unlimited iOS CI:

1. Temporarily flip the repo public via `gh repo edit --visibility public`
2. Run the build batch
3. Flip back to private if desired

See [RUNBOOKS.md § iOS Build via Public Toggle](RUNBOOKS.md#ios-build-via-public-toggle).

### Helm Chart Structure (per `platform/<chart>/` in this repo)

```
platform/
├── auth/               # Helm chart for auth-service
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── DESIGN.md
│   └── templates/
├── user/
├── kyc/
├── transfer/
├── wallet/
├── fx/
├── ledger/
├── claim/
├── offramp/
└── notify/

products/
└── bp-ping/            # Blueprint that composes the above
    ├── blueprint.yaml
    └── README.md
```

Charts are minimal: Deployment + Service + ConfigMap + a Kustomization overlay. No StatefulSets — databases come from the Sovereign's platform layer. No Istio CRDs declared in our charts — they're materialized by the Sovereign's mesh config.

### Secrets Management

External Secrets Operator on the Sovereign reads from OpenBao. We declare what we need; the Sovereign provides the binding.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ping-api-secrets
spec:
  secretStoreRef:
    name: openbao-cluster        # provided by Sovereign
    kind: ClusterSecretStore
  target:
    name: ping-api-secrets
  data:
    - secretKey: PRIVY_APP_SECRET
      remoteRef: { key: ping/privy/app_secret }
    - secretKey: DATABASE_URL
      remoteRef: { key: ping/postgres/dsn }
    - secretKey: TWILIO_AUTH_TOKEN
      remoteRef: { key: ping/twilio/auth_token }
    - secretKey: TRANSFI_API_KEY
      remoteRef: { key: ping/transfi/api_key }
    - secretKey: WHATSAPP_ACCESS_TOKEN
      remoteRef: { key: ping/whatsapp/access_token }
    - secretKey: SOLANA_RPC_URL
      remoteRef: { key: ping/solana/rpc_url }
```

The Sovereign operator (founder) provisions these paths in OpenBao before the first deploy.

---

## UX Requirements

> **Source:** previously docs/NFR.md § "UX Requirements" (merged here on 2026-05-21).

### Design Philosophy

```mermaid
mindmap
  root((UX PRINCIPLES))
    Invisible Complexity
      User sees Send $100 to Mom
      We handle blockchain, FX, off-ramp
      Zero crypto jargon
    Progressive Disclosure
      Start simple
      Default options for 90%
      Advanced options hidden
    Instant Feedback
      Every action < 100ms
      Optimistic updates
      Skeleton screens not spinners
    Error Prevention
      Validate as typed
      Confirm large amounts
      5-second undo option
    Offline-First
      Works without network
      Queue actions offline
      Clear sync indicators
```

### Mobile App — Motion & Haptics

```typescript
const springConfig = { damping: 15, stiffness: 150, mass: 1 };

const buttonPress = {
  scale: withSpring(0.95, { damping: 10, stiffness: 400 }),
  opacity: withTiming(0.8, { duration: 100 }),
};
```

| Action | Haptic | Duration |
|---|---|---|
| Button press | Light | 10ms |
| Toggle switch | Medium | 15ms |
| Amount confirm | Heavy | 25ms |
| Transfer success | Success | — |
| Error | Error | — |

### Loading State Strategy

| Latency | Indicator |
|---|---|
| < 100ms | None (imperceptible) |
| 100ms – 1s | Skeleton screen (pulsing placeholder) |
| 1s – 5s | Skeleton + progress bar |
| > 5s | Full progress + cancel button |

### Web Claim — Responsive Design

```css
--mobile: 320px;
--tablet: 768px;
--desktop: 1024px;

--min-touch-target: 44px;  /* Apple HIG */
--comfortable-touch: 56px;

--text-base: 16px;   /* Minimum for mobile forms */
--text-3xl: 48px;    /* Hero amounts */
```

### Accessibility (WCAG 2.2 AA)

| Requirement | Implementation |
|---|---|
| Color contrast | 4.5:1 minimum for text |
| Touch targets | 44x44px minimum |
| Screen reader | Full VoiceOver/TalkBack support |
| Reduce motion | Respect system preference |
| Text scaling | Support up to 200% |

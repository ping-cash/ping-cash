# Phase 1 Technical Architecture

## Overview

This document describes the technical architecture for Ping Phase 1 MVP, covering:
- System components and their interactions
- Data flows for key user journeys
- Technology choices and rationale
- Security considerations
- Infrastructure requirements

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["📱 Clients"]
        Mobile["Mobile App<br/>(React Native)"]
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

    Istio --> Auth
    Istio --> Transfer
    Istio --> Claim
    Istio --> User
    Istio --> Wallet

    Auth --> Redis
    User --> Mongo
    Transfer --> PG
    Wallet --> Privy
    Wallet --> Solana
    Claim --> Mongo
    Offramp --> TransFi
    Notify --> WhatsApp
    Notify --> Twilio
    Compliance --> Persona

    style Gateway fill:#003459,color:#fff
    style Clients fill:#1e40af,color:#fff
    style Services fill:#10b981,color:#fff
    style Data fill:#7c3aed,color:#fff
    style External fill:#ea580c,color:#fff
```

## Component Details

### 1. Mobile App (React Native)

**Purpose**: Primary interface for senders to create and manage transfers.

**Key Features**:
- Phone number authentication via Privy
- Contact list access and sync
- Transfer creation and history
- Balance management
- Cash-in: Apple Pay, Google Pay, Card, Bank, USDC direct
- Cash-out: To sender's country or recipient's home country

**Tech Stack**:
| Component | Technology |
|-----------|------------|
| Framework | React Native 0.73+ |
| Build | Expo (managed workflow) |
| Auth | Privy React Native SDK |
| Navigation | React Navigation 6 |
| Data Fetching | TanStack Query |
| State | Zustand |

**Directory Structure**:
```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens
│   ├── (main)/            # Main app screens
│   │   ├── home.tsx
│   │   ├── send.tsx
│   │   ├── contacts.tsx
│   │   └── history.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/                # Design system
│   ├── transfer/          # Transfer components
│   └── wallet/            # Wallet components
├── hooks/
├── services/
│   ├── api.ts            # Backend API client
│   ├── privy.ts          # Privy integration
│   └── contacts.ts       # Contact sync
├── store/
└── utils/
```

### 2. Web Claim Flow (Next.js)

**Purpose**: Browser-based interface for recipients to claim transfers without downloading app.

**Key Features**:
- Claim link resolution
- Phone OTP verification
- Smart country detection (auto-detect from recipient phone)
- Off-ramp method selection (country-specific options)
- Cash-out processing (mobile wallets, bank, cash pickup)
- Receipt generation

**Cash-Out UX**:
- Auto-detect recipient's country from phone number
- Show relevant options first (GCash for PH, M-Pesa for KE, etc.)
- Allow switching to other countries if needed

**Tech Stack**:
| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | Shadcn/ui |
| Data | Server Actions |

**Directory Structure**:
```
web/
├── app/
│   ├── claim/
│   │   └── [code]/
│   │       ├── page.tsx          # Claim landing
│   │       ├── verify/page.tsx   # OTP verification
│   │       └── cashout/page.tsx  # Cash-out selection
│   └── api/                      # API routes (if needed)
├── components/
├── lib/
│   ├── api.ts
│   └── validation.ts
└── styles/
```

### 3. Backend Services (Node.js)

**Purpose**: Core business logic, data management, and external integrations.

**Tech Stack**:
| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Language | TypeScript |
| Framework | Fastify |
| ORM | Prisma |
| Queues | Bull |
| Validation | Zod |

---

## Service Breakdown

### Auth Service

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
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

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/init` | Start phone verification |
| POST | `/auth/verify` | Verify OTP, create session |
| POST | `/auth/refresh` | Refresh JWT token |
| POST | `/auth/logout` | Invalidate session |

### Transfer Service

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

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transfers` | Create new transfer |
| GET | `/transfers/:id` | Get transfer details |
| GET | `/transfers` | List user's transfers |
| POST | `/transfers/:id/cancel` | Cancel pending transfer |

### Claim Service

**Security Features**:
- Claim codes: 12-char alphanumeric (62^12 possibilities)
- Rate limited: 5 OTP attempts per claim
- Expires after 7 days or on completion

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/claims/:code` | Get claim details (public) |
| POST | `/claims/:code/verify` | Verify phone ownership |
| POST | `/claims/:code/cashout` | Initiate cash-out |

### Wallet Service

```mermaid
flowchart LR
    subgraph App["Mobile App"]
        U[User]
    end

    subgraph Backend["Wallet Service"]
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

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallet/balance` | Get USDC balance |
| GET | `/wallet/address` | Get deposit address |
| POST | `/wallet/send` | Send to another user |

### Notification Service

**Channels**:
| Channel | Primary Use | Fallback |
|---------|-------------|----------|
| WhatsApp | Claim notifications | SMS |
| SMS | OTP codes | - |
| Push | App users | SMS |

**Templates**:
| Template | Example |
|----------|---------|
| `TRANSFER_RECEIVED` | "You received $100 from Mom" |
| `CLAIM_REMINDER` | "Don't forget to claim your $100" |
| `CASHOUT_COMPLETE` | "₱5,580 sent to your GCash" |

### Off-ramp Service

```mermaid
sequenceDiagram
    participant W as Web Claim
    participant O as Off-ramp Service
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

**Supported Methods (Phase 1)**:

| Country | Methods |
|---------|---------|
| 🇵🇭 Philippines | GCash, Maya, Bank (BDO/BPI), Cash Pickup |
| 🇮🇳 India | UPI/IMPS, Bank (NEFT), Paytm |
| 🇵🇰 Pakistan | JazzCash, Easypaisa, Bank |
| 🇧🇩 Bangladesh | bKash, Nagad, Bank |
| 🇰🇪 Kenya | M-Pesa, Bank |

See [CASHFLOW.md](./CASHFLOW.md) for complete country coverage.

---

## Data Flows

### Flow 1: User Registration

```mermaid
sequenceDiagram
    autonumber
    participant M as Mobile App
    participant A as Auth Service
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
    participant T as Transfer Service
    participant W as Wallet Service
    participant S as Solana
    participant N as Notify Service
    participant WA as WhatsApp

    M->>T: Create transfer<br/>{recipient, amount}
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

### Flow 3: Claim Money (Web)

```mermaid
sequenceDiagram
    autonumber
    participant B as Web Browser
    participant C as Claim Service
    participant T as Twilio
    participant O as Off-ramp Service
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

---

## Security Architecture

### Authentication Flow

```mermaid
flowchart TB
    subgraph Phone["📱 Phone Verification"]
        P1[Rate limited: 3 attempts/10min]
        P2[Code expires: 10 minutes]
        P3[Twilio Verify]
    end

    subgraph JWT["🔐 JWT Tokens"]
        J1[Access token: 15min TTL]
        J2[Refresh token: 7 days TTL]
        J3[HS256 signed]
    end

    subgraph Session["💾 Session Management"]
        S1[Redis storage]
        S2[Invalidate on logout]
        S3[Device tracking]
    end

    Phone --> JWT --> Session
```

### Wallet Security (Privy MPC)

```mermaid
flowchart TB
    subgraph Shards["Key Shards"]
        D[Device Shard<br/>User's phone]
        P[Privy Shard<br/>Privy servers]
        R[Recovery Shard<br/>Encrypted backup]
    end

    subgraph Signing["Threshold Signing"]
        T[2-of-3<br/>Required]
    end

    subgraph Security["Security Guarantees"]
        S1[We never see private key]
        S2[User can recover with phone]
        S3[SOC 2 Type II certified]
    end

    D --> T
    P --> T
    R -.->|recovery only| T
    T --> Security

    style Signing fill:#10b981,color:#fff
```

### Claim Link Security

```mermaid
flowchart LR
    subgraph Generation["Code Generation"]
        G1[12 characters]
        G2[a-zA-Z0-9]
        G3["62^12 = 3.2×10^21"]
        G4[crypto.randomBytes]
    end

    subgraph Protection["Security Measures"]
        P1[Phone verification required]
        P2[5 OTP attempts max]
        P3[7-day expiration]
        P4[Single-use only]
        P5[10 claims/hour per IP]
    end

    Generation --> Protection
```

### Data Encryption

| Data Type | At Rest | In Transit |
|-----------|---------|------------|
| Phone numbers | Hashed (SHA256) for lookup, encrypted for display | TLS 1.3 |
| Wallet addresses | Plaintext (public data) | TLS 1.3 |
| KYC documents | AES-256 encrypted | TLS 1.3 |
| Session tokens | Redis (encrypted at rest) | TLS 1.3 |
| Database | PostgreSQL TDE | TLS 1.3 |

---

## Infrastructure

### Phase 1 Deployment (Kubernetes)

```mermaid
flowchart TB
    subgraph Internet["🌐 Internet"]
        Users[Users]
    end

    subgraph CDN["CDN"]
        CF[CloudFlare]
    end

    subgraph K8s["☸️ Kubernetes Cluster"]
        subgraph Ingress["Istio Service Mesh"]
            IG[Istio Gateway + Envoy Sidecars]
        end

        subgraph Services["Services"]
            API[API Pods<br/>2 replicas]
            Worker[Worker Pods<br/>1 replica]
        end

        subgraph Data["Managed Services"]
            PG[(PostgreSQL)]
            RD[(Redis)]
            MG[(MongoDB)]
        end
    end

    subgraph Storage["Object Storage"]
        S3[S3-compatible<br/>KYC docs]
    end

    Users --> CF --> IG
    IG --> API
    API --> Worker
    API --> PG & RD & MG
    Worker --> S3

    style K8s fill:#326ce5,color:#fff
```

### Resource Sizing (Phase 1)

| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| K8s Cluster (Civo) | 3 nodes × 2 vCPU, 4GB | ~$60 |
| PostgreSQL (Managed) | 1 vCPU, 2GB, 20GB | ~$30 |
| MongoDB (Atlas) | M10 Shared | ~$60 |
| Redis (Managed) | 256MB | ~$10 |
| Object Storage | 10GB | ~$5 |
| CloudFlare | Pro plan | ~$20 |
| **Total** | | **~$185/month** |

### Monitoring & Observability

```mermaid
flowchart LR
    subgraph Sources["📊 Data Sources"]
        App[Applications]
        K8s[Kubernetes]
        DB[Databases]
    end

    subgraph Collection["📥 Collection"]
        Prom[Prometheus]
        Loki[Loki]
        Tempo[Tempo]
    end

    subgraph Visualization["📈 Visualization"]
        Graf[Grafana]
    end

    subgraph Alerting["🚨 Alerting"]
        AM[AlertManager]
        PD[PagerDuty]
        Slack[Slack]
    end

    App --> Prom & Loki & Tempo
    K8s --> Prom
    DB --> Prom

    Prom & Loki & Tempo --> Graf
    Prom --> AM --> PD & Slack

    style Collection fill:#e6522c,color:#fff
    style Visualization fill:#f46800,color:#fff
```

**Key Metrics**:
| Metric | Target |
|--------|--------|
| Transfer success rate | 99.5% |
| API latency (p99) | < 500ms |
| Error rate | < 0.1% |
| Uptime | 99.9% |

---

## API Specification

See [API.md](./API.md) for complete OpenAPI specification.

### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/init` | Start phone verification | Public |
| POST | `/auth/verify` | Verify OTP, get JWT | Public |
| GET | `/wallet/balance` | Get user's USDC balance | Required |
| POST | `/transfers` | Create new transfer | Required |
| GET | `/transfers/:id` | Get transfer status | Required |
| GET | `/claims/:code` | Get claim info | Public |
| POST | `/claims/:code/verify` | Verify claim ownership | Public |
| POST | `/claims/:code/cashout` | Execute cash-out | Public |

---

## Development Setup

### Prerequisites

```bash
node >= 20.0.0
pnpm >= 9.0.0
docker >= 24.0.0
```

### Local Development

```bash
# Clone repository
git clone https://github.com/ping-cash/ping-cash.git
cd cash

# Install dependencies
pnpm install

# Start local services (Postgres, MongoDB, Redis, Redpanda)
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev          # All services
pnpm dev:api      # Backend only
pnpm dev:web      # Web claim flow only
pnpm dev:mobile   # Mobile app only
```

### Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://localhost:5432/cash
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/cash

# Privy
PRIVY_APP_ID=xxx
PRIVY_APP_SECRET=xxx

# Twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_VERIFY_SID=xxx

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_ACCESS_TOKEN=xxx

# TransFi
TRANSFI_API_KEY=xxx
TRANSFI_WEBHOOK_SECRET=xxx

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

---

## Phase 1 Deliverables Checklist

### Mobile App
- [ ] Phone authentication flow
- [ ] Home screen with balance
- [ ] Contact list with search
- [ ] Send money flow
- [ ] Transfer history
- [ ] Cash-in (Apple Pay, Google Pay, Card, Bank, USDC)
- [ ] Cash-out (to sender's country or home country)

### Web Claim Flow
- [ ] Claim landing page
- [ ] OTP verification
- [ ] Smart country detection from phone number
- [ ] Cash-out method selection (country-specific)
- [ ] Mobile wallet integrations (GCash, M-Pesa, bKash, etc.)
- [ ] Bank transfer integration
- [ ] Success/receipt page

### Backend
- [ ] Auth service (phone + Privy)
- [ ] Transfer service
- [ ] Claim service
- [ ] Wallet service (Privy integration)
- [ ] Notification service (WhatsApp + SMS)
- [ ] Off-ramp service (TransFi)

### Infrastructure
- [ ] Kubernetes setup (Civo/Vultr)
- [ ] Istio service mesh installation
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring dashboards (Kiali, Grafana)
- [ ] Alerting rules

### Compliance
- [ ] AML screening integration
- [ ] Transaction monitoring
- [ ] KYC flow (Persona)
- [ ] Privacy policy
- [ ] Terms of service

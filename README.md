# Ping

**The cheapest way to send money anywhere.**

No app needed to receive. No crypto knowledge required. Fees under 1%.

---

## The Problem

Sending money across borders is expensive and slow:

| Service | Fee to send $200 | Speed |
|---------|------------------|-------|
| Western Union | $10-15 (5-7%) | 1-3 days |
| Bank wire | $25-50 | 3-5 days |
| PayPal | $6-10 (3-5%) | Instant |
| Wise | $2-4 (1-2%) | Hours |
| **Ping** | **$1-2 (<1%)** | **Seconds** |

> 300 million migrant workers send $700 billion home every year, losing **$40+ billion to fees**.

---

## How We're Different

Others have solved parts of this. We combine the best:

| Feature | WorldRemit | Remitly | Chipper Cash | **Ping** |
|---------|------------|---------|--------------|----------|
| No app to receive | ❌ | ❌ | ❌ | ✅ |
| Stablecoin rails | ❌ | ❌ | ✅ | ✅ |
| Fees under 1% | ❌ | ❌ | ✅ | ✅ |
| Claim via link | ❌ | ❌ | ❌ | ✅ |
| Global coverage | Partial | Partial | Africa only | ✅ |
| B2B API | ❌ | ❌ | ❌ | ✅ |

**Our position**: Stablecoin economics + no-download UX + global coverage.

---

## How It Works

### High-Level Flow

```mermaid
flowchart LR
    subgraph Sender["👤 Sender (has app)"]
        A[Open App] --> B[Select Contact]
        B --> C[Enter Amount]
        C --> D[Tap Send]
    end

    subgraph Ping["⚡ Ping Platform"]
        D --> E[Debit Wallet]
        E --> F[Create Claim Link]
        F --> G[Send WhatsApp]
    end

    subgraph Recipient["👤 Recipient (no app)"]
        G --> H[Click Link]
        H --> I[Verify Phone]
        I --> J[Choose Cash-out]
        J --> K[Money in GCash/Bank]
    end

    style Ping fill:#10b981,color:#fff
```

### Detailed User Journey

```mermaid
sequenceDiagram
    autonumber
    participant S as Sender
    participant App as Cash App
    participant API as Ping API
    participant Chain as Blockchain
    participant WA as WhatsApp
    participant R as Recipient
    participant Web as Claim Web
    participant GCash as GCash/M-Pesa

    Note over S,GCash: 🚀 SEND FLOW
    S->>App: Open app, select "Mom"
    S->>App: Enter $100
    App->>API: POST /transfers
    API->>Chain: Transfer USDC
    Chain-->>API: Tx confirmed
    API->>WA: Send claim notification
    WA-->>R: "You received $100 from Son"
    API-->>App: Success + claim URL

    Note over S,GCash: 📥 CLAIM FLOW (No App Required)
    R->>Web: Click WhatsApp link
    Web->>API: GET /claims/{code}
    API-->>Web: Show amount, sender
    R->>Web: Enter OTP
    Web->>API: Verify phone
    API-->>Web: Show cash-out options
    R->>Web: Select GCash
    Web->>API: POST /claims/{code}/cashout
    API->>GCash: Send PHP via TransFi
    GCash-->>R: ₱5,580 received!
    API->>WA: Send confirmation
```

---

## Recipient Claim Flow

The recipient **never needs to download our app**. Everything happens in their browser:

```mermaid
stateDiagram-v2
    [*] --> LinkClicked: Tap WhatsApp link

    LinkClicked --> ShowAmount: Load claim page
    ShowAmount --> EnterOTP: Tap "Claim Now"
    EnterOTP --> VerifyPhone: Submit 6-digit code

    VerifyPhone --> SelectMethod: OTP valid
    VerifyPhone --> EnterOTP: Invalid (retry)

    SelectMethod --> GCash: Select GCash
    SelectMethod --> Maya: Select Maya
    SelectMethod --> Bank: Select Bank
    SelectMethod --> KeepWallet: Keep in wallet

    GCash --> Processing: Enter account
    Maya --> Processing: Enter account
    Bank --> Processing: Enter account
    KeepWallet --> DownloadApp: Install app

    Processing --> Success: Funds delivered
    Success --> [*]

    DownloadApp --> [*]
```

---

## Supported Corridors (Phase 1)

```mermaid
flowchart TB
    subgraph Send["💰 SEND FROM"]
        UAE[🇦🇪 UAE]
        KSA[🇸🇦 Saudi Arabia]
        KWT[🇰🇼 Kuwait]
        QAT[🇶🇦 Qatar]
        USA[🇺🇸 USA]
        GBR[🇬🇧 UK]
    end

    subgraph Ping["⚡ PING"]
        Bridge((Stablecoin<br/>Bridge))
    end

    subgraph Receive["📲 RECEIVE TO"]
        PHL[🇵🇭 Philippines<br/>GCash, Maya]
        IND[🇮🇳 India<br/>Paytm, UPI]
        PAK[🇵🇰 Pakistan<br/>JazzCash]
        KEN[🇰🇪 Kenya<br/>M-Pesa]
        NGA[🇳🇬 Nigeria<br/>Opay]
    end

    UAE --> Bridge
    KSA --> Bridge
    KWT --> Bridge
    QAT --> Bridge
    USA --> Bridge
    GBR --> Bridge

    Bridge --> PHL
    Bridge --> IND
    Bridge --> PAK
    Bridge --> KEN
    Bridge --> NGA

    style Bridge fill:#10b981,color:#fff,stroke:#059669
```

---

## Target Users

### Primary: Migrant Workers in GCC

```mermaid
pie showData
    title GCC Migrant Worker Origins
    "India" : 35
    "Philippines" : 25
    "Pakistan" : 15
    "Bangladesh" : 12
    "Nepal" : 8
    "Others" : 5
```

- **35M+ migrant workers** in Gulf countries
- Send **$100-500/month** home
- Current pain: **5-7% fees** to exchange houses
- Our value: **<1% fees**, instant delivery

---

## Technology

### Why Stablecoins?

We use USDC/USDT on fast blockchains as **invisible infrastructure**:

| Benefit | Traditional Rails | Stablecoin Rails |
|---------|-------------------|------------------|
| Speed | Hours to days | **Seconds** |
| Cost | $5-50 per transfer | **$0.001-0.01** |
| Availability | Banking hours | **24/7/365** |
| Coverage | Limited corridors | **Global** |

> **Users never see "crypto"** - they see dollars in, local currency out.

### System Architecture

```mermaid
flowchart TB
    subgraph Clients["📱 Clients"]
        Mobile[Mobile App<br/>React Native]
        Web[Web Claim<br/>Next.js]
        Admin[Admin Panel<br/>Next.js]
    end

    subgraph Gateway["🚪 API Gateway"]
        Kong[Kong / Traefik<br/>Rate Limit, Auth, Routing]
    end

    subgraph Services["⚙️ Microservices"]
        Auth[Auth Service]
        User[User Service]
        Transfer[Transfer Service]
        Wallet[Wallet Service]
        Claim[Claim Service]
        Offramp[Off-ramp Service]
        Notify[Notify Service]
        FX[FX Service]
    end

    subgraph Events["📨 Event Bus"]
        Kafka[Redpanda<br/>Kafka-compatible]
    end

    subgraph Data["💾 Data Stores"]
        PG[(PostgreSQL<br/>Transfers, Ledger)]
        Mongo[(MongoDB<br/>Users, Claims)]
        Redis[(Redis<br/>Cache, Sessions)]
    end

    subgraph External["🌐 External Services"]
        Privy[Privy<br/>Wallets]
        TransFi[TransFi<br/>Off-ramp]
        Twilio[Twilio<br/>SMS/OTP]
        WhatsApp[WhatsApp<br/>Notifications]
        Solana[Solana<br/>USDC]
    end

    Mobile --> Kong
    Web --> Kong
    Admin --> Kong

    Kong --> Auth
    Kong --> Transfer
    Kong --> Claim

    Auth --> Redis
    User --> Mongo
    Transfer --> PG
    Transfer --> Kafka
    Wallet --> Privy
    Wallet --> Solana
    Claim --> Mongo
    Offramp --> TransFi
    Notify --> WhatsApp
    Notify --> Twilio

    Kafka --> Wallet
    Kafka --> Claim
    Kafka --> Notify
    Kafka --> Offramp

    style Kafka fill:#e11d48,color:#fff
    style Kong fill:#003459,color:#fff
```

### Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Mobile App | React Native + Expo | Cross-platform, fast iteration |
| Web Claim | Next.js 14 | SSR, great mobile web UX |
| API | Fastify | Fast, TypeScript-native |
| Auth/Wallets | Privy | MPC wallets, social login |
| Database (ACID) | PostgreSQL | Financial data integrity |
| Database (Scale) | MongoDB | User profiles, high read |
| Cache | Redis | Sessions, rate limits |
| Events | Redpanda | Kafka-compatible, simpler |
| Off-ramp | TransFi | 300+ local payment methods |
| Blockchain | Solana | Fast, cheap USDC transfers |

---

## Business Model

### Revenue Streams

```mermaid
sankey-beta
    FX Spread,Revenue,1.00
    Off-ramp Fee,Revenue,0.75
    Float Interest,Revenue,0.50
    On-ramp Share,Revenue,0.25
    Revenue,Operating Costs,0.50
    Revenue,Gross Profit,2.00
```

| Stream | Rate | Example ($200 transfer) |
|--------|------|-------------------------|
| FX spread | 0.5-1% | $1-2 |
| Off-ramp share | 0.3-0.5% | $0.60-1 |
| Float interest | 5% APY | Variable |

### Unit Economics

```
Average transfer:     $200
Revenue:              $1.50 - $2.50
Costs:                $0.15
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gross margin:         90%+
```

---

## Regulatory Approach

### Strategy: Partner, Don't Build

```mermaid
flowchart LR
    subgraph Licensed["Licensed Partners Handle Fiat"]
        OnRamp[MoonPay/Transak<br/>Money Transmitter]
        OffRamp[TransFi<br/>Local Licenses]
    end

    subgraph Ping["Ping Handles Crypto"]
        Move[Move Stablecoins<br/>Between Wallets]
    end

    subgraph User["User Experience"]
        In[Fiat In] --> OnRamp
        OnRamp --> Move
        Move --> OffRamp
        OffRamp --> Out[Fiat Out]
    end

    style Ping fill:#10b981,color:#fff
```

We **never touch fiat directly**, minimizing regulatory burden.

### KYC Tiers

| Tier | Limit | Requirements |
|------|-------|--------------|
| 0 | Receive only | Phone verification |
| 1 | $500/month | Name + Phone |
| 2 | $5,000/month | ID document |
| 3 | $50,000/month | Full KYC + address |

---

## Roadmap

```mermaid
gantt
    title Ping Platform Roadmap
    dateFormat  YYYY-MM
    axisFormat  %b %Y

    section Phase 1: MVP
    Mobile App (iOS + Android)     :p1a, 2025-01, 2M
    Web Claim Flow                 :p1b, 2025-01, 2M
    USDC on Solana                 :p1c, 2025-01, 1M
    GCash Off-ramp                 :p1d, 2025-02, 1M
    WhatsApp Notifications         :p1e, 2025-02, 1M

    section Phase 2: Expansion
    Multi-chain (TRON, Base)       :p2a, 2025-03, 2M
    M-Pesa, Paytm, UPI             :p2b, 2025-03, 2M
    Multi-currency Support         :p2c, 2025-04, 1M

    section Phase 3: Growth
    Referral Program               :p3a, 2025-05, 1M
    WhatsApp Mini App              :p3b, 2025-05, 2M
    Bank Off-ramps (50 countries)  :p3c, 2025-06, 2M

    section Phase 4: Platform
    B2B API                        :p4a, 2025-07, 2M
    Virtual Debit Card             :p4b, 2025-08, 2M
```

---

## Growth Strategy

### Viral Loop

```mermaid
flowchart TD
    A[Sender Downloads App] --> B[Sends Money]
    B --> C[Recipient Gets WhatsApp]
    C --> D[Claims via Web]
    D --> E{Wants to Send?}
    E -->|Yes| F[Downloads App]
    F --> G[Becomes Sender]
    G --> B
    E -->|No| H[Done]

    style F fill:#10b981,color:#fff
```

> **Every transfer is a potential new user** with zero friction to receive.

---

## Market Opportunity

```mermaid
pie showData
    title Global Remittance Market ($700B/year)
    "GCC → South Asia" : 80
    "US → Latin America" : 150
    "EU → Africa" : 50
    "Other Corridors" : 420
```

| Metric | Value |
|--------|-------|
| Global remittance market | $700B/year |
| Average fees | 6.2% |
| Total fees paid | $43B/year |
| **Our target (1%)** | **$430M opportunity** |

---

## Competitive Landscape

```mermaid
quadrantChart
    title Competitive Positioning
    x-axis Low Fees --> High Fees
    y-axis Complex UX --> Simple UX
    quadrant-1 Premium & Simple
    quadrant-2 Premium & Complex
    quadrant-3 Cheap & Complex
    quadrant-4 Cheap & Simple

    Western Union: [0.8, 0.4]
    Wise: [0.4, 0.6]
    Remitly: [0.5, 0.7]
    Crypto Wallets: [0.2, 0.2]
    Ping: [0.15, 0.85]
```

| Company | Strengths | Weaknesses | Our Advantage |
|---------|-----------|------------|---------------|
| Western Union | Brand, cash pickup | Expensive, slow | 10x cheaper |
| Wise | Transparent pricing | Still 1-2% fees | Cheaper, instant |
| Remitly | Good mobile UX | Need accounts | No app to receive |
| Crypto wallets | Cheap | Complex UX | No crypto knowledge |

---

## Getting Started

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

# Start infrastructure (Postgres, MongoDB, Redis, Redpanda)
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Start all services
pnpm dev
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design and data flows |
| [NFR](docs/NFR.md) | Non-functional requirements |
| [API](docs/API.md) | REST API specification |
| [Database](docs/DATABASE.md) | Schema documentation |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

Proprietary - All rights reserved.

---

**Ping** - Because sending money shouldn't cost more than the message.

# Phase 1 Technical Architecture

## Overview

This document describes the technical architecture for Cash Phase 1 MVP, covering:
- System components and their interactions
- Data flows for key user journeys
- Technology choices and rationale
- Security considerations
- Infrastructure requirements

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐          ┌─────────────────┐          ┌────────────────┐  │
│   │   Mobile App    │          │   Web Claim     │          │   Admin Panel  │  │
│   │  (React Native) │          │   (Next.js)     │          │   (Next.js)    │  │
│   │                 │          │                 │          │                │  │
│   │  - iOS         │          │  - Claim flow   │          │  - Monitoring  │  │
│   │  - Android     │          │  - OTP verify   │          │  - Support     │  │
│   │                 │          │  - Cash-out     │          │  - Reports     │  │
│   └────────┬────────┘          └────────┬────────┘          └───────┬────────┘  │
│            │                            │                           │           │
└────────────┼────────────────────────────┼───────────────────────────┼───────────┘
             │                            │                           │
             └────────────────────────────┼───────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  API GATEWAY                                     │
│                              (Kong / AWS API Gateway)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│  - Rate limiting          - JWT validation         - Request logging            │
│  - CORS handling          - API versioning         - DDoS protection            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│   │   Auth Service  │    │ Transfer Service│    │  Claim Service  │            │
│   │                 │    │                 │    │                 │            │
│   │  - Phone verify │    │  - Create       │    │  - Generate     │            │
│   │  - Session mgmt │    │  - Execute      │    │  - Verify       │            │
│   │  - Privy SDK    │    │  - Status       │    │  - Process      │            │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘            │
│            │                      │                      │                      │
│   ┌────────┴────────┐    ┌────────┴────────┐    ┌────────┴────────┐            │
│   │  User Service   │    │ Wallet Service  │    │  Notify Service │            │
│   │                 │    │                 │    │                 │            │
│   │  - Profile      │    │  - Balance      │    │  - WhatsApp     │            │
│   │  - KYC status   │    │  - Addresses    │    │  - SMS          │            │
│   │  - Contacts     │    │  - Privy calls  │    │  - Push         │            │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│   │ Off-ramp Service│    │   FX Service    │    │Compliance Service│            │
│   │                 │    │                 │    │                 │            │
│   │  - TransFi API  │    │  - Rate fetch   │    │  - AML screen   │            │
│   │  - Status track │    │  - Conversion   │    │  - Sanctions    │            │
│   │  - Webhooks     │    │  - Cache        │    │  - Limits       │            │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│   │   PostgreSQL    │    │     Redis       │    │   S3 / Minio    │            │
│   │                 │    │                 │    │                 │            │
│   │  - Users        │    │  - Sessions     │    │  - KYC docs     │            │
│   │  - Transfers    │    │  - Rate cache   │    │  - Receipts     │            │
│   │  - Claims       │    │  - OTP codes    │    │  - Logs         │            │
│   │  - Wallets      │    │  - Rate limits  │    │                 │            │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             EXTERNAL SERVICES                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│   │     Privy       │    │    TransFi      │    │     Twilio      │            │
│   │                 │    │                 │    │                 │            │
│   │  - Embedded     │    │  - Off-ramp     │    │  - SMS OTP      │            │
│   │    wallets      │    │  - GCash/M-Pesa │    │  - Voice        │            │
│   │  - MPC keys     │    │  - Webhooks     │    │                 │            │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│   │  WhatsApp API   │    │    Persona      │    │     Solana      │            │
│   │                 │    │                 │    │                 │            │
│   │  - Notifications│    │  - ID verify    │    │  - USDC         │            │
│   │  - Templates    │    │  - Liveness     │    │  - Transactions │            │
│   │                 │    │  - Sanctions    │    │                 │            │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Mobile App (React Native)

**Purpose**: Primary interface for senders to create and manage transfers.

**Key Features**:
- Phone number authentication via Privy
- Contact list access and sync
- Transfer creation and history
- Balance management
- On-ramp integration (MoonPay widget)

**Tech Stack**:
```
- React Native 0.73+
- Expo (managed workflow)
- Privy React Native SDK
- React Navigation 6
- TanStack Query (data fetching)
- Zustand (state management)
```

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
- Off-ramp method selection
- Cash-out processing
- Receipt generation

**Tech Stack**:
```
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- Server Actions
```

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
```
- Node.js 20 LTS
- TypeScript
- Fastify (HTTP framework)
- Prisma (ORM)
- Bull (job queues)
- Zod (validation)
```

**Service Breakdown**:

#### Auth Service
```typescript
// Endpoints
POST /auth/init          // Start phone verification
POST /auth/verify        // Verify OTP, create session
POST /auth/refresh       // Refresh JWT token
POST /auth/logout        // Invalidate session

// Privy Integration
- Uses Privy Server SDK for wallet creation
- JWT tokens signed with our secret
- Session stored in Redis (24h TTL)
```

#### Transfer Service
```typescript
// Endpoints
POST /transfers              // Create new transfer
GET  /transfers/:id          // Get transfer details
GET  /transfers              // List user's transfers
POST /transfers/:id/cancel   // Cancel pending transfer

// States
PENDING    → Awaiting blockchain confirmation
CONFIRMED  → On-chain, awaiting claim
CLAIMED    → Recipient verified ownership
PROCESSING → Off-ramp in progress
COMPLETED  → Funds delivered
CANCELLED  → Cancelled by sender
EXPIRED    → Claim link expired (7 days)
```

#### Claim Service
```typescript
// Endpoints
GET  /claims/:code           // Get claim details (public)
POST /claims/:code/verify    // Verify phone ownership
POST /claims/:code/cashout   // Initiate cash-out

// Security
- Claim codes are 12-char alphanumeric (62^12 possibilities)
- Rate limited: 5 OTP attempts per claim
- Expires after 7 days or on completion
```

#### Wallet Service
```typescript
// Endpoints
GET  /wallet/balance         // Get USDC balance
GET  /wallet/address         // Get deposit address
POST /wallet/send            // Send to another user

// Privy Integration
- Each user gets embedded Solana wallet
- We never hold private keys
- Transactions signed via Privy MPC
```

#### Notification Service
```typescript
// Channels
- WhatsApp Business API (primary)
- Twilio SMS (fallback)
- Push notifications (app users)

// Templates
TRANSFER_RECEIVED   // "You received $100 from Mom"
CLAIM_REMINDER      // "Don't forget to claim your $100"
CASHOUT_COMPLETE    // "₱5,580 sent to your GCash"
```

#### Off-ramp Service
```typescript
// TransFi Integration
POST /offramp/quote          // Get cash-out quote
POST /offramp/execute        // Execute cash-out
GET  /offramp/status/:id     // Check status

// Supported Methods (Phase 1)
- GCash (Philippines)
- Maya (Philippines)
- Bank transfer (Philippines)
```

### 4. Database Schema

See [DATABASE.md](./DATABASE.md) for complete schema.

**Core Tables**:
```
users           - User accounts
wallets         - Blockchain wallet addresses
transfers       - Transfer records
claims          - Claim links and status
kyc_records     - KYC verification data
notifications   - Notification log
```

### 5. External Service Integrations

#### Privy (Wallet Infrastructure)

**Purpose**: Embedded wallets with social login, no seed phrases.

**Integration Points**:
```typescript
// Server SDK
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(appId, appSecret);

// Create user wallet
const user = await privy.createUser({
  phone: '+639171234567',
});

// Sign transaction
const signature = await privy.signTransaction(userId, transaction);
```

**Pricing**: $0.05/wallet + $0.01/transaction

#### TransFi (Off-ramp)

**Purpose**: Convert USDC to local currency (GCash, bank, etc.)

**Integration Flow**:
```
1. GET /quote
   - Input: amount, currency, destination (gcash/bank)
   - Output: exchange rate, fees, estimated delivery

2. POST /payout
   - Input: amount, recipient details, destination
   - Output: payout_id, status

3. Webhook: payout.completed / payout.failed
   - Update our database
   - Notify user
```

**Pricing**: 0.5-1% per transaction (we keep portion)

#### Twilio (SMS/OTP)

**Purpose**: Phone verification via SMS OTP.

**Integration**:
```typescript
import twilio from 'twilio';

const client = twilio(accountSid, authToken);

// Send OTP
await client.verify.v2
  .services(verifySid)
  .verifications.create({
    to: '+639171234567',
    channel: 'sms',
  });

// Verify OTP
await client.verify.v2
  .services(verifySid)
  .verificationChecks.create({
    to: '+639171234567',
    code: '123456',
  });
```

**Pricing**: $0.05/verification

#### WhatsApp Business API

**Purpose**: Send claim notifications to recipients.

**Integration**:
```typescript
// Using official WhatsApp Cloud API
const response = await fetch(
  `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'template',
      template: {
        name: 'transfer_received',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: senderName },
              { type: 'text', text: amount },
              { type: 'text', text: claimUrl },
            ],
          },
        ],
      },
    }),
  }
);
```

**Pricing**: $0.005-0.05/message depending on region

#### Solana (Blockchain)

**Purpose**: USDC transfers on Solana for speed and low cost.

**Integration**:
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, transfer } from '@solana/spl-token';

const connection = new Connection('https://api.mainnet-beta.solana.com');

// USDC mint on Solana
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Get balance
const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, userPubkey);
const balance = await connection.getTokenAccountBalance(tokenAccount);

// Transfer (via Privy signing)
const tx = await transfer(
  connection,
  payer,
  sourceAccount,
  destinationAccount,
  owner,
  amount * 1e6, // USDC has 6 decimals
);
```

**Costs**: ~$0.001 per transaction

## Data Flows

### Flow 1: User Registration

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Mobile  │     │   Auth   │     │  Twilio  │     │  Privy   │
│   App    │     │ Service  │     │          │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Enter phone │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 2. Send OTP    │                │
     │                │───────────────>│                │
     │                │                │                │
     │ 3. Enter OTP   │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 4. Verify OTP  │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │ 5. Create user │                │
     │                │────────────────────────────────>│
     │                │                │                │
     │                │ 6. Return wallet address        │
     │                │<────────────────────────────────│
     │                │                │                │
     │ 7. JWT + user  │                │                │
     │<───────────────│                │                │
     │                │                │                │
```

### Flow 2: Send Money

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Mobile  │     │ Transfer │     │  Wallet  │     │  Solana  │     │ WhatsApp │
│   App    │     │ Service  │     │ Service  │     │          │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ 1. Create      │                │                │                │
     │    transfer    │                │                │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │ 2. Check       │                │                │
     │                │    balance     │                │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │                │ 3. Sign & send │                │
     │                │                │    USDC        │                │
     │                │                │───────────────>│                │
     │                │                │                │                │
     │                │                │ 4. Tx hash     │                │
     │                │                │<───────────────│                │
     │                │                │                │                │
     │                │ 5. Create claim│                │                │
     │                │    link        │                │                │
     │                │────────────────────────────────────────────────>│
     │                │                │                │                │
     │ 6. Success +   │                │                │                │
     │    claim link  │                │                │                │
     │<───────────────│                │                │                │
     │                │                │                │                │
```

### Flow 3: Claim Money (Web)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   Web    │     │  Claim   │     │  Twilio  │     │ Off-ramp │     │  TransFi │
│  Browser │     │ Service  │     │          │     │ Service  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ 1. Open claim  │                │                │                │
     │    link        │                │                │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │ 2. Claim info  │                │                │                │
     │<───────────────│                │                │                │
     │                │                │                │                │
     │ 3. Request OTP │                │                │                │
     │───────────────>│                │                │                │
     │                │ 4. Send OTP    │                │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │ 5. Submit OTP  │                │                │                │
     │───────────────>│                │                │                │
     │                │ 6. Verify      │                │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │ 7. Cash-out    │                │                │                │
     │    options     │                │                │                │
     │<───────────────│                │                │                │
     │                │                │                │                │
     │ 8. Select      │                │                │                │
     │    GCash       │                │                │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │ 9. Execute     │                │                │
     │                │    off-ramp    │                │                │
     │                │───────────────────────────────>│                │
     │                │                │                │                │
     │                │                │                │ 10. Send to    │
     │                │                │                │     GCash      │
     │                │                │                │───────────────>│
     │                │                │                │                │
     │ 11. Success    │                │                │                │
     │<───────────────│                │                │                │
     │                │                │                │                │
```

## Security Architecture

### Authentication

```
┌─────────────────────────────────────────────────────────┐
│                   Authentication Flow                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   1. Phone Verification (Twilio Verify)                 │
│      - Rate limited: 3 attempts / 10 min                │
│      - Code expires: 10 minutes                         │
│                                                          │
│   2. JWT Token (HS256)                                  │
│      - Access token: 15 min TTL                         │
│      - Refresh token: 7 days TTL                        │
│      - Stored in secure storage (mobile)                │
│      - HttpOnly cookie (web)                            │
│                                                          │
│   3. Session Management (Redis)                         │
│      - Session ID stored with user context              │
│      - Invalidated on logout / password change          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Wallet Security

```
┌─────────────────────────────────────────────────────────┐
│                    Privy MPC Architecture                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   User Key Shards:                                      │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│   │ Device  │  │  Privy  │  │ Recovery│                │
│   │  Shard  │  │  Shard  │  │  Shard  │                │
│   └────┬────┘  └────┬────┘  └────┬────┘                │
│        │            │            │                      │
│        └────────────┼────────────┘                      │
│                     │                                    │
│              ┌──────┴──────┐                            │
│              │   2-of-3    │                            │
│              │  Threshold  │                            │
│              │   Signing   │                            │
│              └─────────────┘                            │
│                                                          │
│   - We never see complete private key                   │
│   - User can recover with phone + recovery shard        │
│   - Privy is SOC 2 Type II certified                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Claim Link Security

```
┌─────────────────────────────────────────────────────────┐
│                   Claim Link Security                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   URL Format: https://cash.app/c/{code}                 │
│                                                          │
│   Code Generation:                                      │
│   - 12 characters, alphanumeric (a-zA-Z0-9)            │
│   - 62^12 = 3.2 × 10^21 possibilities                  │
│   - Generated using crypto.randomBytes()                │
│                                                          │
│   Security Measures:                                    │
│   - Phone verification required to claim                │
│   - 5 OTP attempts max, then locked                    │
│   - 7-day expiration                                    │
│   - Single-use (cannot be claimed twice)               │
│   - Rate limit: 10 claims/hour per IP                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Encryption

| Data Type | At Rest | In Transit |
|-----------|---------|------------|
| Phone numbers | Hashed (SHA256) for lookup, encrypted for display | TLS 1.3 |
| Wallet addresses | Plaintext (public data) | TLS 1.3 |
| KYC documents | AES-256 encrypted | TLS 1.3 |
| Session tokens | Redis (encrypted at rest) | TLS 1.3 |
| Database | PostgreSQL TDE | TLS 1.3 |

## Infrastructure

### Phase 1 Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    AWS Infrastructure                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Region: me-south-1 (Bahrain) - closest to GCC         │
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │                     VPC                          │   │
│   │  ┌─────────────────────────────────────────┐    │   │
│   │  │            Public Subnet                 │    │   │
│   │  │  ┌─────────────┐  ┌─────────────┐       │    │   │
│   │  │  │     ALB     │  │  CloudFront │       │    │   │
│   │  │  └─────────────┘  └─────────────┘       │    │   │
│   │  └─────────────────────────────────────────┘    │   │
│   │                                                  │   │
│   │  ┌─────────────────────────────────────────┐    │   │
│   │  │            Private Subnet                │    │   │
│   │  │  ┌─────────────────────────────────┐    │    │   │
│   │  │  │         ECS Fargate             │    │    │   │
│   │  │  │  ┌─────────┐  ┌─────────┐       │    │    │   │
│   │  │  │  │   API   │  │  Worker │       │    │    │   │
│   │  │  │  │ Service │  │  Tasks  │       │    │    │   │
│   │  │  │  └─────────┘  └─────────┘       │    │    │   │
│   │  │  └─────────────────────────────────┘    │    │   │
│   │  └─────────────────────────────────────────┘    │   │
│   │                                                  │   │
│   │  ┌─────────────────────────────────────────┐    │   │
│   │  │            Data Subnet                   │    │   │
│   │  │  ┌───────────┐  ┌───────────┐           │    │   │
│   │  │  │    RDS    │  │ ElastiCache│           │    │   │
│   │  │  │ Postgres  │  │   Redis    │           │    │   │
│   │  │  └───────────┘  └───────────┘           │    │   │
│   │  └─────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Resource Sizing (Phase 1)

| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| ECS Fargate (API) | 2 tasks × 0.5 vCPU, 1GB | ~$30 |
| ECS Fargate (Worker) | 1 task × 0.25 vCPU, 0.5GB | ~$10 |
| RDS PostgreSQL | db.t3.small, 20GB | ~$30 |
| ElastiCache Redis | cache.t3.micro | ~$15 |
| ALB | 1 load balancer | ~$20 |
| CloudFront | 100GB transfer | ~$10 |
| S3 | 10GB storage | ~$1 |
| **Total** | | **~$120/month** |

### Monitoring & Observability

```
┌─────────────────────────────────────────────────────────┐
│                    Observability Stack                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Logs:        CloudWatch Logs → OpenSearch (optional)  │
│   Metrics:     CloudWatch Metrics + Custom dashboards   │
│   Traces:      AWS X-Ray                                │
│   Alerts:      CloudWatch Alarms → SNS → PagerDuty     │
│   Uptime:      Better Uptime / Checkly                  │
│                                                          │
│   Key Metrics:                                          │
│   - Transfer success rate (target: 99.5%)               │
│   - Claim completion rate                               │
│   - Off-ramp success rate                               │
│   - API latency (p99 < 500ms)                          │
│   - Error rate (< 0.1%)                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## API Specification

See [API.md](./API.md) for complete OpenAPI specification.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/init` | Start phone verification |
| POST | `/auth/verify` | Verify OTP, get JWT |
| GET | `/wallet/balance` | Get user's USDC balance |
| POST | `/transfers` | Create new transfer |
| GET | `/transfers/:id` | Get transfer status |
| GET | `/claims/:code` | Get claim info (public) |
| POST | `/claims/:code/verify` | Verify claim ownership |
| POST | `/claims/:code/cashout` | Execute cash-out |

## Development Setup

### Prerequisites

```bash
# Required
node >= 20.0.0
pnpm >= 8.0.0
docker >= 24.0.0
```

### Local Development

```bash
# Clone repository
git clone https://github.com/sociable-cloud/cash.git
cd cash

# Install dependencies
pnpm install

# Start local services (Postgres, Redis)
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

## Phase 1 Deliverables Checklist

### Mobile App
- [ ] Phone authentication flow
- [ ] Home screen with balance
- [ ] Contact list with search
- [ ] Send money flow
- [ ] Transfer history
- [ ] On-ramp (MoonPay widget)

### Web Claim Flow
- [ ] Claim landing page
- [ ] OTP verification
- [ ] Cash-out method selection
- [ ] GCash integration
- [ ] Success/receipt page

### Backend
- [ ] Auth service (phone + Privy)
- [ ] Transfer service
- [ ] Claim service
- [ ] Wallet service (Privy integration)
- [ ] Notification service (WhatsApp + SMS)
- [ ] Off-ramp service (TransFi)

### Infrastructure
- [ ] AWS setup (VPC, ECS, RDS, Redis)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring dashboards
- [ ] Alerting rules

### Compliance
- [ ] AML screening integration
- [ ] Transaction monitoring
- [ ] KYC flow (Persona)
- [ ] Privacy policy
- [ ] Terms of service

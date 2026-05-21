# API Specification

## Overview

Ping API follows REST conventions with JSON payloads. All endpoints are versioned and require authentication unless specified.

```mermaid
flowchart LR
    subgraph Clients["Clients"]
        Mobile[Mobile App]
        Web[Web Claim]
        Admin[Admin Panel]
    end

    subgraph Gateway["API Gateway"]
        Kong[Kong/Traefik]
    end

    subgraph Services["Services"]
        Auth[/auth]
        Users[/users]
        Transfers[/transfers]
        Claims[/claims]
        Wallet[/wallet]
        FX[/fx]
    end

    Clients --> Kong --> Services

    style Gateway fill:#003459,color:#fff
```

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://api.cash.app/v1` |
| Staging | `https://api.staging.cash.app/v1` |
| Development | `http://localhost:3000/v1` |

## Authentication

### JWT Bearer Token

All authenticated endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Structure

```typescript
interface JWTPayload {
  sub: string;           // User ID
  phone: string;         // Phone number (hashed)
  tier: number;          // KYC tier (0-3)
  iat: number;           // Issued at
  exp: number;           // Expiration (15 min)
  jti: string;           // Token ID
}
```

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh endpoint to obtain new tokens:

```http
POST /auth/refresh
Authorization: Bearer {refresh_token}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Your balance is insufficient for this transfer",
    "details": {
      "required": "100.00",
      "available": "50.00"
    },
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
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

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/init` | 5 | 10 min |
| `/auth/verify` | 10 | 10 min |
| `/transfers` (POST) | 20 | 1 hour |
| `/claims/:code/verify` | 5 | 10 min |
| General | 100 | 1 min |

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642000000
```

---

## Endpoints

### Auth Service

#### Initialize Phone Verification

Start the OTP flow for phone authentication.

```http
POST /auth/init
```

**Request:**
```json
{
  "phone": "+639171234567",
  "channel": "sms"
}
```

**Response:** `200 OK`
```json
{
  "sessionId": "sess_abc123",
  "expiresIn": 600,
  "channel": "sms"
}
```

**Errors:**
- `RATE_LIMITED` - Too many OTP requests
- `INVALID_PHONE` - Phone number format invalid

---

#### Verify OTP

Complete phone verification and receive tokens.

```http
POST /auth/verify
```

**Request:**
```json
{
  "sessionId": "sess_abc123",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "usr_xyz789",
    "phone": "+63 *** *** 4567",
    "name": null,
    "kyc": {
      "status": "none",
      "tier": 0
    },
    "wallet": {
      "address": "7xKp2mN9qL4rYz...",
      "chain": "solana"
    }
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  },
  "isNewUser": true
}
```

**Errors:**
- `INVALID_OTP` - Wrong code
- `OTP_EXPIRED` - Code has expired
- `MAX_ATTEMPTS` - Too many failed attempts

---

#### Refresh Token

```http
POST /auth/refresh
Authorization: Bearer {refresh_token}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

---

#### Logout

```http
POST /auth/logout
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

---

### Users Service

#### Get Current User

```http
GET /users/me
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "usr_xyz789",
  "phone": "+63 *** *** 4567",
  "profile": {
    "name": "John Doe",
    "avatar": "https://cdn.cash.app/avatars/..."
  },
  "kyc": {
    "status": "verified",
    "tier": 2
  },
  "wallet": {
    "address": "7xKp2mN9qL4rYz...",
    "chain": "solana"
  },
  "limits": {
    "daily": {
      "limit": 500,
      "used": 150,
      "remaining": 350
    },
    "monthly": {
      "limit": 5000,
      "used": 500,
      "remaining": 4500
    }
  },
  "stats": {
    "totalSent": 1500.00,
    "totalReceived": 200.00,
    "transferCount": 15
  },
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

#### Update Profile

```http
PATCH /users/me
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Response:** `200 OK`
```json
{
  "id": "usr_xyz789",
  "profile": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

#### Get Contacts

```http
GET /users/me/contacts
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search by name |
| `registered` | boolean | Filter by registration status |
| `limit` | number | Results per page (default: 50) |
| `cursor` | string | Pagination cursor |

**Response:** `200 OK`
```json
{
  "contacts": [
    {
      "name": "Mom",
      "phone": "+63 *** *** 4567",
      "isRegistered": true,
      "avatar": "https://cdn.cash.app/avatars/...",
      "lastTransferAt": "2025-01-10T10:00:00Z"
    },
    {
      "name": "Dad",
      "phone": "+63 *** *** 9876",
      "isRegistered": false,
      "avatar": null,
      "lastTransferAt": null
    }
  ],
  "nextCursor": "eyJvZmZzZXQiOjUwfQ=="
}
```

---

#### Sync Contacts

```http
POST /users/me/contacts/sync
Authorization: Bearer {token}
```

**Request:**
```json
{
  "contacts": [
    {
      "name": "Mom",
      "phones": ["+639181234567", "+639181234568"]
    },
    {
      "name": "Dad",
      "phones": ["+639191234567"]
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "synced": 2,
  "registered": 1,
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

### Transfers Service

#### Create Transfer

```http
POST /transfers
Authorization: Bearer {token}
```

**Request:**
```json
{
  "recipientPhone": "+639181234567",
  "amount": "100.00",
  "currency": "USD",
  "note": "For groceries"
}
```

**Response:** `201 Created`
```json
{
  "id": "txn_abc123",
  "status": "pending",
  "sender": {
    "id": "usr_xyz789",
    "name": "John",
    "phone": "+63 *** *** 4567"
  },
  "recipient": {
    "phone": "+63 *** *** 1234",
    "isRegistered": false
  },
  "amount": {
    "value": "100.00",
    "currency": "USD",
    "localValue": "5580.00",
    "localCurrency": "PHP",
    "fxRate": "55.80"
  },
  "fees": {
    "platform": "0.50",
    "network": "0.01",
    "total": "0.51"
  },
  "claim": {
    "code": "x7Kp2mN9qL4r",
    "url": "https://cash.app/c/x7Kp2mN9qL4r",
    "expiresAt": "2025-01-22T10:00:00Z"
  },
  "note": "For groceries",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**Errors:**
- `INSUFFICIENT_BALANCE` - Not enough funds
- `TRANSFER_LIMIT_EXCEEDED` - Daily/monthly limit reached
- `KYC_REQUIRED` - Higher KYC tier needed for amount
- `INVALID_RECIPIENT` - Invalid phone number

---

#### List Transfers

```http
GET /transfers
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `direction` | string | `sent` or `received` |
| `limit` | number | Results per page (default: 20) |
| `cursor` | string | Pagination cursor |

**Response:** `200 OK`
```json
{
  "transfers": [
    {
      "id": "txn_abc123",
      "status": "completed",
      "direction": "sent",
      "recipient": {
        "name": "Mom",
        "phone": "+63 *** *** 1234"
      },
      "amount": {
        "value": "100.00",
        "currency": "USD"
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "completedAt": "2025-01-15T10:05:00Z"
    }
  ],
  "nextCursor": "eyJvZmZzZXQiOjIwfQ=="
}
```

---

#### Get Transfer

```http
GET /transfers/:id
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "txn_abc123",
  "status": "completed",
  "sender": {
    "id": "usr_xyz789",
    "name": "John",
    "phone": "+63 *** *** 4567"
  },
  "recipient": {
    "phone": "+63 *** *** 1234",
    "name": "Mom"
  },
  "amount": {
    "value": "100.00",
    "currency": "USD",
    "localValue": "5580.00",
    "localCurrency": "PHP",
    "fxRate": "55.80"
  },
  "fees": {
    "platform": "0.50",
    "network": "0.01",
    "total": "0.51"
  },
  "claim": {
    "code": "x7Kp2mN9qL4r",
    "url": "https://cash.app/c/x7Kp2mN9qL4r",
    "status": "claimed",
    "claimedAt": "2025-01-15T10:02:00Z"
  },
  "blockchain": {
    "chain": "solana",
    "txHash": "5xYz...",
    "confirmedAt": "2025-01-15T10:00:30Z"
  },
  "offramp": {
    "method": "gcash",
    "status": "completed",
    "completedAt": "2025-01-15T10:05:00Z"
  },
  "timeline": [
    { "event": "created", "at": "2025-01-15T10:00:00Z" },
    { "event": "confirmed", "at": "2025-01-15T10:00:30Z" },
    { "event": "claimed", "at": "2025-01-15T10:02:00Z" },
    { "event": "completed", "at": "2025-01-15T10:05:00Z" }
  ],
  "createdAt": "2025-01-15T10:00:00Z",
  "completedAt": "2025-01-15T10:05:00Z"
}
```

---

#### Cancel Transfer

```http
POST /transfers/:id/cancel
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "txn_abc123",
  "status": "cancelled",
  "refund": {
    "amount": "100.00",
    "currency": "USD",
    "txHash": "6zAb..."
  },
  "cancelledAt": "2025-01-15T12:00:00Z"
}
```

**Errors:**
- `TRANSFER_NOT_CANCELLABLE` - Already claimed or completed

---

### Claims Service

#### Get Claim (Public)

```http
GET /claims/:code
```

**Response:** `200 OK`
```json
{
  "code": "x7Kp2mN9qL4r",
  "status": "pending",
  "sender": {
    "name": "John",
    "avatar": "https://cdn.cash.app/avatars/..."
  },
  "amount": {
    "value": "100.00",
    "currency": "USD",
    "localValue": "5580.00",
    "localCurrency": "PHP"
  },
  "recipientPhone": "+63 *** *** 1234",
  "expiresAt": "2025-01-22T10:00:00Z",
  "expiresIn": 604800
}
```

**Errors:**
- `CLAIM_NOT_FOUND` - Invalid claim code
- `CLAIM_EXPIRED` - Claim has expired

---

#### Request OTP for Claim

```http
POST /claims/:code/otp
```

**Request:**
```json
{
  "channel": "sms"
}
```

**Response:** `200 OK`
```json
{
  "sent": true,
  "phone": "+63 *** *** 1234",
  "expiresIn": 600,
  "attemptsRemaining": 5
}
```

---

#### Verify Claim Ownership

```http
POST /claims/:code/verify
```

**Request:**
```json
{
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "verified": true,
  "claim": {
    "code": "x7Kp2mN9qL4r",
    "status": "verified",
    "amount": {
      "value": "100.00",
      "currency": "USD",
      "localValue": "5580.00",
      "localCurrency": "PHP"
    }
  },
  "cashoutMethods": [
    {
      "method": "gcash",
      "name": "GCash",
      "icon": "https://cdn.cash.app/icons/gcash.png",
      "estimatedTime": "Instant",
      "fee": "0.00"
    },
    {
      "method": "maya",
      "name": "Maya",
      "icon": "https://cdn.cash.app/icons/maya.png",
      "estimatedTime": "Instant",
      "fee": "0.00"
    },
    {
      "method": "bank",
      "name": "Bank Transfer",
      "icon": "https://cdn.cash.app/icons/bank.png",
      "estimatedTime": "1-2 hours",
      "fee": "0.00"
    }
  ],
  "verificationToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `INVALID_OTP` - Wrong code
- `OTP_EXPIRED` - Code has expired
- `MAX_ATTEMPTS` - Account locked

---

#### Process Cash-out

```http
POST /claims/:code/cashout
```

**Headers:**
```http
X-Verification-Token: eyJhbGciOiJIUzI1NiIs...
```

**Request:**
```json
{
  "method": "gcash",
  "account": "09171234567",
  "accountName": "Maria Santos"
}
```

**Response:** `200 OK`
```json
{
  "status": "processing",
  "offramp": {
    "id": "off_abc123",
    "method": "gcash",
    "account": "0917 *** 4567",
    "amount": {
      "value": "5580.00",
      "currency": "PHP"
    },
    "estimatedTime": "Instant",
    "reference": "PING-ABC123"
  }
}
```

**Polling for completion:**
```http
GET /claims/:code/status
```

**Response:** `200 OK`
```json
{
  "status": "completed",
  "offramp": {
    "status": "completed",
    "completedAt": "2025-01-15T10:05:00Z",
    "reference": "PING-ABC123"
  }
}
```

---

### Wallet Service

#### Get Balance

```http
GET /wallet/balance
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "balance": "150.50",
  "currency": "USD",
  "pending": "0.00",
  "available": "150.50",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

#### Get Wallet Address

```http
GET /wallet/address
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "address": "7xKp2mN9qL4rYz...",
  "chain": "solana",
  "qrCode": "data:image/png;base64,...",
  "depositInstructions": "Send USDC on Solana to this address"
}
```

---

#### Get Transaction History

```http
GET /wallet/transactions
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `deposit`, `transfer`, `claim`, `offramp` |
| `limit` | number | Results per page (default: 20) |
| `cursor` | string | Pagination cursor |

**Response:** `200 OK`
```json
{
  "transactions": [
    {
      "id": "wtx_abc123",
      "type": "transfer",
      "direction": "out",
      "amount": "-100.00",
      "currency": "USD",
      "description": "Transfer to Mom",
      "reference": "txn_abc123",
      "createdAt": "2025-01-15T10:00:00Z"
    },
    {
      "id": "wtx_def456",
      "type": "deposit",
      "direction": "in",
      "amount": "+200.00",
      "currency": "USD",
      "description": "USDC Deposit",
      "txHash": "5xYz...",
      "createdAt": "2025-01-14T10:00:00Z"
    }
  ],
  "nextCursor": "eyJvZmZzZXQiOjIwfQ=="
}
```

---

### FX Service

#### Get Exchange Rates

```http
GET /fx/rates
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `base` | string | Base currency (default: USD) |

**Response:** `200 OK`
```json
{
  "base": "USD",
  "rates": {
    "PHP": 55.80,
    "INR": 83.25,
    "PKR": 278.50,
    "KES": 154.00,
    "NGN": 1550.00
  },
  "updatedAt": "2025-01-15T10:00:00Z",
  "validUntil": "2025-01-15T10:01:00Z"
}
```

---

#### Get Quote

```http
POST /fx/quote
```

**Request:**
```json
{
  "amount": "100.00",
  "fromCurrency": "USD",
  "toCurrency": "PHP"
}
```

**Response:** `200 OK`
```json
{
  "quote": {
    "id": "quote_abc123",
    "fromAmount": "100.00",
    "fromCurrency": "USD",
    "toAmount": "5580.00",
    "toCurrency": "PHP",
    "rate": 55.80,
    "fees": {
      "platform": "0.50",
      "fx": "0.00",
      "total": "0.50"
    },
    "validUntil": "2025-01-15T10:05:00Z"
  }
}
```

---

## Webhooks

### Webhook Events

| Event | Description |
|-------|-------------|
| `transfer.created` | Transfer initiated |
| `transfer.confirmed` | Blockchain confirmed |
| `transfer.claimed` | Recipient verified |
| `transfer.completed` | Cash-out complete |
| `transfer.failed` | Transfer failed |
| `transfer.expired` | Claim expired |
| `kyc.submitted` | KYC submitted |
| `kyc.verified` | KYC approved |
| `kyc.rejected` | KYC rejected |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "transfer.completed",
  "createdAt": "2025-01-15T10:05:00Z",
  "data": {
    "transferId": "txn_abc123",
    "status": "completed",
    "amount": "100.00",
    "currency": "USD"
  }
}
```

### Webhook Signature

Verify webhooks using the `X-Ping-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## SDKs

### JavaScript/TypeScript

```bash
npm install @ping/sdk
```

```typescript
import { CashClient } from '@ping/sdk';

const client = new CashClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Create transfer
const transfer = await client.transfers.create({
  recipientPhone: '+639181234567',
  amount: '100.00',
  currency: 'USD'
});
```

### React Native

```bash
npm install @ping/react-native-sdk
```

```typescript
import { CashProvider, useTransfer } from '@ping/react-native-sdk';

function App() {
  return (
    <CashProvider apiKey="your-api-key">
      <TransferScreen />
    </CashProvider>
  );
}

function TransferScreen() {
  const { createTransfer, loading } = useTransfer();

  const handleSend = async () => {
    const transfer = await createTransfer({
      recipientPhone: '+639181234567',
      amount: '100.00'
    });
  };
}
```

---

## API Versioning

The API is versioned via URL path (`/v1/`, `/v2/`). When breaking changes are introduced:

1. New version is released (`/v2/`)
2. Previous version remains available for 12 months
3. Deprecation notices sent via email and dashboard
4. Old version retired after migration period

### Version History

| Version | Status | Released | Sunset |
|---------|--------|----------|--------|
| v1 | Current | 2025-01 | - |

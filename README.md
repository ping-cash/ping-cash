# Cash

**The cheapest way to send money anywhere.**

No app needed to receive. No crypto knowledge required. Fees under 1%.

## The Problem

Sending money across borders is expensive and slow:

| Service | Fee to send $200 | Speed |
|---------|------------------|-------|
| Western Union | $10-15 (5-7%) | 1-3 days |
| Bank wire | $25-50 | 3-5 days |
| PayPal | $6-10 (3-5%) | Instant |
| Wise | $2-4 (1-2%) | Hours |
| **Cash** | **$1-2 (<1%)** | **Seconds** |

300 million migrant workers send $700 billion home every year, losing $40+ billion to fees.

## How We're Different

Others have solved parts of this. We combine the best:

| Feature | WorldRemit | Remitly | Chipper Cash | Cash (Us) |
|---------|------------|---------|--------------|-----------|
| No app to receive | ❌ | ❌ | ❌ | ✅ |
| Stablecoin rails | ❌ | ❌ | ✅ | ✅ |
| Fees under 1% | ❌ | ❌ | ✅ | ✅ |
| Claim via link | ❌ | ❌ | ❌ | ✅ |
| Global (not corridor-locked) | Partial | Partial | Africa only | ✅ |
| B2B API | ❌ | ❌ | ❌ | ✅ (Phase 4) |

**Our position**: Stablecoin economics + no-download UX + global coverage.

## How It Works

### Sending (App Required)

```
1. Open Cash app
2. Select contact from phone
3. Enter amount: $100
4. Tap Send
5. Done - recipient gets WhatsApp notification
```

### Receiving (No App Required)

```
1. Get WhatsApp: "Mom sent you $100. Tap to claim."
2. Open link in browser (no download)
3. Verify phone number (OTP)
4. Choose: GCash / M-Pesa / Bank / Keep in wallet
5. Money arrives in seconds
```

The recipient never needs our app, a crypto wallet, or blockchain knowledge.

## Recipient Claim Flow

```
┌─────────────────────────────────┐
│      You received $100          │
│        from Mom                 │
│                                 │
│   Verify your phone:            │
│   [Enter OTP: ______]           │
└─────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   How do you want your ₱5,580?  │
│                                 │
│   ┌───────────────────────┐     │
│   │ 📱 GCash (Instant)    │     │
│   └───────────────────────┘     │
│   ┌───────────────────────┐     │
│   │ 📱 Maya (Instant)     │     │
│   └───────────────────────┘     │
│   ┌───────────────────────┐     │
│   │ 🏦 Bank (1-2 hours)   │     │
│   └───────────────────────┘     │
│   ┌───────────────────────┐     │
│   │ 💳 Keep in wallet     │     │
│   │    (download app)     │     │
│   └───────────────────────┘     │
└─────────────────────────────────┘
```

## Supported Corridors (Phase 1)

### Send From
- UAE, Saudi Arabia, Kuwait, Qatar, Oman, Bahrain (GCC)
- USA, UK, Europe

### Receive To
- Philippines (GCash, Maya, banks)
- India (Paytm, UPI, banks)
- Pakistan (JazzCash, Easypaisa, banks)
- Kenya (M-Pesa, banks)
- Nigeria (Opay, banks)

*Additional corridors added based on demand.*

## Target Users

### Primary: Migrant Workers in GCC

- 35M+ migrant workers in Gulf countries
- Send $100-500/month home
- Current pain: 5-7% fees to exchange houses
- Our value: <1% fees, instant delivery

### Secondary: Freelancers & Remote Workers

- Getting paid from international clients
- Current pain: PayPal fees, bank delays
- Our value: Fast receipt, cheap cash-out

### Tertiary: Anyone Sending Internationally

- Friends, family, business payments
- Current pain: Complex, expensive options
- Our value: Simple as a text message

## Technology

### Why Stablecoins?

We use USDC/USDT on fast blockchains as invisible infrastructure:

| Benefit | Traditional Rails | Stablecoin Rails |
|---------|-------------------|------------------|
| Speed | Hours to days | Seconds |
| Cost | $5-50 per transfer | $0.001-0.01 |
| Availability | Banking hours | 24/7/365 |
| Coverage | Limited corridors | Global |

**Users never see "crypto"** - they see dollars in, local currency out.

### Stack

| Component | Technology |
|-----------|------------|
| Mobile App | React Native |
| Web Claim Flow | Next.js (PWA) |
| Auth/Wallets | Privy (embedded, MPC) |
| Stablecoins | USDC on Solana (Phase 1) |
| On-ramp | MoonPay, Transak |
| Off-ramp | TransFi (300+ local methods) |
| Notifications | WhatsApp Business API |
| Backend | Node.js, PostgreSQL |

### Security

- **Non-custodial**: Users control funds via MPC wallets
- **No seed phrases**: Privy handles key management invisibly
- **Phone = identity**: Verified via OTP
- **Biometric auth**: FaceID/TouchID for transactions

## Business Model

### Revenue Streams

| Stream | Rate | Example ($200 transfer) |
|--------|------|-------------------------|
| FX spread | 0.5-1% | $1-2 |
| Off-ramp share | 0.3-0.5% | $0.60-1 |
| Float interest | 5% APY on unclaimed | Variable |

### Unit Economics

```
Average transfer:     $200
Revenue:              $1.50 - $2.50
Costs:                $0.15
Gross margin:         90%+
```

### Cost Breakdown

| Cost | Per Transfer |
|------|--------------|
| Blockchain fees | $0.005 |
| Privy transaction | $0.01 |
| WhatsApp message | $0.02 |
| SMS OTP | $0.03 |
| Off-ramp processing | $0.05 |
| **Total** | **~$0.12** |

## Regulatory Approach

### Strategy: Partner, Don't Build

We minimize regulatory burden by not touching fiat directly:

| Function | Who Handles | Their License |
|----------|-------------|---------------|
| Fiat in (cards/bank) | MoonPay/Transak | Money transmitter |
| Fiat out (GCash/bank) | TransFi/local partners | Local payment license |
| Stablecoin custody | Privy (non-custodial) | N/A (user holds keys) |
| **Us** | **Move stablecoins** | **Minimal** |

### KYC Tiers

| Tier | Limit | Requirements |
|------|-------|--------------|
| 0 | Receive only | Phone verification |
| 1 | $500/month | Name + Phone |
| 2 | $5,000/month | ID document |
| 3 | $50,000/month | Full KYC + address |

### Compliance

- AML screening on all transfers
- Transaction monitoring for suspicious patterns
- Sanctions list checking
- Record keeping (5+ years)

## Roadmap

### Phase 1: MVP (Current)
- [ ] Mobile app (iOS + Android)
- [ ] Phone-based wallet (Privy)
- [ ] USDC transfers on Solana
- [ ] Web claim flow
- [ ] WhatsApp notifications
- [ ] GCash off-ramp (Philippines)
- [ ] Basic KYC (Persona)

### Phase 2: Expansion
- [ ] Multi-chain routing (TRON, Base)
- [ ] More off-ramps (M-Pesa, Paytm, UPI)
- [ ] Multi-currency (AED, SAR, GBP, EUR)
- [ ] Recurring transfers
- [ ] Transaction history

### Phase 3: Growth
- [ ] Referral program
- [ ] Bill splitting
- [ ] WhatsApp Mini App
- [ ] Bank off-ramps (50+ countries)

### Phase 4: Platform
- [ ] B2B API for developers
- [ ] Merchant payments
- [ ] Virtual debit card
- [ ] Savings/yield features

## Market Opportunity

| Metric | Value |
|--------|-------|
| Global remittance market | $700B/year |
| Average fees | 6.2% |
| Total fees paid | $43B/year |
| GCC→South Asia corridor | $80B/year |
| Our target (1% of fees) | $430M opportunity |

## Growth Strategy

### Viral Loop

```
Sender (has app)
    │
    └──sends──▶ Recipient (no app)
                    │
                    └──claims via web
                           │
                           └──sees "Download to send"
                                  │
                                  └──becomes sender
                                         │
                                         └──sends to new recipient...
```

**Every transfer is a potential new user with zero friction to receive.**

### Go-to-Market

1. **GCC → Philippines corridor** - Largest, most underserved
2. **Community ambassadors** - Filipino/Indian worker communities
3. **Content marketing** - "How I save $50/month on remittances"
4. **Referral bonuses** - $5 for both sender and recipient

## Competitive Landscape

| Company | Strengths | Weaknesses | Our Advantage |
|---------|-----------|------------|---------------|
| Western Union | Brand, cash pickup | Expensive, slow | 10x cheaper |
| Wise | Transparent pricing | Still 1-2% fees | Cheaper, instant |
| Remitly | Good mobile UX | Need accounts both ends | No app to receive |
| WorldRemit | Mobile money payouts | Traditional rails | Faster, cheaper |
| Chipper Cash | Stablecoin-powered | Africa only | Global |

## Why Now?

1. **Stablecoins are mainstream** - $150B+ market cap, proven at scale
2. **Account Abstraction works** - Gasless, seedless wallets are production-ready
3. **Off-ramp infrastructure exists** - TransFi, Transak have built the hard parts
4. **Regulatory clarity** - Stablecoin frameworks emerging globally
5. **WhatsApp Business API** - 2B users, trusted notification channel

## Team

*[To be added]*

## Contact

*[To be added]*

---

**Cash** - Because sending money shouldn't cost more than the message.

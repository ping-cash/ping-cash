# User Journeys & Transfer Flows

## Overview

This document illustrates the sender and receiver journeys for different transfer scenarios, showing the optimal routing based on recipient capabilities.

---

## Route Selection Logic

```mermaid
flowchart TD
    Start([Sender initiates transfer]) --> CheckRecipient{Recipient on Cash?}

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
    CheckCoins -->|No| ClaimLink[Claim Link<br/>Ask to create Coins.ph<br/>or TransFi 1%]

    FreeTransfer --> Done([Complete])
    PHPCDirect --> Done
    KotaniPay --> Done
    Bitso --> Done
    TransFiIndia --> Done
    TransFiOther --> Done
    TransFiPH --> Done
    ClaimLink --> Done

    style FreeTransfer fill:#00ff00,color:#000
    style PHPCDirect fill:#90EE90,color:#000
    style Bitso fill:#ffff00,color:#000
    style KotaniPay fill:#ffff00,color:#000
    style TransFiIndia fill:#ffcc00,color:#000
    style TransFiOther fill:#ffcc00,color:#000
    style TransFiPH fill:#ffcc00,color:#000
```

---

## Fee Comparison

```mermaid
flowchart LR
    subgraph Send["$200 SENT"]
        A[Sender: $200]
    end

    subgraph Routes["ROUTES"]
        B1[In-Network]
        B2[PHPC Direct]
        B3[USDC to Coins.ph]
        B4[TransFi to GCash]
        B5[Western Union]
    end

    subgraph Receive["RECEIVED"]
        C1[/$200<br/>FREE/]
        C2[/$199.80<br/>0.1% fee/]
        C3[/$199<br/>0.5% fee/]
        C4[/$198<br/>1% fee/]
        C5[/$188<br/>6% fee/]
    end

    A --> B1 --> C1
    A --> B2 --> C2
    A --> B3 --> C3
    A --> B4 --> C4
    A --> B5 --> C5

    style C1 fill:#00ff00,color:#000
    style C2 fill:#90EE90,color:#000
    style C3 fill:#ffff00,color:#000
    style C4 fill:#ffcc00,color:#000
    style C5 fill:#ff6666,color:#000
```

---

## Journey 1: PHPC Direct - Best Case (Philippines, 0.1% fee)

The optimal path when recipient has or creates a Coins.ph account.

```mermaid
sequenceDiagram
    autonumber
    participant S as Sender (Dubai)
    participant App as Cash App
    participant CW as Cash Wallet (Solana)
    participant DEX as DEX (Jupiter/Uniswap)
    participant PH as PHPC (Polygon)
    participant CP as Coins.ph
    participant R as Recipient (Philippines)
    participant GC as GCash

    Note over S,GC: SENDER JOURNEY

    S->>App: Open app, enter recipient phone +63...
    S->>App: Enter amount: $200
    App->>App: Detect country: Philippines
    App->>App: Best route: PHPC direct (0.1% fee)
    S->>App: Confirm send

    App->>CW: Deduct 200 USDC
    CW->>DEX: Swap USDC to PHPC
    DEX-->>CW: Return ~11,180 PHPC (PHP)
    Note right of DEX: 0.1% swap fee

    CW->>PH: Send PHPC to recipient Coins.ph
    PH->>CP: PHPC arrives in Coins.ph wallet

    App->>App: Generate claim link
    App->>R: Send WhatsApp: You received P11,180 from Ahmed

    Note over S,GC: RECEIVER JOURNEY

    R->>R: Receive WhatsApp notification
    R->>CP: Click link, Opens Coins.ph
    CP->>R: Show balance: P11,180 PHPC

    alt Keep in Coins.ph
        R->>CP: Use for bills, load, transfers
    else Withdraw to GCash
        R->>CP: Tap Withdraw to GCash
        CP->>GC: Transfer PHP (FREE)
        GC->>R: P11,180 available in GCash
    else Withdraw to Bank
        R->>CP: Tap Withdraw to Bank
        CP->>R: P11,165 (P15 bank fee)
    end

    Note over S,GC: Total fee: ~0.1% ($0.20 on $200)
```

---

## Journey 2: USDC Direct to Coins.ph (0.5% fee)

When PHPC swap is not available, send USDC directly.

```mermaid
sequenceDiagram
    autonumber
    participant S as Sender (Dubai)
    participant App as Cash App
    participant CW as Cash Wallet (Solana)
    participant CP as Coins.ph
    participant R as Recipient (Philippines)
    participant GC as GCash

    Note over S,GC: SENDER JOURNEY

    S->>App: Open app, enter recipient phone
    S->>App: Enter amount: $200
    App->>App: Recipient has Coins.ph
    App->>App: Route: USDC direct (0.5% fee)
    S->>App: Confirm send

    App->>CW: Deduct 200 USDC
    CW->>CP: Send USDC to recipient Coins.ph address

    App->>R: Send WhatsApp: You received $200 from Ahmed

    Note over S,GC: RECEIVER JOURNEY

    R->>R: Receive WhatsApp notification
    R->>CP: Open Coins.ph app
    CP->>R: Show balance: 200 USDC

    R->>CP: Tap Convert to PHP
    CP->>CP: Swap USDC to PHP
    Note right of CP: 0.5% conversion fee
    CP->>R: Show balance: P11,124

    alt Keep in Coins.ph
        R->>CP: Use PHP balance
    else Withdraw to GCash
        R->>CP: Withdraw to GCash (FREE)
        CP->>GC: Transfer PHP
        GC->>R: P11,124 in GCash
    end

    Note over S,GC: Total fee: ~0.5% ($1 on $200)
```

---

## Journey 3: Claim Link - No App Receiver (TransFi, 1% fee)

For recipients without Cash app or Coins.ph - fully app-less experience.

```mermaid
sequenceDiagram
    autonumber
    participant S as Sender (Dubai)
    participant App as Cash App
    participant CW as Cash Wallet (Solana)
    participant TF as TransFi
    participant R as Recipient (Philippines)
    participant WA as WhatsApp
    participant Web as Claim Web Page
    participant GC as GCash

    Note over S,GC: SENDER JOURNEY

    S->>App: Open app, enter phone +63917...
    S->>App: Enter amount: $200
    App->>App: Recipient not on Cash or Coins.ph
    App->>App: Route: Claim link via TransFi (1% fee)
    S->>App: Confirm send

    App->>CW: Reserve 200 USDC
    App->>App: Generate unique claim link + OTP
    App->>WA: Send to recipient via WhatsApp
    WA->>R: Ahmed sent you $200! Click to claim: cash.app/claim/abc123

    Note over S,GC: RECEIVER JOURNEY (NO APP NEEDED)

    R->>WA: See message, click link
    WA->>Web: Open claim page in browser
    Web->>R: Enter OTP sent to your phone
    Web->>R: SMS OTP: 847291
    R->>Web: Enter OTP: 847291
    Web->>Web: Verify OTP

    Web->>R: Choose how to receive:
    Note right of Web: GCash, Maya, Bank, Cash Pickup
    R->>Web: Select GCash
    R->>Web: Enter GCash number: 0917-xxx-xxxx
    R->>Web: Confirm

    Web->>CW: Release 200 USDC
    CW->>TF: Send USDC + payout instructions
    TF->>TF: Convert USDC to PHP
    Note right of TF: 1% TransFi fee
    TF->>GC: Disburse P11,068 to GCash
    GC->>R: Push notification: You received P11,068

    Web->>R: Done! Money sent to your GCash

    Note over S,GC: Total fee: ~1% ($2 on $200)
```

---

## Journey 4: In-Network Transfer (FREE)

Both sender and recipient have Cash app - zero fees.

```mermaid
sequenceDiagram
    autonumber
    participant S as Sender (Dubai)
    participant SApp as Sender Cash App
    participant SW as Sender Wallet (USDC)
    participant RW as Recipient Wallet (USDC)
    participant RApp as Recipient Cash App
    participant R as Recipient (Philippines)

    Note over S,R: BOTH USERS HAVE CASH APP - FREE TRANSFER

    S->>SApp: Open app, select recipient (contact)
    SApp->>SApp: Detect: Recipient has Cash wallet
    SApp->>S: FREE transfer - both on Cash!
    S->>SApp: Enter amount: $200
    S->>SApp: Confirm send

    SApp->>SW: Deduct 200 USDC
    SW->>RW: Transfer 200 USDC (Solana)
    Note right of SW: Fee: $0.001 (network only)

    RW->>RApp: Update balance
    RApp->>R: Push notification: Ahmed sent you $200

    R->>RApp: Open app
    RApp->>R: Show balance: 200 USDC ($200)

    alt Keep as USDC
        R->>RApp: Hold for later (earning potential)
    else Cash out when needed
        R->>RApp: Tap Cash out
        RApp->>R: Select: Coins.ph, GCash, Bank...
        Note right of RApp: Cash out fee: 0.1-1%
    end

    Note over S,R: Transfer fee: $0 (FREE)
    Note over S,R: Cash out only when recipient needs fiat
```

---

## Journey 5: Full Architecture Overview

```mermaid
flowchart TD
    subgraph Sender["SENDER (Dubai)"]
        S1[Open Cash App]
        S2[Enter recipient phone]
        S3[Enter amount]
        S4[Confirm and Send]
    end

    subgraph Routing["SMART ROUTING"]
        R1{Recipient has Cash?}
        R2{Recipient has Coins.ph?}
        R3{PHPC available?}
        R4[TransFi Fallback]
    end

    subgraph Paths["TRANSFER PATHS"]
        P1[In-Network USDC<br/>FREE]
        P2[PHPC Direct<br/>0.1% fee]
        P3[USDC to Coins.ph<br/>0.5% fee]
        P4[Claim Link<br/>1% fee]
    end

    subgraph Recipient["RECIPIENT (Philippines)"]
        RC1[Receives in Cash App]
        RC2[Receives in Coins.ph]
        RC3[Claims via Web]
        RC4[Money in GCash/Maya/Bank]
    end

    S1 --> S2 --> S3 --> S4
    S4 --> R1

    R1 -->|Yes| P1
    R1 -->|No| R2

    R2 -->|Yes| R3
    R2 -->|No| P4

    R3 -->|Yes| P2
    R3 -->|No| P3

    P1 --> RC1
    P2 --> RC2
    P3 --> RC2
    P4 --> RC3

    RC1 -.->|Cash out when needed| RC4
    RC2 -.->|Withdraw FREE| RC4
    RC3 --> RC4

    style P1 fill:#00ff00,color:#000
    style P2 fill:#90EE90,color:#000
    style P3 fill:#ffff00,color:#000
    style P4 fill:#ffcccc,color:#000
```

---

## Recipient Claim Flow State Machine

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

    SelectMethod --> GCash: Select GCash
    SelectMethod --> Maya: Select Maya
    SelectMethod --> Bank: Select Bank
    SelectMethod --> CashPickup: Select Cash Pickup
    SelectMethod --> DownloadApp: Get Cash App for FREE transfers

    GCash --> EnterDetails: Enter GCash number
    Maya --> EnterDetails: Enter Maya number
    Bank --> EnterDetails: Enter account details
    CashPickup --> EnterDetails: Select location

    EnterDetails --> Confirm: Review and Confirm
    Confirm --> Processing: Processing...

    Processing --> Success: Money sent!
    Success --> [*]

    DownloadApp --> AppStore: Download Cash
    AppStore --> CreateAccount: Sign up
    CreateAccount --> ReceiveFree: Future transfers FREE
```

---

## Multi-Country Routing

```mermaid
flowchart TD
    subgraph Input["SENDER INPUT"]
        Phone[Recipient Phone Number]
    end

    subgraph Detection["COUNTRY DETECTION"]
        Parse[Parse country code]
        PH["+63 = Philippines"]
        KE["+254 = Kenya"]
        IN["+91 = India"]
        MX["+52 = Mexico"]
        NG["+234 = Nigeria"]
    end

    subgraph PHRoutes["PHILIPPINES ROUTES"]
        PH1[PHPC to Coins.ph<br/>0.1%]
        PH2[USDC to Coins.ph<br/>0.5%]
        PH3[TransFi to GCash<br/>1%]
    end

    subgraph KERoutes["KENYA ROUTES"]
        KE1[Kotani Pay to M-Pesa<br/>0.75%]
        KE2[Yellow Card to M-Pesa<br/>1%]
    end

    subgraph INRoutes["INDIA ROUTES"]
        IN1[TransFi to UPI<br/>1%]
    end

    subgraph MXRoutes["MEXICO ROUTES"]
        MX1[USDC to Bitso<br/>0.5%]
        MX2[TransFi to Bank<br/>1%]
    end

    subgraph NGRoutes["NIGERIA ROUTES"]
        NG1[Yellow Card to Bank<br/>1%]
    end

    Phone --> Parse
    Parse --> PH
    Parse --> KE
    Parse --> IN
    Parse --> MX
    Parse --> NG

    PH --> PH1
    PH --> PH2
    PH --> PH3

    KE --> KE1
    KE --> KE2

    IN --> IN1

    MX --> MX1
    MX --> MX2

    NG --> NG1

    style PH1 fill:#00ff00,color:#000
    style MX1 fill:#90EE90,color:#000
    style KE1 fill:#ffff00,color:#000
```

---

## Cash-Out Options by Country

```mermaid
flowchart LR
    subgraph PH["PHILIPPINES"]
        PH_IN[PHPC/USDC] --> PH_CP[Coins.ph]
        PH_CP --> PH_GC[GCash]
        PH_CP --> PH_MY[Maya]
        PH_CP --> PH_BK[Bank]
    end

    subgraph KE["KENYA"]
        KE_IN[USDC] --> KE_KP[Kotani Pay]
        KE_KP --> KE_MP[M-Pesa]
        KE_KP --> KE_AM[Airtel Money]
        KE_KP --> KE_BK[Bank]
    end

    subgraph MX["MEXICO"]
        MX_IN[USDC] --> MX_BT[Bitso]
        MX_BT --> MX_SP[SPEI - Any Bank]
        MX_BT --> MX_OX[OXXO Cash]
    end

    subgraph IN["INDIA"]
        IN_IN[USDC] --> IN_TF[TransFi]
        IN_TF --> IN_UP[UPI]
        IN_TF --> IN_BK[Bank]
    end

    style PH_GC fill:#00ff00,color:#000
    style KE_MP fill:#00ff00,color:#000
    style MX_SP fill:#00ff00,color:#000
    style IN_UP fill:#00ff00,color:#000
```

---

## Summary Table

| Journey | Recipient Has | Route | Fee | Speed |
|---------|---------------|-------|-----|-------|
| 1. PHPC Direct | Coins.ph | USDC → PHPC → Coins.ph | 0.1% | Instant |
| 2. USDC Direct | Coins.ph | USDC → Coins.ph | 0.5% | Instant |
| 3. Claim Link | Nothing | USDC → TransFi → GCash | 1% | Instant |
| 4. In-Network | Cash App | USDC → USDC | FREE | Instant |

---

## Network Effect Visualization

```mermaid
flowchart TD
    subgraph Wave1["WAVE 1: Senders"]
        W1A[Worker downloads Cash]
        W1B[Sends via claim link]
    end

    subgraph Wave2["WAVE 2: Recipients"]
        W2A[Family receives claim link]
        W2B[Claims money]
        W2C[Sees: Download app for FREE next time]
    end

    subgraph Wave3["WAVE 3: Viral Growth"]
        W3A[Family downloads Cash]
        W3B[Tells friends abroad]
        W3C[Friends download Cash]
    end

    subgraph Wave4["WAVE 4: Network Effect"]
        W4A[More in-network transfers]
        W4B[Everyone saves money]
        W4C[Zero fees become normal]
    end

    W1A --> W1B --> W2A --> W2B --> W2C
    W2C --> W3A --> W3B --> W3C
    W3C --> W4A --> W4B --> W4C
    W4C -.->|Cycle repeats| W1A

    style W4C fill:#00ff00,color:#000
```

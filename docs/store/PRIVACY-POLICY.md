# Privacy Policy — Ping mobile app (DRAFT)

**WHAT:** Privacy policy text suitable for publication at `https://ping.cash/privacy`.
**STATUS:** DRAFT — founder + legal must review before publication.
**Refs:** #85

---

## Privacy Policy

**Effective date:** _(set on publication)_

Ping ("we", "our", "us") operates the Ping mobile app and the ping.cash website. This Privacy Policy explains what information we collect, how we use it, and the choices you have.

### 1. Information we collect

- **Phone number** — used as your account identifier. We hash phone numbers with SHA-256 before storing them.
- **Wallet address** — your Solana wallet address. Created via Privy's MPC threshold-signature service; we never have unilateral control over your wallet.
- **Transaction metadata** — recipient phone (hashed), amount, status, timestamp. Stored in our transfer database; correlated to your account by phone hash.
- **Device information** — model, OS version, and an Expo Push token (if you grant notification permission). Used only to deliver in-app alerts.
- **Optional: name, email** — if you choose to add them in your profile.

### 2. What we do NOT collect

- **No KYC PII for small transfers** — we do not require government ID or address for transfers under $1,000/month.
- **No private keys** — your wallet's keys are split across your device + Privy + an offline shard; we never hold a private key or seed phrase.
- **No location tracking, no contact-list upload** — when you tap "Pick from contacts", the contact-picker runs locally on your device and only the phone number you select is sent to our backend.
- **No advertising IDs, no cross-app tracking**.

### 3. How we use the information

- To process money transfers + verify identity at the level KYC tier requires.
- To deliver in-app push notifications about your transfers.
- To detect fraud + comply with sanctions screening (OFAC, UN, EU lists).
- To debug + improve the service.

We do NOT sell your information to advertisers, data brokers, or any third party.

### 4. Third-party services

- **Privy** (privy.io) — Solana MPC wallet provider. Holds one of three threshold shards.
- **Twilio** (twilio.com) — sends the 6-digit verification code via SMS.
- **TransFi** (transfi.com) — settles fiat to local bank rails (PHP, INR, KES, etc.).
- **Stripe** (stripe.com) — processes Apple Pay + card + ACH funding (when enabled).
- **MoonPay** (moonpay.com) — crypto on-ramp (when enabled).
- **Solana RPC providers** — broadcast USDC transfers to the Solana network.

Each third party operates under its own privacy policy. We share only the minimum data required (e.g., your phone for Twilio, your wallet for Solana RPC).

### 5. Sanctions + compliance screening

We run every transfer through OFAC Specially Designated Nationals (SDN) list checks before broadcasting. We do this with a self-built screener that downloads the public Treasury SDN feed every 4 hours and checks the recipient address against the cached list. Hits are blocked and reported to law enforcement as required by US 31 CFR § 501.603.

### 6. Data retention

- **Active accounts:** transaction metadata retained for 7 years per AML record-keeping rules.
- **Closed accounts:** retained 5 years post-closure, then deleted.
- **Wallet addresses:** retained indefinitely on the Solana blockchain (we can't delete what's on-chain).

### 7. Your rights

You can:

- Request a copy of your data — email `privacy@ping.cash`.
- Request deletion of off-chain data — email `privacy@ping.cash`. On-chain transactions are immutable.
- Close your account — Profile → Sign out → delete the app.

For EU residents: you have the right to lodge a complaint with your local data protection authority. Your right to data portability is honored via the data-copy request above.

### 8. Children's privacy

Ping is not directed at children under 13. We do not knowingly collect data from anyone under 13. If you believe a child has provided us data, email `privacy@ping.cash` and we will delete it.

### 9. Contact

Email: `privacy@ping.cash`
Mailing address: _(operator to fill on publication — Turkey, Wyoming, or Oman entity per ADR 0014)_

### 10. Changes to this policy

We will notify you of material changes via in-app notification at least 14 days before they take effect. Continued use of Ping after the effective date constitutes acceptance.

---

## Founder action

Before App Store submission:

1. Legal review (1-2 hr w/ outside counsel preferred for the AML language in § 6).
2. Fill the mailing address in § 9.
3. Set the effective date.
4. Publish at `https://ping.cash/privacy` (mirror this doc).
5. Confirm `https://ping.cash/help` exists (footer link in STORE-LISTING.md).

See [SUBMISSION-CHECKLIST.md](SUBMISSION-CHECKLIST.md) for the full pre-submission gate.

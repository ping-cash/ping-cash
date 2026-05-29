# App Store + Play Store submission checklist

**WHAT:** Pre-flight gate for Ping mobile submission.
**Refs:** #85

---

## What's READY (worker-shipped engineering)

| Item                                       | Status                                                   | Where                            |
| ------------------------------------------ | -------------------------------------------------------- | -------------------------------- |
| App binary (iOS)                           | ✓ Building on every push via `.github/workflows/ios.yml` | TestFlight Founders group        |
| App binary (Android)                       | TODO — Expo EAS Submit not yet wired                     | follow-up workflow               |
| Bundle ID + App shell on App Store Connect | ✓ `cash.ping.app` registered                             | bootstrap-asc.yml ran once       |
| Listing copy                               | ✓ [STORE-LISTING.md](STORE-LISTING.md)                   | docs/store/                      |
| Privacy policy text                        | ✓ DRAFT — [PRIVACY-POLICY.md](PRIVACY-POLICY.md)         | docs/store/                      |
| Screenshots (3 of 5 slots)                 | ✓ Auto-captured by Maestro per CI run                    | iOS `maestro-results` artifact   |
| Crash reporting                            | ✓ TestFlight crash reports + dSYM upload                 | asc-fetch-crashes.yml            |
| OFAC sanctions screening                   | ✓ #75 live on cluster                                    | compliance-service:/screen/:addr |
| Sandbox cash-in flows                      | ✓ Stripe + MoonPay sandbox URLs wired                    | cashin.tsx                       |

## What's BLOCKED on founder action

| Item                                  | What                                                                                                                                 | Who                | Time   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------ |
| Apple Developer Program enrollment    | Already complete (we have a Team ID + p8 key from yesterday's TestFlight work)                                                       | —                  | ✓ done |
| Google Play Console developer account | Sign up with dev@ping.cash + $25 one-time fee                                                                                        | founder            | 15 min |
| Privacy policy review                 | Legal review of [PRIVACY-POLICY.md](PRIVACY-POLICY.md) — esp. AML retention language in §6                                           | founder + counsel  | 1-2 hr |
| Privacy policy publication URL        | Mirror docs/store/PRIVACY-POLICY.md at ping.cash/privacy + ping.cash/terms + ping.cash/help                                          | founder (web team) | 30 min |
| Mailing address for privacy contact   | Fill PRIVACY-POLICY.md §9 with the actual entity address (Turkey, Wyoming, or Oman per ADR 0014)                                     | founder            | 5 min  |
| Apple Tax + Banking info              | Set up paid-app banking in App Store Connect even though Ping is free (Apple requires for in-app purchase eligibility down the road) | founder            | 30 min |
| Apple Export Compliance               | Annual self-classification — Ping uses standard encryption (HTTPS + Solana ed25519); pick "Uses encryption included in iOS"          | founder            | 5 min  |
| App Privacy questionnaire             | Apple's "Data Used to Track You" — answer NO across the board (we don't track)                                                       | founder            | 10 min |
| Age rating questionnaire              | IARC short-form per platform — no mature content, no MFI, no lottery, financial product YES                                          | founder            | 10 min |

## What's BLOCKED on screenshots in the 4-5 slots

When iOS Build 39+ lands Maestro 00-all (signin → tabs → send), pull these from the `maestro-results` artifact:

- `01-landing.png` — landing with brand mark + Create account CTA
- `04-home.png` — home dashboard with balance + activity tiles
- `05-history.png` — activity tab
- `06-vault.png` — earn tab
- `08-send-empty.png` — send modal with jumbo amount entry

Founder selects highest-quality variants + uploads via App Store Connect Media Manager. No engineering action needed once Maestro 00-all is green.

## What's BLOCKED on review-cycle external

| Item                                              | Time                                               |
| ------------------------------------------------- | -------------------------------------------------- |
| Apple review queue                                | 24-48 hr typical; can be 4-7 days for finance apps |
| Google Play review queue                          | 1-3 hr typical for new apps                        |
| Apple "rejection-likely" flags we should pre-empt | (see below)                                        |

### Apple rejection-likely flags to pre-empt

1. **Guideline 5.1.1 Data Collection and Storage** — privacy policy must enumerate every third-party SDK. Done in PRIVACY-POLICY.md §4.
2. **Guideline 1.4.1 Safety / Physical Harm** — financial apps must not encourage risky behavior. Our positioning is "send money to family" — green.
3. **Guideline 3.1.1 In-App Purchase** — we charge a 0.4% fee on transfers. This is NOT subject to Apple's 30% cut because it's "real-world goods" (P2P money transfer), not digital content. See exemption in 3.1.5(a). Confirm in submission notes.
4. **Guideline 4.5.4 Push Notifications** — we use push for transactional alerts only ("your $50 was claimed"). No marketing pushes. Confirm in submission notes.
5. **Guideline 5.6 Developer Identity** — verify Apple Developer team name on the binary matches "HATICE YILDIZ BAYSAL" (already done via fastlane cert).

### Google Play rejection-likely flags to pre-empt

1. **Financial Services policy** — financial apps must be licensed in the markets they operate. Ping operates in TR/PH/IN/KE/PK/BD via partner local payout providers (TransFi handles the MTL licensing on their side). Confirm the partner-provider model in submission notes.
2. **Restricted content** — no gambling, no real-money trading. Confirm.
3. **Permissions sensitivity** — we ask for contacts permission (for the picker). Justify in the Data Safety section.

## Submission sequence (recommended)

1. Apple — TestFlight beta closes when founder marks Build N "ready for review", then submission ID is granted. Aim for Build 50+ once #74 treasury auto-fund lands so the demo wallet has USDC.
2. Google — independent submission via Expo EAS Submit. Same binary lineage.
3. Both reviews can run in parallel.

---

## Open from-engineering follow-ups

- [ ] Wire Expo EAS Submit for Android (mirror ios.yml but `eas submit -p android`)
- [ ] Maestro 00-all green on iOS Build 39+ (in flight — depends on 86433aa testID + scroll fix)
- [ ] App icon final variants (1024×1024 + 1242×186 + 512×512) — current `apps/mobile/assets/icon.png` is OK but Apple wants higher-density master
- [ ] Splash screen — current splash.png renders cleanly; no action

When all gating items above are green, submission day is a 1-hour click-through in App Store Connect + Play Console.

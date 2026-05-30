# Corridor Facts — TransFi, PHPC, Coins.ph (2026-05-30)

**Authority:** Single research pass commissioned by founder request "go and do deep
investigation and bring me only the factual information." This document captures
verified facts only — anything unverified is marked UNVERIFIED.

**Audience:** Ping architecture decision-makers (ADR 0022, ADR 0005, ADR 0001).

---

## TransFi — supported output tokens (verified)

Sources: `transfi.com/supported-cryptocurrencies`, `ramp-docs.transfi.com`,
blog posts on Solana/Oman/PH/ID.

| Token | TransFi sells                    | Solana mint exists                                   | FX margin (USD-pegged sender) |
| ----- | -------------------------------- | ---------------------------------------------------- | ----------------------------- |
| USDC  | YES (explicit, named for Solana) | YES `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`   | 0% (card margin only)         |
| USDT  | YES                              | YES `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`   | 0% (card margin only)         |
| PYUSD | YES                              | YES `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo`   | 0% (card margin only)         |
| USDe  | YES                              | YES (Aug 2024 launch; mint needs Ethena cross-check) | 0% (card margin only)         |
| EURC  | YES                              | YES (mint not captured)                              | ~3-4% (OMR→EUR FX)            |
| PHPC  | NOT listed                       | NOT live on Solana (see below)                       | n/a                           |
| TRYB  | NOT listed on TransFi            | YES on Solana (BiLira)                               | n/a (TransFi can't deliver)   |
| IDRX  | NOT listed                       | NOT live on Solana (Base + Polygon only)             | n/a                           |
| MXNT  | NOT listed                       | NOT live on Solana (Ethereum/Tron/Polygon)           | n/a                           |
| BRZ   | NOT listed on TransFi            | YES `FtgGSFADXBtroxq8VCausXRr2of47QBf5AS1NtZCu4GD`   | n/a                           |

**Founder's direct question answered:**
TransFi sells **USDC, USDT, PYUSD, USDe** at card-margin only for USD-pegged
fiat senders (OMR, AED, SAR, UAE Dirham all USD-pegged). EURC adds ~3-4% FX
because OMR→EUR is real currency conversion. Everything else either isn't
sold by TransFi or doesn't exist on Solana.

---

## TransFi — geographic coverage (CRITICAL FINDING)

| Country       | TransFi marketing/blog claim                                    | TransFi docs 69-country list        | Status                            |
| ------------- | --------------------------------------------------------------- | ----------------------------------- | --------------------------------- |
| Oman (OMR)    | Blog says "live in Oman, will soon cover local payment methods" | NOT in list                         | UNVERIFIED — rails not enumerated |
| UAE (AED)     | AED acceptance blog                                             | NOT in list                         | UNVERIFIED                        |
| KSA (SAR)     | not mentioned                                                   | NOT in list                         | UNVERIFIED                        |
| Egypt         | Fawry blog                                                      | UNVERIFIED in 69-country list       | UNVERIFIED                        |
| Philippines   | yes                                                             | YES                                 | VERIFIED                          |
| India         | APAC tile                                                       | NOT in list (contradicts marketing) | CONTRADICTED                      |
| Pakistan      | yes                                                             | YES                                 | VERIFIED                          |
| Indonesia     | yes                                                             | YES                                 | VERIFIED                          |
| Turkey        | IBAN blog                                                       | UNVERIFIED in 69-country list       | UNVERIFIED                        |
| United States | yes                                                             | YES                                 | VERIFIED                          |
| Europe (SEPA) | yes                                                             | YES                                 | VERIFIED                          |

**Implication for ADR 0022:** the fee table in §"Coverage at launch" cites
AE/KSA/EG/IN at 1-2% on the strength of marketing pages. Those countries
do NOT appear in TransFi's documented supported-countries list. ADR 0022
should be amended with explicit "UNVERIFIED — sales touch required" notes
on those rows. Per `feedback_no_workarounds_ever` memory, this is the
right time to verify, not assume.

---

## PHPC (Philippine Peso Coin) — verified facts

- **Issuer:** Coins.ph (BSP-licensed VASP + EMI, BSP regulatory sandbox).
- **Live chains today:** Ronin (ERC-20), Polygon.
- **DEX presence:** Stabull DEX on Polygon (TVL ~$180k across all PHPC pools).
  Katana (Ronin DEX) hosts PHPC.
- **Solana deployment:** Wei Zhou (Coins.ph CEO) publicly announced Sept 21
  2024 at Solana Breakpoint to launch PHPC on Solana "next quarter" with
  USDC/PHPC, USDT/PHPC, EURC/PHPC pools. **As of 2026-05-30, no Solana mint
  address is published.** No source (CoinGecko PHPC page, BitPinas, Solana
  Compass, Stabull, Coins.ph blog) confirms the Solana mainnet launch
  occurred. Mid-2025 Coins.ph announcement pivoted to Circle's Arc testnet
  for cross-chain expansion — NOT a Solana mainnet step.
- **Architectural implication:** PHPC routing for Ping is not feasible
  today. Any "OMR → PHPC → PH GCash" path requires (a) TransFi to sell PHPC
  (they don't), (b) cross-chain bridge from Polygon to Solana with thin
  liquidity, or (c) waiting on Coins.ph Solana mainnet ship.

---

## Coins.ph — verified facts

- **Public REST API:** `docs.coins.ph/rest-api/`
- **Auth model:** `X-COINS-APIKEY` header + HMAC SHA256 signature + timestamp.
- **Trading pairs (verified in docs):** BTCPHP, BTCUSDT, ETHUSDT, BCHUSDT,
  BCHBUSD, LTCBTC, **USDCPHP**.
- **Cash-out channels (verified):** INSTAPAY, SWIFTPAY_PESONET, GCash,
  bank transfers via `/openapi/fiat/v1/support-channel`.
- **Fee structure:** Schema documented, exact rates require live API call
  or Coins.ph for Business sales touch. UNVERIFIED in public docs.
- **Sandbox without KYB:** UNVERIFIED. REST API docs don't advertise a
  sandbox env. Practice implies KYB required for production keys.
- **PHPC redemption via API:** UNVERIFIED in REST API docs. Exposed in the
  consumer Coins.ph app per their help center; partner API path not stated.

**Architectural implication:** Coins.ph direct API integration is the
cheapest verified PH off-ramp path (USDC→PHP at the Coins.ph spot order
book + GCash settlement). Requires KYB. Probably 0.5-1.5% all-in based on
industry refs, but no published Coins.ph number.

---

## Live Solana stablecoins (verified)

| Symbol | Issuer       | Mint address (verified)                                                             | Liquidity status                                               |
| ------ | ------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| USDC   | Circle       | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`                                      | Deepest stablecoin on Solana                                   |
| USDT   | Tether       | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`                                      | Top-3 Solana stablecoin                                        |
| PYUSD  | Paxos/PayPal | `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo`                                      | > $300M minted by Jul 2024                                     |
| EURC   | Circle       | UNVERIFIED — pull from circle.com/eurc                                              | smaller than USDC                                              |
| USDe   | Ethena       | candidate `EwMhRfzigBdVrCofGDYzqL8mhLVymfiMV9nXqCS91KyD` (needs Ethena cross-check) | $560M+ in first 5 days; integrated with Drift/Kamino/Orca/Jito |
| BRZ    | Transfero    | `FtgGSFADXBtroxq8VCausXRr2of47QBf5AS1NtZCu4GD`                                      | $200M+ monthly across 16 chains                                |
| TRYB   | BiLira       | UNVERIFIED — not captured                                                           | mainly institutional settlement                                |

---

## Stablecoins for target corridors — what does/doesn't exist

| Currency           | Pegged stablecoin exists                | On Solana                                | Sold by TransFi |
| ------------------ | --------------------------------------- | ---------------------------------------- | --------------- |
| INR (India)        | NO                                      | NO                                       | n/a             |
| PKR (Pakistan)     | NO                                      | NO                                       | n/a             |
| AED (UAE)          | NO verified                             | NO                                       | n/a             |
| SAR (Saudi Arabia) | NO (SAMA framework Q4 2025 unpublished) | NO                                       | n/a             |
| OMR (Oman)         | NO                                      | NO                                       | n/a             |
| EGP (Egypt)        | NO verified                             | NO                                       | n/a             |
| PHP (Philippines)  | PHPC                                    | NO (announced, not live)                 | NO              |
| IDR (Indonesia)    | IDRX, BIDR                              | NO (Base + Polygon only)                 | NO              |
| TRY (Turkey)       | TRYB                                    | YES (BiLira)                             | NO              |
| MXN (Mexico)       | MXNT                                    | NO (Tether listed Ethereum/Tron/Polygon) | NO              |
| BRL (Brazil)       | BRZ                                     | YES                                      | NO on TransFi   |

**Implication:** the multi-stablecoin routing thesis ("buy local-currency
stablecoin at cash-in, deliver natively") has no live execution path for
ANY Ping target corridor today. Every corridor must transit through
USDC/USDT/PYUSD/USDe on Solana with FX happening at the final off-ramp leg.

---

## Alternative providers per corridor (verified)

| Corridor             | Verified alternative to TransFi                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Oman cash-in (OMR)   | MoonPay (Visa direct), Onramper aggregator (Banxa, Simplex, Alchemy Pay downstream)                                                                          |
| UAE cash-in (AED)    | BitOasis (VARA-licensed, AED bank deposit), Rain (Bahrain CBB + ADGM), Onramp.money (VARA + UAE Central Bank-aligned), Transak (UAE in pipeline; OTC active) |
| KSA cash-in (SAR)    | Rain (CBB-cleared, serves GCC; SARIE interbank from Al Rajhi/SNB/Riyadh Bank), Onramper aggregator                                                           |
| Philippines off-ramp | Coins.ph (REST API + USDCPHP + GCash channels), PDAX, GCash native GCrypto, Maya, Transak                                                                    |
| India UPI off-ramp   | Mudrex (FIU-IND registered, USDT→INR via UPI), Onramp.money OTC, Saber Money, Crossmint                                                                      |
| Pakistan off-ramp    | No institutional rail. P2P only (Binance P2P, KuCoin P2P). PVARA created Jul 2025; no licensed VASPs operating stablecoin↔PKR with JazzCash/EasyPaisa today  |
| Indonesia off-ramp   | IDRX (BI-regulated, Base/Polygon — needs Solana), TransFi (claims GoPay), Onramper                                                                           |

---

## Suggested architecture (facts-only)

### Core decision

Stay USDC-only on Solana. Drop multi-stablecoin routing entirely. The
"buy local-currency stablecoin at cash-in" thesis has no live execution path
today for any Ping target corridor.

### Provider stack per corridor

| Corridor    | Cash-in                                              | Cash-out                                 |
| ----------- | ---------------------------------------------------- | ---------------------------------------- |
| Oman → PH   | TransFi (IF verified) → Rain (fallback)              | Coins.ph direct API → TransFi (fallback) |
| UAE → PH/IN | TransFi (IF verified) → BitOasis/Rain (fallback)     | Coins.ph (PH), Mudrex (IN)               |
| KSA → PH/IN | Rain (verified GCC umbrella) → TransFi (IF verified) | Coins.ph (PH), Mudrex (IN)               |
| EG → PH     | TransFi (IF verified Fawry) → Onramper aggregator    | Coins.ph                                 |
| US → PH     | TransFi (verified)                                   | Coins.ph                                 |
| EU → PH     | TransFi (verified SEPA)                              | Coins.ph                                 |

### Phase ordering

- **Phase 1 (launch):** TransFi-only for cash-in (per ADR 0022) + TransFi
  off-ramp (per ADR 0005). Single vendor reduces ops complexity. Acceptable
  if TransFi confirms GCC + PH rails are live in production.
- **Phase 1.5:** Add Coins.ph direct API for PH off-ramp (cheaper than
  TransFi PH cash-out at PH volume). Requires Ping Oman LLC KYB.
- **Phase 1.5b:** Add Rain as GCC fallback IF TransFi GCC rails turn out
  unsupported in production.
- **Phase 2:** Add Mudrex for India INR off-ramp. Add IDRX (Base/Polygon)
  for IDR off-ramp via cross-chain bridge if IDR volume justifies it.
- **Deferred:** Pakistan (PVARA-licensed VASP needed). PHPC routing (waits
  on Coins.ph Solana mainnet ship — unscheduled).

### Open verifications required (founder action)

1. `sales@transfi.com` — confirm OMR/AED/SAR cash-in is live in production,
   with rails enumerated (Thawani? bank? card-only?) and per-rail fee disclosed.
2. `sales@rain.bh` — confirm GCC partner-tier (KSA/UAE/Oman) and per-corridor pricing.
3. `coins.ph/payments` — register Ping (Oman LLC) for KYB → production REST
   API keys for USDCPHP + GCash channels.
4. Wei Zhou / Coins.ph product — get definitive PHPC-on-Solana status; until
   then, drop PHPC from architecture roadmap.

---

## What I had wrong before this research

- I called USDC "resident" and PHPC "transient" — this was implicit USD bias,
  not architectural truth. Both are equally valid stablecoins; the choice is
  about cost and availability, not "stability."
- I assumed TransFi covered Oman/UAE/KSA at 1-2% based on ADR 0022 fee table
  drawn from marketing pages. The docs supported-countries list does not
  include these countries. ADR 0022 needs amendment.
- I assumed PHPC was potentially available on Solana. Verified: announced
  Sept 2024, no mainnet launch confirmed as of 2026-05-30.

Per `feedback_verify_on_actual_surface` memory — verify with the actual
authoritative source, don't coach from marketing.

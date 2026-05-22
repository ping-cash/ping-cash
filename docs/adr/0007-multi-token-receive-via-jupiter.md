# ADR 0007: Multi-Token Receive via Jupiter Auto-Swap

**Status:** Accepted
**Date:** 2026-05-23

## Context

Ping must accept incoming USDC at minimum, but the broader Solana ecosystem now carries multiple stablecoins and utility tokens that flow naturally into a Ping wallet:

- **Local-currency stablecoins** — PHPC (Philippine Peso), cKES (Kenyan Shilling), cNGN (Nigerian Naira), MXNT (Mexican Peso), BRZ (Brazilian Real), EURC (Euro), GBPT (British Pound), AE Coin (UAE Dirham, when launched)
- **Utility tokens from sister products** — $GRID (iogrid compute network, per [iogrid/docs/TOKENOMICS.md](https://github.com/iogrid/iogrid/blob/main/docs/TOKENOMICS.md)), future $ACME / $X tokens from other tenants
- **Other major stablecoins** — USDT (broad liquidity), FDUSD (Asia)

Per the iogrid playbook, Ping is positioned as a **tenant-neutral off-ramp rail.** iogrid providers cash out by swapping $GRID → USDC via Jupiter and then routing through Ping. Every future $X-token issuer can do the same.

If our wallet only understood USDC, every tenant would have to integrate a custom adapter. That doesn't scale.

## Decision

Ping wallets accept **any SPL token** on Solana. The default policy is to **auto-swap incoming non-USDC tokens to USDC immediately on receipt**, using the **Jupiter aggregator** to find the best execution route across all available Solana DEXes (Raydium CLMM, Orca Whirlpools, Phoenix, Meteora DLMM, etc.).

Users can opt out per-token via wallet settings (advanced users only).

## Mechanics

```
1. SPL token arrives at user's Ping wallet (Solana address watching service)

2. Indexer detects: tokenMint ≠ USDC mint

3. Look up user policy for this tokenMint:
   ├── DEFAULT: auto-swap to USDC
   ├── OPT-OUT: leave native (advanced setting)
   └── BLOCKED: token on Ping's blocklist (e.g., known sanctioned mints)

4. If auto-swap:
   ├── Call Jupiter Swap API: tokenMint → USDC
   ├── Slippage cap: 0.5% (rejected if exceeded; held native + user notified)
   ├── MEV protection: route via Jupiter's protected mode
   └── Result: USDC arrives in user's Ping wallet

5. Auto-stake into Earn Vault (per ADR 0012) — user sees only their balance grow

User sees: "Received $200 from <sender>" — never sees the swap.
```

## Consequences

**Good:**
- Single integration covers iogrid + every future token tenant — no per-token adapter code
- Solana ecosystem effect: as new local-currency stablecoins launch (cKES, cNGN, AE Coin), they integrate "for free" via Jupiter routing
- User UX simplification: always sees their balance in USDC, never confused by multiple tokens
- Cheapest local-currency routes (PHPC at 0.1% to Coins.ph) work mechanically

**Bad / trade-offs:**
- Slippage risk for very illiquid tokens — we cap at 0.5% but some long-tail tokens fail the swap. Mitigation: hold native, notify user, let them swap manually with custom slippage
- Sandwich-attack exposure — Jupiter's MEV-protected mode adds ~50ms latency. Acceptable.
- We forgo any "swap spread" we could capture on the incoming swap. Mitigation: this is the off-ramp leg, where iogrid's framing applies — Ping doesn't charge on the swap leg, only on the cash-out leg. The volume effect compensates.

## Per-token Routing Policy

| Incoming token | Auto-swap target | Why |
|---|---|---|
| USDC | (no swap) | Already canonical |
| USDT | USDC | Single accounting unit |
| FDUSD | USDC | Single accounting unit |
| PHPC | (no swap, special case) | PH off-ramp prefers PHPC direct (0.1% route to Coins.ph) |
| cKES | USDC, then re-swap to cKES at cash-out if KE destination | Single ledger; route optimisation at outbound |
| EURC / GBPT | USDC, then re-swap at cash-out | Same |
| $GRID (iogrid) | USDC | Standard tenant pattern |
| Any other SPL | USDC if liquid; held native + alert if not | Risk management |
| Sanctions-blocked mints | Reject | OFAC compliance |

## Alternatives Considered

- **Reject non-USDC entirely:** Rejected — breaks the tenant-neutral promise; iogrid + future tenants can't integrate
- **Custom adapter per token:** Rejected — doesn't scale, requires us to monitor every new token launch
- **Auto-swap via own AMM:** Rejected — re-implements Jupiter's price discovery, no benefit; Jupiter is best-priced
- **Multi-currency ledger inside Ping** (track balance in 10 tokens per user): Rejected — UX nightmare for ESL users; we deliberately keep "one balance number"

## Implementation Notes

- Solana account-level token tracking via [helius.xyz](https://www.helius.xyz/) RPC + webhooks
- Jupiter Swap API integration in `wallet-service`
- Slippage rejection path: hold token in user wallet + send WhatsApp alert "We held 1,000 ABC tokens — slippage was too high. Tap to swap manually."
- Per-user policy stored in `user-service`
- Sanctions-blocked mint list updated daily from Chainalysis feed

## See Also

- [ARCHITECTURE.md § Cash-In / Cash-Out Integration](../ARCHITECTURE.md#cash-in--cash-out-integration)
- [ADR 0005 — TransFi primary off-ramp](0005-transfi-primary-offramp.md)
- [ADR 0012 — Earn Vault auto-stake](0012-earn-vault.md)
- iogrid/docs/TOKENOMICS.md — multi-tenant off-ramp design pattern
- iogrid/docs/MULTI_TENANT_MATRIX.md — proving iogrid is one tenant, AcmeMesh another, all symmetric

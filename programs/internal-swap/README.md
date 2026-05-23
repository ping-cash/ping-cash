# Internal Swap — Anchor Program

Solana Anchor program for the Ping internal USDC ↔ $PING swap. Self-fills user buys/sells against Ping inventory at a fixed configurable spread (default 30 bps = 0.3%) each side.

Per [ADR 0009](../../docs/adr/0009-pomm-internal-swap.md).

## ⛔ DO-NOT-DEPLOY Guard

Same gates as `programs/earn-vault`:

1. **Cayman Foundation incorporation completed** — legal entity owns upgrade authority
2. **OtterSec audit passed** — critical/high findings remediated
3. **$PING token mint exists** — blocked on #22 TGE

Placeholder program ID `InternalSwapProgr4mPubKeyP1ace0001111111111` is intentionally non-deployable. Local validator testing via `anchor test` only.

## Instructions

| Instruction                   | Authority | Description                                            |
| ----------------------------- | --------- | ------------------------------------------------------ |
| `initialize_pool(spread_bps)` | Authority | One-time pool setup; spread_bps ≤ MAX_SPREAD_BPS (100) |
| `swap_usdc_for_ping(amount)`  | User      | Sell USDC → receive $PING net of spread                |
| `swap_ping_for_usdc(amount)`  | User      | Sell $PING → receive USDC net of spread                |
| `set_spread_bps(bps)`         | Authority | Adjust spread (capped at MAX_SPREAD_BPS)               |
| `set_paused(paused)`          | Authority | Emergency pause                                        |

## Pricing model

The on-chain math is a constant-product quote with spread applied to the gross output:

```text
gross_out = (amount_in * pool_reserve_out) / (amount_in + pool_reserve_in)
net_out   = gross_out * (10_000 - spread_bps) / 10_000
```

This is NOT a Uniswap-V2 AMM curve — the spread is a fixed % deduction. The off-chain hedger reads pool state, checks drift via `needs_hedge()`, and rebalances via Jupiter when drift > HEDGE_THRESHOLD_BPS (default 20%).

## Build + Test

```bash
anchor build -p internal-swap
anchor test
```

## Companion off-chain hedger

The rebalancing logic lives off-chain (Jupiter SDK; not in this program) — the contract exposes `needs_hedge()` as a pure helper that the hedger calls to decide.

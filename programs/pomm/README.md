# POMM — Protocol-Owned Market Maker (Anchor scaffold)

Solana Anchor program for Ping's POMM. The Foundation seeds a USDC treasury; this program controls single-sided concentrated-liquidity deployment to Raydium CLMM at oracle-validated prices.

Per [ADR 0009](../../docs/adr/0009-pomm-internal-swap.md).

## ⛔ DO-NOT-DEPLOY Guard

Same gates as `programs/earn-vault` + `programs/internal-swap`, plus:

- **Raydium CLMM IDL pinned** — actual CPI to Raydium not yet implemented (this scaffold treats LP minting as state-only)
- **$PING TGE** (#22) — the pool side of POMM uses $PING/USDC; depends on the mint existing
- **Squads multisig provisioned** — authority is set to the Squads vault address at `initialize_treasury` time

Placeholder program ID `PommProgr4mPubKeyP1ace00011111111111111111` non-deployable.

## Instructions

| Instruction                                         | Authority | Notes                                                               |
| --------------------------------------------------- | --------- | ------------------------------------------------------------------- |
| `initialize_treasury(squads_multisig)`              | Payer     | Sets the Squads vault as authority                                  |
| `deposit_usdc(amount)`                              | Anyone    | Foundation seeds the treasury                                       |
| `mint_lp_position(amount, oracle_price, ema_price)` | Squads    | Validates price within EMA ±15% band; enforces ≤0.5% per-day cap    |
| `collect_fees(fees)`                                | Squads    | Records accrued fees (off-chain CPI to Raydium not in this version) |
| `set_paused(paused)`                                | Squads    | Emergency pause                                                     |
| `emergency_withdraw(amount)`                        | Squads    | Requires `is_paused=true`; withdraws USDC to a destination ATA      |

## Safety invariants

- **EMA band**: oracle price must be within ±15% of EMA (ADR 0009 §5)
- **Per-day cap**: ≤0.5% of total_usdc may be deployed in a single `mint_lp_position` call
- **Pause-only multisig**: Squads cannot directly move funds — only pause/unpause + emergency withdraw (which itself requires paused state)

## Build + Test

```bash
anchor build -p pomm
anchor test
```

## Open questions for audit

- Replay-protection on `mint_lp_position` — should there be a per-day nonce/timestamp instead of trusting the off-chain caller to rate-limit?
- Oracle freshness check — current scaffold trusts the off-chain caller; production should pull Pyth + Switchboard accounts in-CPI
- LP position accounting — once Raydium CPI lands, `deployed_usdc` must track real on-chain LP token balance, not just incremented

These are flagged for OtterSec audit pre-mainnet.

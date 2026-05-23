# Earn Vault — Anchor Program

Solana Anchor program for the Ping Earn Vault. Auto-stake USDC across Solana DeFi protocols (Kamino 40% / Marginfi 25% / Aave 20% / Drift 10% / liquid 5%) with a 40/60 yield split (40% to vUSDC holders, 60% to Ping treasury).

Per [ADR 0012](../../docs/adr/0012-earn-vault.md).

## ⛔ DO-NOT-DEPLOY Guard

This program **MUST NOT** be deployed to devnet or mainnet until:

1. **Cayman Foundation incorporation completed** — the legal entity owning the program upgrade authority must exist before any user funds touch it.
2. **OtterSec audit passed** — full code audit with remediation of all critical/high findings.

The placeholder program ID `EarnVau1tProgr4mPubKeyP1ace0001111111111111` is intentionally non-deployable. A real keypair will be generated and committed only when the above gates pass.

Local validator testing via `anchor test` is OK — the local validator does not connect to any live network.

## Instructions

| Instruction                      | Authority | Description                                                               |
| -------------------------------- | --------- | ------------------------------------------------------------------------- |
| `initialize_vault(treasury_bps)` | Authority | One-time setup; creates `Vault` PDA, sets 40/60 split (treasury_bps=6000) |
| `stake(amount)`                  | User      | Transfers USDC in, mints vUSDC to user at current ratio                   |
| `harvest(yield_amount)`          | Authority | Splits yield: treasury_bps to treasury, rest compounds for holders        |
| `unstake(vusdc_amount)`          | User      | Burns vUSDC, transfers USDC out at current ratio                          |
| `set_paused(paused)`             | Authority | Emergency pause (blocks stake/harvest/unstake)                            |

## Account model

- `Vault` (PDA, seeds `["vault"]`) — single global vault account holding state
- `vUSDC mint` (SPL Token-2022) — receipt token; mint authority = Vault PDA
- `USDC vault ATA` — holds the staked USDC pool
- `Treasury ATA` — receives treasury_bps share of each harvest

## Yield Source Adapters (stub interfaces)

Real CPI integrations to Kamino/Marginfi/Aave/Drift live in `programs/earn-vault/src/adapters/` — stubs only at this stage. The `harvest()` instruction currently takes `yield_amount` as a parameter (from the off-chain indexer); future versions read on-chain accrual via the adapters.

## Build + Test

```bash
anchor build
anchor test
```

Targets Anchor 0.30.1 + Solana 1.18.17. See [Anchor.toml](../../Anchor.toml).

# $PING Token — SPL Token-2022 mint registry

Tiny Anchor program that registers + validates the canonical `$PING` SPL Token-2022 mint.

Per [ADR 0008](../../docs/adr/0008-ping-tokenomics.md).

## Why this program is small

The mint itself is created off-chain via `spl-token-2022 create-token` with these properties:

- **9 decimals** (per ADR 0008)
- **Mint authority** = Foundation Squads multisig
- **Freeze authority** = None (no freeze ever)
- **No transfer-fee extension** at mint init

This program's only responsibility is to:

1. Record the canonical mint pubkey in an on-chain `Registry` PDA
2. Verify the mint matches the ADR-0008 invariants (decimals, mint authority, no freeze)

All vesting + emission logic is OFF-CHAIN via [Streamflow](https://streamflow.finance). The Foundation seeds Streamflow contracts which then mint from the Squads multisig on schedule.

## ⛔ DO-NOT-DEPLOY Guard

Same gates as `programs/earn-vault` + `programs/internal-swap` + `programs/pomm`, plus:

- **Streamflow contracts deployed** — without vesting, the Squads multisig can mint unilaterally (audit-critical)
- **Foundation Squads multisig provisioned** — 3-of-5 minimum signers per ADR 0008

Placeholder program ID `PingTokenProgr4mPubKeyP1ace00011111111111111` non-deployable.

## Instruction

`initialize_mint(squads_multisig)` — registers a Token-2022 mint as the canonical `$PING`. Fails if:

- decimals ≠ 9
- mint authority ≠ `squads_multisig`
- freeze authority is set

## Build + Test

```bash
anchor build -p ping-token
anchor test
```

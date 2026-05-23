# ADR 0018 — Anchor scaffolds with explicit DO-NOT-DEPLOY guard

**Status:** Accepted · **Date:** 2026-05-23 · **Supersedes:** none

## Context

Phase 2 introduces 4 on-chain Anchor programs (`earn-vault`, `internal-swap`, `pomm`, `ping-token`). All hold or move user funds and depend on:

1. **Cayman Foundation incorporation** — the legal entity that owns the upgrade authority. Without it, anyone signing as authority is personally liable.
2. **OtterSec audit** — full third-party audit with all critical/high findings remediated.
3. **Streamflow vesting contracts (`$PING` mint only)** — without vesting, the Squads multisig can mint unilaterally, which an audit will flag as critical.
4. **Squads multisig (3-of-5 minimum) provisioned** — the actual signer set is part of the audit scope.

Each gate is external (legal entity, audit firm capacity, multisig setup) and takes weeks to months. Meanwhile, the architectural design is locked (per [ADR 0008](0008-ping-tokenomics.md), [ADR 0009](0009-pomm-internal-swap.md), [ADR 0012](0012-earn-vault.md)) and code can be written + tested locally without those gates.

We need a way to ship the source code, prove `anchor build + test` work locally, and guarantee nobody deploys to devnet/mainnet by accident.

## Decision

Every Anchor program in `programs/` carries a **DO-NOT-DEPLOY guard** consisting of three layers:

### 1. Placeholder program ID

Each program declares an intentionally non-deployable program ID via `declare_id!`. The IDs are obviously synthetic ("EarnVau1tProgr4mPubKeyP1ace…", "PommProgr4mPubKeyP1ace…") so they will not match any real keypair. Anyone who tries to deploy gets a clear "program ID mismatch" error before any state hits chain.

A real keypair is generated and committed (via `solana-keygen`) only as part of the deploy PR that lands after the gates clear.

### 2. README guard

Every program directory has a `README.md` opening with a "⛔ DO-NOT-DEPLOY Guard" section listing the gates that must clear before mainnet deploy. Local validator (`anchor test`) is explicitly permitted — that's how we run unit tests without leaving the dev box.

### 3. CI builds-but-does-not-deploy

`.github/workflows/anchor.yml` runs `anchor build` + `anchor test` on every PR touching `programs/`. There is **no** deploy step. A separate, manual workflow (yet to be written) will gate deploy on a `deploy-approved` issue label that the Foundation board signs off on.

## Consequences

### Positive

- Source code, math, and tests land months before legal/audit gates clear
- New contributors can `anchor build` + `anchor test` locally without any production secrets
- An accidental `anchor deploy` fails fast at the program-ID-mismatch check
- The README guard is human-readable; an LLM agent or human reviewer sees it before opening any deploy PR

### Negative

- The placeholder IDs need a one-time swap (generate real keypair, replace `declare_id!`, regenerate IDL) on the deploy PR. Mitigation: documented in each README's "Open questions for audit" section.
- Adapter interfaces (Kamino, Marginfi, Aave, Drift, Raydium CLMM, Jupiter) are stubs — real CPI bindings land separately as each pinned upstream IDL is confirmed.

### Neutral

- No on-chain economic mechanism shipped in Phase 1 — but all the math + invariants are testable + reviewable. The audit firm sees the code in the same shape it'll eventually ship in.

## References

- [`programs/earn-vault/README.md`](../../programs/earn-vault/README.md) — guard text
- [`programs/internal-swap/README.md`](../../programs/internal-swap/README.md)
- [`programs/pomm/README.md`](../../programs/pomm/README.md)
- [`programs/ping-token/README.md`](../../programs/ping-token/README.md)
- [`Anchor.toml`](../../Anchor.toml) — workspace; placeholder program IDs
- [`.github/workflows/anchor.yml`](../../.github/workflows/anchor.yml) — build+test only
- Issues [#25](https://github.com/ping-cash/ping-cash/issues/25), [#26](https://github.com/ping-cash/ping-cash/issues/26), [#27](https://github.com/ping-cash/ping-cash/issues/27), [#28](https://github.com/ping-cash/ping-cash/issues/28) — per-Wave scaffold issues

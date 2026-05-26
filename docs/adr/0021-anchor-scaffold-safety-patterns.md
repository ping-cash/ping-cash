# ADR 0021 — Anchor scaffold safety pattern catalog

**Status:** Accepted · **Date:** 2026-05-24 · **Supersedes:** none · **Relates to:** [ADR 0018](0018-anchor-scaffolds-do-not-deploy.md), [ADR 0019](0019-transfer-claim-bridge-and-reconciler.md), [#22](https://github.com/ping-cash/ping-cash/issues/22)

## Context

Phase-2 ships four Anchor programs (ping-token, earn-vault, internal-swap, pomm) gated on Cayman Foundation + OtterSec audit per [#22 EPIC](https://github.com/ping-cash/ping-cash/issues/22). 4 sub-agent pre-audit reviews surfaced 77 findings; same handful of bug classes appeared across all 4 programs. Rather than re-derive each fix per program, this ADR catalogs the fix patterns so future Anchor work in this repo inherits the same defenses by default.

## Decision

Adopt these 5 cross-program scaffold-safety patterns. Apply each when the corresponding smell appears in any new Anchor program.

### Pattern 1 — Per-asset PDA seed binding

**Smell:** `seeds = [b"<name>"]` is a single global slot. First caller after mainnet deploy claims it forever. Attacker can race init with a hostile mint/vault.

**Fix:** Bind the PDA seed to a structural identity — typically the principal mint pubkey, or a (usdc_mint, ping_mint) pair for pool-class accounts.

```rust
// Before
seeds = [b"vault"]

// After
seeds = [b"vault", usdc_mint.key().as_ref()]
```

Signer-seeds inside instruction bodies must also bind to the recorded mint pubkey from the account state (not from passed-in accounts that could be spoofed).

**Receipts:** ping-token H-01 (2deaace), earn-vault C-04 (f7ea54f), internal-swap C5 (d238aa7), pomm H-02 (c530322).

### Pattern 2 — Account-init constraints (anti-back-door)

**Smell:** `initialize_*` accepts any vault / mint without checking owner / mint / authority / supply / close_authority. Deployer back-doors: vault owned by attacker, mint with attacker as mint_authority, vault.mint pointing at wrong mint.

**Fix:** Constrain every account at init with explicit checks per its role:

```rust
#[account(
    constraint = vusdc_mint.mint_authority.unwrap() == vault.key() @ Err::WrongAuthority,
    constraint = vusdc_mint.freeze_authority.is_none()             @ Err::FreezeMustBeNone,
    constraint = vusdc_mint.supply == 0                            @ Err::SupplyMustBeZero,
)]
pub vusdc_mint: InterfaceAccount<'info, Mint>,
#[account(
    constraint = usdc_vault.owner == vault.key()                   @ Err::WrongVaultOwner,
    constraint = usdc_vault.mint == usdc_mint.key()                @ Err::WrongVaultMint,
    constraint = usdc_vault.close_authority.is_none()              @ Err::VaultNotCloseable,
)]
pub usdc_vault: InterfaceAccount<'info, TokenAccount>,
```

Each constraint gets its own error code for surface-able diagnosis.

**Receipts:** earn-vault C-03 (2c35aee), internal-swap C4 (564e6af), pomm H-05 (2f10110).

### Pattern 3 — Authority rotation (migrate dev-key → multisig without redeploy)

**Smell:** Authority is set at init + never rotatable. Migrating from single-key dev authority to Squads multisig requires redeploying the program. But the placeholder `declare_id!` (per ADR 0018) forbids redeploy until audit completes.

**Fix:** Add a `rotate_authority(new_authority: Pubkey)` instruction guarded by the current authority's signer. Special-case `renounce_*_authority` for mint-authority-style irreversible handoffs (set to `None`).

```rust
pub fn rotate_authority(ctx: Context<AdminAccount>, new: Pubkey) -> Result<()> {
    require!(new != Pubkey::default(), Err::ZeroPubkey);
    let old = ctx.accounts.account.authority;
    ctx.accounts.account.authority = new;
    emit!(AuthorityRotated { account: ctx.accounts.account.key(), old, new });
    Ok(())
}
```

**Receipts:** ping-token H-03 renounce (f1cfab4 — irreversible variant), earn-vault H-04 (2d89968), internal-swap H-01 (23d62cc), pomm H-03 (b464d17).

### Pattern 4 — Scaffold-defensive hard-disable (when CPI is missing)

**Smell:** An instruction accepts caller-supplied values that should come from a real CPI to another program (oracle, pool, fee accumulator). Without the CPI, the authority can supply any value + abuse the trust hole. This is the "operator-drain" class.

**Fix:** Hard-disable the instruction with a dedicated error until the rebuild lands real CPI. The instruction body becomes `err!(Err::DisabledUntilRebuild)`. The attack becomes physically impossible during scaffold-lifetime.

```rust
pub fn harvest(_ctx: Context<Harvest>, _yield_amount: u64) -> Result<()> {
    err!(Err::HarvestDisabledUntilRebuild)
}
```

The state struct retains the placeholder fields so the rebuild can layer on without account data migration.

**Receipts:** earn-vault C-02 harvest (61407a3), pomm H-01 collect_fees (600c647), pomm C-01+C-02+C-03 mint_lp_position (db555a3).

### Pattern 5 — ADR 0018 compile-time guard

**Smell:** ADR 0018's DO-NOT-DEPLOY policy is a runtime guard only (placeholder pubkey has no signer). A future contributor swaps the `declare_id!` without realizing audit hasn't passed.

**Fix:** Two new Cargo features + a `compile_error!` block:

```toml
# Cargo.toml
[features]
mainnet-ready = []   # gate to swap declare_id from placeholder
audit-passed = []    # only set after OtterSec audit completes
```

```rust
// src/lib.rs
#[cfg(all(feature = "mainnet-ready", not(feature = "audit-passed")))]
compile_error!(
    "<program>: mainnet-ready feature requires audit-passed feature \
     (set only AFTER OtterSec audit completes per #22 EPIC + ADR 0018)"
);
declare_id!("<placeholder>");
```

Workflow:

1. Default build → compiles, ships placeholder
2. `--features mainnet-ready` alone → COMPILE_ERROR
3. `--features mainnet-ready,audit-passed` (post-audit) → compiles

**Receipts:** ping-token (2bd1c24), earn-vault + pomm + internal-swap (155284e).

## Consequences

### Positive

- Every new Anchor program in this repo inherits the same five defenses by default. Audit findings drop from "discovered per program" to "discovered once + applied four times".
- ADR 0018 is now backed by compile-time enforcement, not just documentation.
- Each pattern's receipts link to the actual commit + the audit finding it closed, so future contributors can trace why a constraint exists.

### Negative

- New error codes proliferate (5-10 per program). Manageable as long as the error-code-to-fix-pattern mapping stays documented here.
- Per-mint PDA pattern means clients can't hardcode the PDA — they must derive it from (program_id, mint_pubkey). Compensated by the IDL changes auto-flowing to TS clients.
- The hard-disable pattern bans an instruction during scaffold-lifetime even on devnet — devs testing the instruction's surface must use the rebuilt version.

## Pointers

- Phase-2 audit sprint retrospective (per-program tally + cross-cutting analysis): [docs/sessions/2026-05-24-phase2-preaudit-sprint.md](../sessions/2026-05-24-phase2-preaudit-sprint.md)
- Sub-agent reviewer comments: [#22 c.4527049794](https://github.com/ping-cash/ping-cash/issues/22#issuecomment-4527049794) (ping-token), [c.4527111355](https://github.com/ping-cash/ping-cash/issues/22#issuecomment-4527111355) (earn-vault), [c.4527278904](https://github.com/ping-cash/ping-cash/issues/22#issuecomment-4527278904) (internal-swap), [c.4527297108](https://github.com/ping-cash/ping-cash/issues/22#issuecomment-4527297108) (pomm)
- ADR 0018 DO-NOT-DEPLOY guard: [docs/adr/0018](0018-anchor-scaffolds-do-not-deploy.md)
- ADR 0019 multisig custody: [docs/adr/0019](0019-transfer-claim-bridge-and-reconciler.md)

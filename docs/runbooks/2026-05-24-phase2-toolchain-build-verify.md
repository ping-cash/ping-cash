# 2026-05-24 — Phase-2 toolchain build + verify runbook

**WHAT:** Turnkey steps to take the Phase-2 Anchor programs (ping-token, earn-vault, internal-swap, pomm) from "source-side scaffold-shipped on bastion" to "audit-ready signed mainnet candidate". Run on a host with anchor + cargo + solana CLI installed — bastion can't (K3s shared-node ban per CLAUDE.md).

**AUTHORITY:** 📐 PERMANENT. Update when toolchain versions or rebuild scope change.

**Pointers:** EPIC [#22](https://github.com/ping-cash/ping-cash/issues/22) · per-Wave [#61](https://github.com/ping-cash/ping-cash/issues/61) (earn-vault) + [#62](https://github.com/ping-cash/ping-cash/issues/62) (internal-swap + pomm) · ADR [0021](../adr/0021-anchor-scaffold-safety-patterns.md) pattern catalog · Phase-2 retrospective [docs/sessions/2026-05-24-phase2-preaudit-sprint.md](../sessions/2026-05-24-phase2-preaudit-sprint.md).

## Prerequisites (one-time per build host)

```bash
# Solana 1.18 + Anchor 0.30.1 (matches Cargo.toml pins across all 4 programs)
sh -c "$(curl -sSfL https://release.solana.com/v1.18.17/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1 && avm use 0.30.1

# Rust toolchain bound by Cargo workspace
rustup install 1.79.0  # last stable that Anchor 0.30.1 + solana 1.18 build clean against
rustup default 1.79.0
rustup component add rustfmt clippy
```

## Step 1 — Crate fetch (closes the toolchain-bound TODO markers)

The scaffold-source-side commits in #62 left two TODO(#62-C01-followup) /
TODO(#62-H02-followup) markers where the real CPI calls land once these
crates are fetchable:

```bash
cd programs/pomm
cargo add raydium-clmm-cpi --features cpi --locked
cargo add squads-protocol-sdk --locked

cd ../internal-swap
cargo add squads-protocol-sdk --locked
```

Then replace the scaffold's hand-rolled instruction discriminators
(`raydium_clmm::INCREASE_LIQUIDITY_V2_DISCRIMINATOR` etc.) with the
crate-exported types:

```rust
// programs/pomm/src/lib.rs — mint_lp_position body:
// Replace TODO block with:
use raydium_clmm_cpi::{cpi, instruction};

if personal_position_state_uninitialized {
    cpi::open_position_with_token22_nft(
        CpiContext::new_with_signer(
            ctx.accounts.raydium_clmm_program.to_account_info(),
            cpi::accounts::OpenPositionWithToken22Nft {
                // ... map from MintLpPosition's CLMM account fields ...
            },
            _treasury_signer_seeds,
        ),
        // tick params from EMA-derived range
    )?;
} else {
    cpi::increase_liquidity_v2(
        CpiContext::new_with_signer(/* ... */, _treasury_signer_seeds),
        amount,
        /* amount_0_max + amount_1_max */
    )?;
}
```

Same shape for the Squads multisig CPI in internal-swap + pomm `rotate_authority` / `set_paused` callers once `squads-protocol-sdk` types are available — `assert_is_vault_pda` becomes a `proposal_status_check` against an actual Squads proposal account.

## Step 2 — Build verification (must complete clean before audit)

```bash
# Workspace check (no actual build — just resolves + type-checks)
anchor check

# Default-features build (placeholder declare_id, ships scaffold-as-is)
anchor build

# Mainnet-ready attempt WITHOUT audit-passed (should COMPILE_ERROR per L-01)
ANCHOR_FEATURES=mainnet-ready anchor build
# Expected output:
#   error: mainnet-ready feature requires audit-passed feature
#          (set only AFTER OtterSec audit completes per #22 EPIC + ADR 0018)
# If this DOES NOT error, ADR 0018 guard is broken — STOP, investigate.

# Audit-passed build (only after OtterSec sign-off — see Step 5)
ANCHOR_FEATURES=mainnet-ready,audit-passed anchor build
# This is the only path that produces a deployable artifact.
```

Build outputs land in `target/deploy/{ping_token,earn_vault,internal_swap,pomm}.so`. Verify sha256 reproducibility across two build hosts before sending to auditor.

## Step 3 — Unit + integration tests

```bash
# Per-program unit tests
anchor test --skip-deploy --skip-local-validator -- --features ping_token
anchor test --skip-deploy --skip-local-validator -- --features earn_vault
anchor test --skip-deploy --skip-local-validator -- --features internal_swap
anchor test --skip-deploy --skip-local-validator -- --features pomm

# Cross-program integration on localnet
# (NB: do NOT run on bastion K3s — spawns solana-test-validator which OOM-killed the kubelet on 2026-05-24 per CLAUDE.md banned-on-shared-node rule)
solana-test-validator --reset --bpf-program target/deploy/<pin> &
anchor test --skip-build
```

## Step 4 — Squads multisig key ceremony (gates mainnet deploy)

```bash
# 1. Foundation generates a fresh program-upgrade keypair via Squads UI
#    https://app.squads.so → Create Vault → Generate Keypair
#    Save the multisig PDA pubkey + vault PDA pubkey (vault_index = 0).

# 2. Verify the vault PDA against the scaffold's squads_multisig::vault_pda():
cargo run --bin verify_vault -- \
    --multisig <multisig-pda> --vault-index 0 \
    --expected $(grep 'PommMultisigVaultPDA' deployment/keys.toml)

# 3. Replace the placeholder declare_id with the multisig-generated pubkey:
sed -i 's|declare_id!("PommProgr4mPubKeyP1ace00011111111111111111")|declare_id!("<real-pubkey>")|' \
    programs/pomm/src/lib.rs
# Repeat for the other 3 programs with their respective generated keypairs.

# 4. Build with the L-01 guard (REQUIRES both features set ONLY after Step 5):
ANCHOR_FEATURES=mainnet-ready,audit-passed anchor build
```

## Step 5 — OtterSec engagement (gates `audit-passed` feature)

1. Founder signs OtterSec retainer (~$60-120K depending on scope; current rebuild surface = 4 programs × ~500 LOC each + cross-program ADR 0021 pattern catalog).
2. Send `target/deploy/*.so` + Step 2 reproducibility hashes + retrospective doc + ADR 0021 + #22 EPIC link + per-Wave issue bodies.
3. OtterSec works through the 77 filed findings (45 already scaffold-closed → expect them to confirm + check the 32 not-yet-scaffold-closed are addressed in the rebuild source from this runbook).
4. Critical/High remediation pass — iterate until OtterSec signs off.
5. Receive signed audit report. Reference in #22 EPIC body before flipping the `audit-passed` feature.

## Step 6 — Cayman Foundation incorporation (gates mainnet deploy)

Strict legal sequence (founder-physical per §−2):
1. Engage Walkers / Maples / Conyers (Cayman counsel) — ~$15-25K incorporation + ~$5K/yr maintenance.
2. Foundation memorandum + articles must explicitly cover (a) holding the multisig keys, (b) executing the audited program upgrades, (c) the $PING token issuance per ADR 0008.
3. Cayman Beneficial Ownership Registry filing.
4. Open Foundation-owned Solana wallets (Squads multisig vaults from Step 4).
5. File annual return + economic-substance declaration each subsequent Jan.

Send incorporation certificate + Foundation memo to OtterSec for the audit report addendum confirming the entity that owns the upgrade authority.

## Step 7 — Mainnet deploy (gates Raydium pool seed)

```bash
# Pre-flight: confirm declare_id values match the multisig-generated keypairs
grep -h 'declare_id!' programs/*/src/lib.rs

# Build with both features (only succeeds post Step 5)
ANCHOR_FEATURES=mainnet-ready,audit-passed anchor build

# Solana mainnet RPC endpoint
solana config set --url https://api.mainnet-beta.solana.com
# (or a paid RPC for higher rate limits during deploy)

# Deploy via Squads multisig — NEVER directly. Squads UI / CLI:
squads create-tx --multisig <multisig> \
  --instruction "solana program deploy target/deploy/pomm.so" \
  --vault-index 0
# Repeat for the other 3 programs.

# Multisig N-of-M signers approve via Squads UI.
# Foundation Squads executes → program deploys.
```

Each program deploy costs ~3 SOL (≈ $500 at $170 SOL) for ~500KB program size. Total Phase-2 mainnet deploy: ~$2K SOL.

## Step 8 — Raydium concentrated-liquidity pool seed

(post-Step 7) Foundation seeds the USDC/$PING CLMM pool via Raydium UI with the agreed-upon initial liquidity per ADR 0009. Pool address is then pinned in the Sovereign manifests for the indexer.

## Bastion-vs-build-host responsibility matrix

| Step | Bastion | Build host (anchor/cargo) | Founder-physical |
|---|---|---|---|
| 1 crate fetch + cpi:: wire | ❌ (no cargo) | ✅ | — |
| 2 anchor build + L-01 guard | ❌ (no anchor) | ✅ | — |
| 3 unit + integration tests | ❌ (no anchor + K3s ban on test-validator) | ✅ | — |
| 4 Squads key ceremony | ⚠️ vault_pda derivation only | ✅ verify_vault | ✅ generate keypair |
| 5 OtterSec engagement | — | — | ✅ retainer + remediation review |
| 6 Cayman incorporation | — | — | ✅ legal engagement + filings |
| 7 mainnet deploy | — | ✅ build + tx-create | ✅ Squads N-of-M approval |
| 8 Raydium pool seed | — | — | ✅ Foundation USDC + $PING contribution |

The scaffold-source-side rebuild on bastion (commits ee132a2 through 2430d03 this session — see #22 c.4529771254) covers Step 1's "scaffolded enough to ship". Steps 2-3 are toolchain-bound but autonomous on the build host. Steps 4-8 carry the genuine founder-physical residuals per CLAUDE.md §−2 / §−1 allowlist.

## Status flag

When all 8 steps land, EPIC #22 + #61 + #62 + #15 + #16 + #23 + #24 + #58 collapse to `status/completed` and the Phase-2 EPIC is shippable. Estimated wall time from Step 1 → Step 8: 8-14 weeks depending on Cayman counsel queue + OtterSec slot.

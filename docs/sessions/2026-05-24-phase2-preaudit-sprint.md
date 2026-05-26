# 2026-05-24 — Phase-2 Anchor pre-audit sprint retrospective

**WHAT:** Cross-program scaffold-side closure of OtterSec-class findings on the 4 Phase-2 Anchor programs (ping-token, earn-vault, internal-swap, pomm). Run inline against EPIC [#22](https://github.com/ping-cash/ping-cash/issues/22).

**AUTHORITY:** 🗓️ TRANSIENT — auto-archive after 30 days.

## Top-line outcome

77 findings filed across 4 sub-agent reviews. 30 scaffold-side fixes shipped. **pomm reached 9/9 C/H closed** as the first program fully scaffold-fixed. ADR 0018 DO-NOT-DEPLOY guard now backed by compile-time check (`mainnet-ready` requires `audit-passed` feature flag) across all 4 programs. Remaining findings are architectural — rebuild scope addressed by [#61](https://github.com/ping-cash/ping-cash/issues/61) + ADR 0009 rebuild + Cayman + OtterSec.

## Findings inventory (sub-agent reviewer breakdown)

| Program       | C      | H      | M      | L      | I      | Total  | Reviewer comment                                                                             |
| ------------- | ------ | ------ | ------ | ------ | ------ | ------ | -------------------------------------------------------------------------------------------- |
| ping-token    | 2      | 3      | 4      | 3      | 2      | 14     | [#22 c.4527049794](https://github.com/ping-cash/ping-cash/issues/22#issuecomment-4527049794) |
| earn-vault    | 4      | 5      | 6      | 3      | 4      | 22     | [#22 c.4527111355](https://github.com/ping-cash/ping-cash/issues/22#issuecomment-4527111355) |
| internal-swap | 5      | 6      | 5      | 4      | 3      | 23     | [#22 c.4527278904](https://github.com/ping-cash/ping-cash/issues/22#issuecomment-4527278904) |
| pomm          | 4      | 5      | 4      | 3      | 2      | 18     | [#22 c.4527297108](https://github.com/ping-cash/ping-cash/issues/22#issuecomment-4527297108) |
| **Total**     | **15** | **19** | **19** | **13** | **11** | **77** | —                                                                                            |

## Cross-program patterns (fixes shipped multiple times)

### Per-mint PDA seed binding (front-runnable single-global PDA → mint-bound)

- ping-token H-01: `seeds = [b"ping-registry", mint.key().as_ref()]` (2deaace)
- earn-vault C-04: `seeds = [b"vault", usdc_mint.key().as_ref()]` (f7ea54f)
- internal-swap C5: `seeds = [b"pool", usdc_mint.key().as_ref(), ping_mint.key().as_ref()]` (d238aa7)
- pomm H-02: `seeds = [b"treasury", usdc_mint.key().as_ref()]` (c530322)

### Vault-init constraints (back-door deployer hijack → owner/mint/close enforced)

- earn-vault C-03 (2c35aee): 5 constraints on vusdc_mint + usdc_vault
- internal-swap C4 (564e6af): 6 constraints across usdc_vault + ping_vault
- pomm H-05 (2f10110): 3 constraints on usdc_vault

### Authority rotation (migrate dev-key → multisig without redeploy)

- ping-token H-03 (f1cfab4): `renounce_mint_authority` (special case: irreversible)
- earn-vault H-04 (2d89968): `rotate_authority`
- internal-swap H-01 (23d62cc): `rotate_authority`
- pomm H-03 (b464d17): `rotate_authority`

### Scaffold-defensive hard-disable (caller-trust + missing CPI → physically impossible)

- earn-vault C-02 harvest (61407a3) — operator-supplied yield_amount
- pomm H-01 collect_fees (600c647) — operator-supplied fees
- pomm C-01+C-02+C-03 mint_lp_position (db555a3) — operator-supplied oracle, no real CLMM CPI

### ADR 0018 compile-time guard (placeholder-only-runtime → compile_error gate)

- All 4 programs via `mainnet-ready` requires `audit-passed` feature flag (ping-token 2bd1c24, earn-vault+pomm+internal-swap 155284e)

## Per-program fix tallies

### ping-token (6 of 14 findings closed scaffold-side; 3 of 5 C/H)

- ✅ C-01 Registry version discriminant (b4d606a)
- ✅ C-02 Token-2022 extension allow-list (360b7ee)
- ✅ H-01 per-mint Registry PDA (2deaace)
- ✅ H-03 renounce_mint_authority (f1cfab4)
- ✅ M-02 MintInitialized event carries payer + version (d61dc76)
- ✅ L-01 compile_error guard (2bd1c24)
- TBD H-02 squads_multisig provenance (needs Squads SDK CPI — architectural)
- TBD M-01/M-03/M-04, L-02/L-03, I-01/I-02 (lower-priority follow-ups)

### earn-vault (7 of 22 findings closed scaffold-side; 7 of 9 C/H)

- ✅ All 4 Criticals: C-01 inflation (80d0a50), C-02 harvest disable (61407a3), C-03 init constraints (2c35aee), C-04 PDA bound (f7ea54f)
- ✅ H-01 DO-NOT-DEPLOY banner (29d8b33) + L-01 compile-time guard (155284e)
- ✅ H-03 unstake-not-paused (2ebfba9), H-04 rotate_authority (2d89968)
- TBD H-02 multisig + 7d timelock on pause, H-05 solvency invariant — both #61 rebuild

### internal-swap (7 of 23 findings closed scaffold-side; 7 of 11 C/H)

- ✅ Criticals: C1 banner (ba8977e), C3 quote-from-real-vaults (8e77f7c), C4 init constraints (564e6af), C5 PDA bound (d238aa7) + L-01 compile-time guard (155284e)
- ✅ Highs: H-01 rotate_authority (23d62cc), H-03 slippage protection (33862f7)
- TBD C2 placeholder declare_id (founder gate at Squads keypair gen)
- TBD H-02 multisig enforcement, H-04 Pyth oracle integration, H-05 oracle accounts, H-06 pause accountability — all architectural

### pomm (9 of 18 findings closed scaffold-side; **9 of 9 C/H ALL CLOSED**)

- ✅ All 4 Criticals: C-01+C-02+C-03 mint_lp_position hard-disabled (db555a3), C-04 daily cap accountant (1f995d7)
- ✅ All 5 Highs: H-01 collect_fees disabled (600c647), H-02 Treasury PDA bound (c530322), H-03 rotate_authority (b464d17), H-04 emergency_withdraw destination constraint (a6f48e0), H-05 init constraints (2f10110)
- ✅ Banner (3a2d1b5 → 1432c7c) + L-01 compile-time guard (155284e)
- TBD M/L/I lower-priority follow-ups

## Mainnet deploy gates (founder-business per #22)

1. Cayman Foundation incorporation completed
2. OtterSec audit retainer engaged + remaining critical/high findings remediated
3. Streamflow vesting contracts deployed for $PING TGE schedule
4. Real program keypair generated by Squads multisig (replaces placeholder declare_id; requires `mainnet-ready,audit-passed` feature combo)

## Pointers

- EPIC: [ping-cash#22](https://github.com/ping-cash/ping-cash/issues/22)
- earn-vault rebuild per-Wave: [ping-cash#61](https://github.com/ping-cash/ping-cash/issues/61)
- ADR 0018 (DO-NOT-DEPLOY guard pattern): [docs/adr/0018](../adr/0018-anchor-scaffolds-do-not-deploy.md)
- ADR 0019 (multisig custody): [docs/adr/0019](../adr/0019-transfer-claim-bridge-and-reconciler.md)

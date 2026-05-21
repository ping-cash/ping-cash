# Session: Rebrand Cash → Ping + Docs Consolidation

**Date:** 2026-05-21
**Participants:** Founder (Emrah) + Claude (Opus 4.7)
**Outcome:** Brand renamed; repo migrated; docs tree consolidated to canonical shape.

---

## What Happened

### 1. Domain Brainstorm (7,030 candidates)

Founder's original placeholder domain (`sociable.cash`) was taken. We ran a combinatorial domain search across `.com`, `.app`, `.money`, `.io`, `.cash`:

- Generated 7,030 candidate names from ESL-friendly word lists (basic English verbs × social nouns × money words × possessives × prefixes × suffixes)
- Bulk-checked `.com` availability via DNS (NXDOMAIN heuristic, 6 public resolvers in round-robin)
- Cross-checked the 1,161 `.com`-free candidates on `.app` / `.money` / `.io` / `.cash`
- Applied brand-safety filter: rejected TM substrings (`paypal`, `venmo`, `stripe`...) and negative connotations (`gang`, `klan`...)
- Ranked by length × decomposition strength × TLD-lockability

Founder rejected several iterations:
- "Too India-corridor specific" (ghar, apna, yaar)
- "Too family-only" (pamilya, familia, baytna)
- "Sounds like PayPal" (anything with `-pal` suffix)

Final pick: **`ping.cash`**. Brand reads "Ping" — the `.cash` TLD completes the brand-as-sentence. Universally recognizable verb in the messaging-app generation ("ping someone"). No PayPal echo.

Research artifacts archived at:
- [`../archive/2026-05-21-domain-search-results.csv`](../archive/2026-05-21-domain-search-results.csv) — 1,315 brand-safe names with TLD availability
- [`../archive/2026-05-21-domain-ranking-full.txt`](../archive/2026-05-21-domain-ranking-full.txt) — 549 candidates with full scoring breakdown

### 2. Rebrand Execution (39 files)

- `@cash/*` → `@ping/*` across all package.json + tsconfig + imports
- `"name": "cash"` → `"name": "ping"` in root package.json
- Docker tags `cash/...` → `ping/...`
- Repo URL `sociable-cloud/cash` → `ping-cash/ping-cash`
- Brand text "Cash" → "Ping" everywhere it's a brand name (NOT where "cash" is the generic noun: cash-in, cash-out, GCash, JazzCash, Cash App, Chipper Cash, OXXO Cash, physical cash, cash pickup, cash flow — all preserved)

### 3. Security: PAT Cleanup

Found a GitHub Personal Access Token (`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`) checked into the old `CLAUDE.md`. Removed from the new file; **founder must revoke at github.com/settings/tokens**. The old repo was private (limited blast radius), but the token may still be active until rotated.

### 4. GitHub Migration

- Created new repo `ping-cash/ping-cash` (founder)
- Pushed initial commit (5662f96) with all renames
- Deleted old repo `sociable-cloud/cash` (founder authorized)
- Updated local git remote URL

### 5. Folder Rename

- `/home/openova/repos/cash` → `/home/openova/repos/ping`
- Auto-memory dir copied to new project-key path: `~/.claude/projects/-home-openova-repos-ping/memory/`
- Old project-key dir kept the current-session `.jsonl` log (immutable — sessions key off start-time CWD)

### 6. Docs Consolidation (this session's final scope)

Per [user-global CLAUDE.md §11](https://github.com/openova-io/openova/blob/main/CLAUDE.md), brought `docs/` into canonical shape:

**Fold map:**

| Predecessor | → Successor | Treatment |
|---|---|---|
| `docs/API.md` (1039L) | `docs/ARCHITECTURE.md § API Reference` | Inline merge, audit-trail header |
| `docs/DATABASE.md` (865L) | `docs/ARCHITECTURE.md § Data Layer` | Inline merge |
| `docs/FLOWS.md` (555L) | `docs/ARCHITECTURE.md § User Journeys` | Inline merge |
| `docs/NFR.md` (1356L) | Split: `ARCHITECTURE.md` (design patterns, infra), `SECURITY.md` (security req), `SRE.md` (perf/SLO) | Split by topic |
| `docs/BUSINESS.md` (417L) | `docs/BUSINESS-STRATEGY.md` | Inline merge |
| `docs/STRATEGY.md` (519L) | `docs/BUSINESS-STRATEGY.md` | Inline merge |
| `docs/COMPETITORS.md` (343L) | `docs/BUSINESS-STRATEGY.md` | Inline merge |
| `docs/CASHFLOW.md` (465L) | Split: country fee tables → `BUSINESS-STRATEGY.md`, on/off-ramp arch → `ARCHITECTURE.md` | Split by topic |
| `docs/DEV-ENVIRONMENT.md` (528L) | `docs/RUNBOOKS.md` | Inline merge |

**New keepers created:** `PRINCIPLES.md`, `DOD.md`, `STATUS.md`, `SECURITY.md`, `SRE.md`, `GLOSSARY.md`, `ROADMAP.md`.

**Subdirectories established:** `adr/` (5 seed ADRs), `ledger/` (TRUST + TRACKER), `lessons-learned/`, `runbooks/`, `proposals/`, `sessions/`, `archive/`.

**Files retired (git rm):** API.md, DATABASE.md, FLOWS.md, NFR.md, BUSINESS.md, STRATEGY.md, COMPETITORS.md, CASHFLOW.md, DEV-ENVIRONMENT.md.

**Top-level docs/ before:** 10 flat files (no subdirs, README references missing/duplicate).
**Top-level docs/ after:** 10 keepers + 7 subdirs, README is a tree-view, every file referenced exactly once.

---

## Decisions Recorded as ADRs

1. [`adr/0001-stablecoin-rails-on-solana.md`](../adr/0001-stablecoin-rails-on-solana.md)
2. [`adr/0002-istio-service-mesh.md`](../adr/0002-istio-service-mesh.md)
3. [`adr/0003-cap-database-split.md`](../adr/0003-cap-database-split.md)
4. [`adr/0004-privy-mpc-wallets.md`](../adr/0004-privy-mpc-wallets.md)
5. [`adr/0005-transfi-primary-offramp.md`](../adr/0005-transfi-primary-offramp.md)

---

## Open Items for Founder

1. **REVOKE the leaked PAT** at https://github.com/settings/tokens (the `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` token found in old CLAUDE.md)
2. **Register `ping.cash`** at a registrar (Namecheap ~$25/yr · Spaceship ~$30/yr · Dynadot ~$35/yr)
3. **Defensive registrations** (optional): `ping.app`, `ping.money`, `ping.io` — most are likely taken; verify before chasing
4. **External service provisioning** (per [TRACKER.md § Blockers](../ledger/TRACKER.md#blockers-external)): Privy, TransFi, Twilio, WhatsApp Business, Persona, Civo/Vultr, Doppler/Vault

---

## What's Next

1. Founder provisions external accounts (above)
2. First service to build: `auth-service` (phone OTP → JWT → Privy wallet) — per [STATUS.md § Pillar 1](../STATUS.md)
3. Walk the Phase 1 surfaces on a fresh Civo prov; flip [TRUST.md](../ledger/TRUST.md) rows as each pillar passes

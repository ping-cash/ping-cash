# CLAUDE.md — Ping repo

**Read order for an agent landing in this repo:**

1. [README.md](README.md) — 1-page entry
2. [docs/GLOSSARY.md](docs/GLOSSARY.md) — terminology + banned terms
3. [docs/STATUS.md](docs/STATUS.md) — what's built today vs design
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — full technical design
5. [docs/PRINCIPLES.md](docs/PRINCIPLES.md) — engineering rules + anti-pattern catalog
6. [docs/DOD.md](docs/DOD.md) — definition of done

Generic engineering principles live in user-global [`~/.claude/CLAUDE.md`](https://github.com/openova-io/openova/blob/main/CLAUDE.md). This file documents only Ping-specifics.

---

## Repo Identity

- **Brand:** Ping
- **Primary domain:** ping.cash
- **GitHub:** [github.com/ping-cash/ping-cash](https://github.com/ping-cash/ping-cash)
- **Local path:** `/home/openova/repos/ping`
- **Memory:** `~/.claude/projects/-home-openova-repos-ping/memory/`

## Repo Kind

**Product repo (per user-global §0.C).** Ships Blueprints (`bp-ping:<semver>`) to the OpenOva Sovereign at [`openova-io/openova-private`](https://github.com/openova-io/openova-private). We do NOT operate our own K8s cluster, Istio mesh, or observability stack — the Sovereign provides them. See [ADR 0006](docs/adr/0006-deployment-via-openova-sovereign.md).

**Cardinal facts:**
- Code → CI build → `ghcr.io/ping-cash/<service>:<sha>` → Blueprint version bump PR against `openova-io/openova-private` → Flux reconciles
- No local builds ship anywhere; CI is the only build path (per user-global §4.3)
- All deployment goes through `openova-private`; we do NOT deploy directly anywhere else
- Repo can be **temporarily flipped to public** for unlimited GitHub Actions iOS builds (`gh repo edit --visibility public`); secrets are in OpenBao on the Sovereign, not in the repo, so visibility toggling is safe

## Sub-Agent Cap

Default ceiling = 5 (per user-global §5). Reserve the 5th slot for high-confidence dispatches with concrete code-shippable scope. Hold at 4 if unsure.

---

## Dev Commands

There is no local backend stack. Code → push → CI builds → Flux deploys to the Sovereign → operator walks on the dev environment.

```bash
pnpm install              # Install workspace TS deps (no databases)
pnpm typecheck            # Same check CI runs
pnpm lint
pnpm test                 # Unit tests (no external services required)

pnpm dev:mobile           # Expo simulator for UI work
pnpm dev:mobile:tunnel    # Expo via localtunnel (iPhone behind corporate VPN)
```

Mobile-app specifics → [`apps/mobile/README.md`](apps/mobile/README.md). Network-tunnel setup → [`docs/RUNBOOKS.md § Network Configuration`](docs/RUNBOOKS.md#network-configuration).

---

## Workspace Naming

| Path | Package |
|---|---|
| `packages/types` | `@ping/types` |
| `packages/config` | `@ping/config` |
| `packages/utils` | `@ping/utils` |
| `services/<name>` | `@ping/<name>-service` |
| `apps/mobile` | `@ping/mobile` |

When creating a new service, scaffold from `services/transfer` (template) and add an entry to [docs/ARCHITECTURE.md § Service Catalog](docs/ARCHITECTURE.md#service-catalog).

---

## Repo-Specific Banned Terms

Full list in [docs/GLOSSARY.md § Banned Terms](docs/GLOSSARY.md#banned-terms-do-not-use). Top hits:

| Banned | Why |
|---|---|
| **"Cash"** as the product/brand | Pre-rebrand name (Cash → Ping on 2026-05-21). `cash-in` / `cash-out` as generic financial terms are fine. |
| **"-pal" suffix** in any naming | PayPal-trained association; UDRP target |
| **"PayPal" / "Venmo" / "Stripe" / "Wise"** in product naming | Fintech TM minefield |
| **`STATE.md` / `WORK-LOG.md` / multi-status files** | Single source of truth = GH Issues + auto-memory + `docs/STATUS.md` |
| **"For now" / "MVP-now-refactor-later"** | We ship target-state shape (per PRINCIPLES) |

---

## Repo-Specific Known Issues

| Issue | Workaround | Tracking |
|---|---|---|
| Expo behind corporate VPN can't be accessed from iPhone | SSH SOCKS proxy + localtunnel (NOT ngrok — auth-required) | [docs/RUNBOOKS.md § Network Configuration](docs/RUNBOOKS.md#network-configuration) |
| pnpm strict `node_modules` breaks Metro bundler | Add `node-linker=hoisted` to `.npmrc` | [docs/RUNBOOKS.md § Lessons Learned](docs/RUNBOOKS.md#lessons-learned-dev-env) |
| `@babel/runtime` peer dep missing for Expo | `pnpm add @babel/runtime` in `apps/mobile` | Same |
| iOS GHA build cap on private repos | Temporarily flip repo public: `gh repo edit --visibility public` | [ADR 0006 § iOS Build Toggle](docs/adr/0006-deployment-via-openova-sovereign.md#ios-build-toggle) |

---

## When Updating Docs

- Generic engineering rule → goes in user-global, not here
- Repo-specific banned term, file-layout fact, dev quirk → goes here
- Architecture / API / data design → `docs/ARCHITECTURE.md`
- Business / GTM / fees / competitive → `docs/BUSINESS-STRATEGY.md`
- Per-incident playbook → `docs/runbooks/<scenario>.md`
- Major decision → ADR in `docs/adr/NNNN-<slug>.md`

Always update [docs/ledger/TRUST.md](docs/ledger/TRUST.md) when a surface is walked. Always update [docs/ledger/TRACKER.md](docs/ledger/TRACKER.md) when work-in-progress status changes.

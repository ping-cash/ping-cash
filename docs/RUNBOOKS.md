# Runbooks

**WHAT:** Operator how-tos for development, build, deploy, and recovery tasks. The "I-need-to-do-X-right-now" reference.

**AUTHORITY:** 📐 PERMANENT.

Per-incident playbooks (specific failures, postmortems) live in [`runbooks/`](runbooks/) — this file is for _generic_ operator procedures.

---

## Table of Contents

1. [Mental Model: How Code Ships](#mental-model-how-code-ships)
2. [Dev Loop for Code Authoring](#dev-loop-for-code-authoring)
3. [Mobile App (Expo)](#mobile-app-expo)
4. [Network Configuration (Corporate VPN)](#network-configuration-corporate-vpn)
5. [Deploying to the Sovereign](#deploying-to-the-sovereign)
6. [iOS Build via Public Toggle](#ios-build-via-public-toggle)
7. [Common Operator Tasks](#common-operator-tasks)
8. [Troubleshooting](#troubleshooting)
9. [Lessons Learned (Dev Env)](#lessons-learned-dev-env)

---

## Mental Model: How Code Ships

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐
│  Edit code      │ →  │  Push to main   │ →  │  GitHub Actions CI          │
│  on bastion     │    │                 │    │  • matrix-build per service │
│  (TS only,      │    │                 │    │  • image → ghcr.io          │
│   no DBs)       │    │                 │    │  • publish Blueprint        │
└─────────────────┘    └─────────────────┘    │  • PR to openova-private    │
                                              └──────────┬──────────────────┘
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   openova-io/openova-private (the Sovereign)                                │
│   ├── Founder reviews + merges Blueprint SHA-bump PR                        │
│   ├── Flux reconciles                                                       │
│   └── Ping services deploy on the Sovereign's vCluster                      │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   ▼
                       ┌────────────────────────┐
                       │  Operator walks the    │
                       │  surface on the        │
                       │  Sovereign dev env     │
                       │  → screenshot          │
                       │  → flip ledger row to  │
                       │     VERIFIED-PASS      │
                       └────────────────────────┘
```

There is no local Postgres / MongoDB / Redis / Redpanda on the dev bastion. Everything that needs a real database runs against the Sovereign's dev namespace.

See [ADR 0006](adr/0006-deployment-via-openova-sovereign.md) for the full architecture.

---

## Dev Loop for Code Authoring

```bash
# Clone (already done if you're reading this on the bastion)
git clone https://github.com/ping-cash/ping-cash.git
cd ping-cash

# Install workspace TS dependencies (no DBs, no servers)
pnpm install

# Edit code in your IDE

# Run the same checks CI will run
pnpm typecheck
pnpm lint
pnpm test                # unit tests only (no external services)

# Commit + push
git add <files>
git commit -m "feat(<scope>): <summary>"
git push                 # CI takes over
```

### Unit-Test Scope

Unit tests in this repo run **without any external service**. They stub:

- HTTP clients (Privy, TransFi, Twilio, WhatsApp, Persona, Stripe, Solana RPC)
- Database access (per-service Prisma `__mocks__/` or in-memory equivalents)
- Kafka producers (the outbox is unit-testable; the publisher isn't)

Integration / E2E tests run against the **Sovereign dev environment** via a CI job that re-deploys the current SHA, waits for readiness, and walks the deterministic test paths defined in [DOD.md § Deterministic Test](DOD.md#deterministic-test-smoke-for-each-pillar).

---

## Mobile App (Expo)

The mobile app is built by CI and bundled into the Blueprint. For local UI iteration:

```bash
cd apps/mobile
pnpm install
pnpm add @babel/runtime   # known peer-dep gap

# Standard simulator mode
pnpm dev

# Tunnel mode (for physical phone behind corporate VPN — see next section)
pnpm tunnel
```

The mobile app's `lib/api.ts` defaults to `https://api.dev.ping.cash` (Sovereign dev environment). Override via `app.json` `extra.apiUrl` for one-off testing — but never commit a different value.

---

## Network Configuration (Corporate VPN)

> **Source:** previously docs/DEV-ENVIRONMENT.md § "Network Configuration" (merged here on 2026-05-21).

For testing Expo on a physical iPhone when the dev bastion is behind a corporate VPN (Cisco AnyConnect, etc.) that blocks direct connections from your phone's network:

### Solution: SSH SOCKS Proxy + Localtunnel

**Step 1: SSH Tunnel with SOCKS Proxy**

```bash
# ~/.ssh/config
Host poc-cp-bd
  DynamicForward 0.0.0.0:1080  # SOCKS5 proxy
  ...

# Start the tunnel
ssh -fN poc-cp-bd

# Verify
ss -tlnp | grep 1080
curl -x socks5://127.0.0.1:1080 https://httpbin.org/ip
```

**Step 2: Install + configure Proxychains**

```bash
sudo apt-get install -y proxychains4

sudo tee /etc/proxychains.conf << 'EOF'
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000

localnet 127.0.0.0/255.0.0.0
localnet 10.0.0.0/255.0.0.0
localnet 172.16.0.0/255.240.0.0
localnet 192.168.0.0/255.255.0.0

[ProxyList]
socks5 127.0.0.1 1080
EOF
```

**Step 3: Use Localtunnel** (NOT ngrok — ngrok now requires auth)

```bash
npm install -g localtunnel

npx expo start --port 8081 &
lt --port 8081
# → "your url is: https://random-words-here.loca.lt"
```

**Step 4: Access from iPhone**

1. Open Safari on iPhone
2. Visit `https://random-words-here.loca.lt`
3. Tap "Click to Continue" (localtunnel anti-abuse)
4. Expo dev tools load

### Why Ngrok Fails

1. Recent ngrok requires account authentication
2. Expo's bundled `@expo/ngrok` doesn't respect proxy env vars
3. Ngrok spawns as separate process, doesn't inherit `proxychains` wrapper

---

## Deploying to the Sovereign

Deploy = merge a Blueprint SHA-bump PR on `openova-io/openova-private`. The PR is created automatically by CI on every push to `main`. The founder reviews + merges. Flux reconciles within ~60s.

### Manual Re-Trigger

If CI didn't auto-create the PR (e.g., a workflow file was edited but the matrix didn't run):

```bash
# Find the latest GHCR images for this SHA
gh api repos/ping-cash/ping-cash/actions/runs --jq '.workflow_runs[0]'

# Bump manually (script lives in scripts/bump-blueprint.sh once written)
./scripts/bump-blueprint.sh <sha>
```

### Rollback

Rollback = revert the bump-PR on `openova-io/openova-private`. Flux re-reconciles to the prior SHA within ~60s.

---

## iOS Build via Public Toggle

iOS Expo builds take ~20 minutes each. GitHub Actions caps free private-repo minutes (~2000/month) but provides **unlimited minutes for public repos**. The Ping repo is built to tolerate temporary public visibility:

- Source code is acceptable to publish — the brand strategy, ADRs, and architecture are not competitive secrets
- Secrets (Privy, TransFi, Twilio, WhatsApp, Persona, Stripe keys) live in **OpenBao on the Sovereign**, NEVER in this repo
- No PATs / API keys are checked in (verified during the 2026-05-21 rebrand)

```bash
# Before a build batch
gh repo edit ping-cash/ping-cash --visibility public

# Run the iOS build workflow
gh workflow run ios-build.yml

# After: optionally flip back
gh repo edit ping-cash/ping-cash --visibility private
```

> **Never** flip public if there's uncommitted work that hasn't been reviewed for secrets. Run `git diff` and `git ls-files | xargs grep -lE '(ghp_|sk_|pk_|secret_)' --include='*'` first.

---

## Common Operator Tasks

### Add a New Backend Service

1. Scaffold from `services/transfer/` template
2. `pnpm-workspace.yaml` already covers `services/*` — no edit needed
3. Add Prisma schema in `services/<name>/prisma/`
4. Add `platform/<name>/` Helm chart (mirror existing pattern)
5. Add the service to the matrix in `.github/workflows/build.yml`
6. Add the chart reference to `products/bp-ping/blueprint.yaml`
7. Update [`docs/ARCHITECTURE.md § Service Catalog`](ARCHITECTURE.md#service-catalog)
8. File an ADR in `docs/adr/` if the service introduces a new architectural pattern
9. Push → CI builds the new image → Blueprint version bumps → SHA-PR opens → founder merges → Flux deploys

### Bump a Dependency

```bash
pnpm up -r <package>                                       # All workspaces
pnpm up -r --filter @ping/transfer-service <package>       # Single workspace
git commit -am "chore: bump <package>"
git push
# CI re-runs lint + typecheck + test; rebuilds images on the new SHA
```

### Rotate a Secret

Secrets live in OpenBao on `openova-private`. To rotate:

1. Founder updates the value in OpenBao (e.g., `vault kv put ping/twilio/auth_token value=<new>`)
2. External Secrets Operator on the Sovereign picks up the change (~60s)
3. Rolling-restart consumer pods if the service caches the secret in-memory:
   ```bash
   gh workflow run rolling-restart.yml --field service=auth
   ```

### Database Migrations

Migrations run as a Helm pre-install/pre-upgrade Job (defined in each chart's `templates/migration-job.yaml`). To trigger manually outside the deploy flow:

```bash
gh workflow run db-migrate.yml --field service=transfer
```

The Job runs `prisma migrate deploy` against the Sovereign's CNPG instance using the connection string mounted from the `database-url` ExternalSecret.

### Run Integration / E2E Tests

Triggered by CI on push to `main`. To run on-demand against the current dev environment:

```bash
gh workflow run e2e.yml --field environment=dev
```

The workflow deploys the current SHA (if not already deployed) and walks the deterministic test paths.

---

## Troubleshooting

| Symptom                                         | Cause                                          | Fix                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Cannot resolve module @babel/runtime`          | Missing peer dependency in mobile app          | `pnpm add @babel/runtime` in `apps/mobile`, then `rm -rf node_modules/.cache && npx expo start --clear` |
| `ngrok tunnel took too long to connect`         | Network restrictions / auth required           | Use localtunnel with proxychains (see [Network Configuration](#network-configuration-corporate-vpn))    |
| Metro bundler can't resolve modules             | pnpm strict node_modules structure             | Add `node-linker=hoisted` to `.npmrc`                                                                   |
| CI matrix job failed for one service            | Test or lint regression                        | Check the failing job in GHA; fix locally; push fix; CI re-runs                                         |
| Blueprint SHA-bump PR never opens               | CI workflow file changed but matrix didn't run | Manually trigger `bump-blueprint.yml` or re-run the failed workflow                                     |
| Flux not reconciling after Sovereign-side merge | Flux controller lag or chart validation error  | On the Sovereign: `flux get kustomizations -n ping` (founder action)                                    |
| Pod CrashLoopBackOff after deploy               | Missing ExternalSecret value or wrong env var  | Check pod logs via Sovereign Grafana / Loki; verify OpenBao path exists                                 |

---

## Lessons Learned (Dev Env)

> **Source:** previously docs/DEV-ENVIRONMENT.md § "Summary of Lessons Learned" (merged here on 2026-05-21, updated 2026-05-22 for Sovereign-deploy model).

1. **Builds always go through CI.** Never `docker build` on the bastion — the resulting image isn't reproducible from a committed SHA, violating the IaC-First principle ([PRINCIPLES § 3](PRINCIPLES.md#3-ci-is-the-only-build-path)).
2. **Deploys always go through Flux.** Never `kubectl apply` against the Sovereign — drift will be reconciled away, and the change is invisible to the audit trail.
3. **Ngrok requires auth.** Use localtunnel as the alternative for Expo physical-device testing.
4. **Proxy routing matters.** Use proxychains for applications that don't respect env proxy vars.
5. **Babel runtime.** Expo apps may need explicit `@babel/runtime` dependency.
6. **Cache clearing.** When bundling fails: `rm -rf node_modules/.cache .expo`
7. **Localtunnel reverse tunnels** simplify corporate-firewall workarounds (VM connects OUT instead of inbound).
8. **pnpm + Metro.** pnpm's strict `node_modules` structure breaks Metro; add `node-linker=hoisted` to `.npmrc`.
9. **iOS build minutes.** Temporary public-repo toggle gives unlimited GitHub Actions minutes for iOS builds (see [iOS Build via Public Toggle](#ios-build-via-public-toggle)).
10. **No local databases.** The dev bastion is for code authoring only — Postgres/Mongo/Redis/Redpanda run on the Sovereign.

For deeper post-incident lessons, see [`lessons-learned/`](lessons-learned/).

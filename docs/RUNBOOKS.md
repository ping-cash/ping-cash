# Runbooks

**WHAT:** Operator how-tos for everyday development, deployment, and recovery tasks. The "I-need-to-do-X-right-now" reference.

**AUTHORITY:** 📐 PERMANENT.

This document was consolidated on 2026-05-21 from:
- `docs/DEV-ENVIRONMENT.md` (development environment setup)

Per-incident playbooks (specific failures, postmortems) live in [runbooks/](runbooks/) — this file is for *generic* operator procedures.

---

## Table of Contents

1. [Machine Requirements](#machine-requirements)
2. [First-Time Setup](#first-time-setup)
3. [Local Development](#local-development)
4. [Mobile App (Expo)](#mobile-app-expo)
5. [Network Configuration](#network-configuration)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)
8. [Common Operator Tasks](#common-operator-tasks)
9. [Lessons Learned (Dev Env)](#lessons-learned-dev-env)

---

## Machine Requirements

> **Source:** previously docs/DEV-ENVIRONMENT.md § "Machine Requirements" (merged here on 2026-05-21).

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 2 cores | 4 cores |
| RAM | 8 GB | 16 GB |
| Disk | 20 GB free | 40 GB free |
| OS | Ubuntu 22.04 | Ubuntu 22.04 |

### Memory Budget

```
PostgreSQL:        ~200 MB
MongoDB:           ~300 MB
Redis:             ~100 MB
Redpanda:          ~1 GB (configured limit)
Redpanda Console:  ~100 MB
MailHog:           ~50 MB
────────────────────────
Subtotal:          ~1.75 GB

+ Node.js services: ~500 MB
+ Expo Metro:       ~500 MB
────────────────────────
Grand Total:       ~2.75 GB
```

### Required Tools

```bash
sudo apt-get update && sudo apt-get install -y docker-compose-plugin
npm install -g pnpm

# Verify
docker compose version  # v5.0.0+
pnpm --version          # v9.0.0+
node --version          # v20+
```

---

## First-Time Setup

```bash
git clone https://github.com/ping-cash/ping-cash.git
cd ping-cash

# Install
pnpm install

# Start infra (PostgreSQL, MongoDB, Redis, Redpanda, MailHog)
pnpm docker:up

# Run database migrations
pnpm db:migrate

# Start dev servers
pnpm dev
```

---

## Local Development

### Port Mappings

| Service | Internal | External | Notes |
|---|---|---|---|
| PostgreSQL | 5432 | **5433** | Changed to avoid SSH tunnel conflict |
| MongoDB | 27017 | 27017 | |
| Redis | 6379 | 6379 | |
| Redpanda (Kafka) | 9092 | 19092 | |
| Redpanda Console | 8080 | 8080 | Web UI |
| MailHog SMTP | 1025 | 1025 | Email testing |
| MailHog Web | 8025 | 8025 | |

### Credentials (Local Dev Only)

| Service | Username | Password |
|---|---|---|
| PostgreSQL | ping | ping |
| MongoDB | ping | ping |

> **Never use these credentials in any environment outside local dev.** Production secrets live in Doppler/Vault and are mounted via External Secrets Operator — see [ARCHITECTURE.md § Secrets Management](ARCHITECTURE.md#secrets-management).

### Frontend-Only Mode

If you're only working on mobile UI, skip the backend services:

```bash
cd apps/mobile
npx expo start --port 8081
lt --port 8081  # For iPhone access (see Network Configuration)
```

The mobile app will show **Backend Status: Disconnected** — this is expected and the UI still works.

### Stop Everything

```bash
pnpm docker:down
pkill -f "expo start"
pkill -f "lt --port"
```

---

## Mobile App (Expo)

### Project Setup

```bash
cd apps/mobile
pnpm install
pnpm add @babel/runtime  # Required runtime dependency
```

### Running

```bash
# From project root
pnpm dev:mobile         # Standard mode
pnpm dev:mobile:tunnel  # Tunnel mode (external access)

# Or directly
cd apps/mobile
npx expo start
npx expo start --tunnel
```

### Environment URLs

| Service | URL |
|---|---|
| Expo Metro | http://localhost:8081 |
| Expo Web | http://localhost:8081 |
| Localtunnel | https://xxx.loca.lt |
| PostgreSQL | localhost:5433 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |
| Redpanda Console | http://localhost:8080 |
| MailHog | http://localhost:8025 |

---

## Network Configuration

> **Source:** previously docs/DEV-ENVIRONMENT.md § "Network Configuration" (merged here on 2026-05-21).

### Corporate Network with VirtualBox + Corporate VPN

Scenario: Windows host → VirtualBox VM on host-only network (192.168.47.x) → iPhone on WiFi (192.168.100.x), Corporate VPN (Cisco AnyConnect) blocking direct connections.

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

**Step 2: Install & Configure Proxychains**

```bash
sudo apt-get install -y proxychains4

sudo tee /etc/proxychains.conf << 'EOF'
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000

# Skip local addresses
localnet 127.0.0.0/255.0.0.0
localnet 10.0.0.0/255.0.0.0
localnet 172.16.0.0/255.240.0.0
localnet 192.168.0.0/255.255.0.0

[ProxyList]
socks5 127.0.0.1 1080
EOF
```

**Step 3: Use Localtunnel Instead of Ngrok**

Ngrok requires authentication. Localtunnel creates a reverse tunnel (VM connects OUT) — usually works without proxychains.

```bash
npm install -g localtunnel

# Start Expo first
npx expo start --port 8081 &

# Start localtunnel
lt --port 8081
# → "your url is: https://random-words-here.loca.lt"
```

**Step 4: Access from iPhone**

1. Open Safari on iPhone
2. Go to: `https://random-words-here.loca.lt`
3. Click the "Click to Continue" button (localtunnel anti-abuse)
4. Expo dev tools load

### Why Ngrok Failed

1. **Auth required:** Recent ngrok versions require account authentication
2. **Proxy issues:** Expo's bundled `@expo/ngrok` doesn't respect proxy env vars
3. **Child process:** Ngrok spawns as separate process, doesn't inherit proxychains wrapper

### Alternative Solutions

**Option A: Windows Port Forwarding** (if you have Windows admin)

```powershell
# Run as Administrator
netsh interface portproxy add v4tov4 `
  listenport=8081 listenaddress=192.168.100.9 `
  connectport=8081 connectaddress=192.168.47.20

netsh advfirewall firewall add rule name="Expo" `
  dir=in action=allow protocol=tcp localport=8081
```

Then on VM:

```bash
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.100.9 npx expo start
```

iPhone connects to `exp://192.168.100.9:8081`.

**Option B: Reverse SSH Tunnel** (if you have a public server)

```bash
ssh -R 0.0.0.0:8081:localhost:8081 your-server.com
```

---

## Quick Reference

### Start Development Environment

```bash
# 1. Start infrastructure
pnpm docker:up

# 2. Start backend services (when implemented)
pnpm dev:services

# 3. Start mobile app
cd apps/mobile
npx expo start --port 8081

# 4. Tunnel for iPhone access
lt --port 8081
# Use the URL provided; password is your VM's public IP: curl -s https://ifconfig.me
```

### Diagnostic Commands

```bash
# Check port usage
sudo ss -tlnp | grep :PORT

# Check docker containers
docker compose ps
docker logs ping-postgres

# Check SSH tunnel
ps aux | grep "ssh -fN"

# Test SOCKS proxy
curl -x socks5://127.0.0.1:1080 https://httpbin.org/ip

# Test localtunnel connectivity
curl https://your-tunnel-url.loca.lt
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot resolve module @babel/runtime` | Missing peer dependency | `pnpm add @babel/runtime` in `apps/mobile`, then `rm -rf node_modules/.cache && npx expo start --clear` |
| `ngrok tunnel took too long to connect` | Network restrictions / auth required | Use localtunnel with proxychains (see Network Configuration) |
| PostgreSQL container exits with "Permission denied" | Init script not readable | `chmod 644 scripts/init-postgres.sql && docker compose down && docker volume rm ping_postgres_data && docker compose up -d` |
| `Address already in use` for port 5432 | SSH tunnel using the port | Change port in `docker-compose.yml` to `5433:5432` |
| Expo web preview not working | Missing web deps | `npx expo install react-native-web react-dom` |
| Metro bundler can't resolve modules | pnpm strict node_modules structure | Add `node-linker=hoisted` to `.npmrc` |

---

## Common Operator Tasks

### Add a New Backend Service

1. Scaffold from `services/transfer` template
2. Update `pnpm-workspace.yaml` (already covers `services/*`)
3. Add Prisma schema in `services/<name>/prisma/`
4. Add Dockerfile + GitHub Actions matrix entry
5. Update `docs/ARCHITECTURE.md` Service Catalog table
6. File ADR in `docs/adr/` if the service introduces a new pattern

### Bump a Dependency

```bash
pnpm up -r <package>          # All workspaces
pnpm up -r --filter @ping/transfer-service <package>  # Single workspace
```

### Rotate a Secret

1. Update value in Doppler/Vault (do NOT commit to repo)
2. Trigger External Secrets Operator sync (typically <60s)
3. Rolling-restart consumer pods if needed

### Database Migrations

PostgreSQL (Prisma):
```bash
pnpm --filter @ping/transfer-service db:migrate:create add_kyc_tier
pnpm --filter @ping/transfer-service db:migrate:deploy
pnpm --filter @ping/transfer-service db:generate
```

MongoDB (one-shot scripts in `migrations/`):
```bash
node migrations/001_add_kyc_tier.js
```

### Cluster Lifecycle

Use Civo/Vultr console for now. Future: Crossplane Compositions for declarative cluster lifecycle (see [adr/](adr/) for decision records).

---

## Lessons Learned (Dev Env)

> **Source:** previously docs/DEV-ENVIRONMENT.md § "Summary of Lessons Learned" (merged here on 2026-05-21).

1. **Port conflicts.** Always check existing port usage before starting containers: `sudo ss -tlnp | grep -E ':(5432|27017|6379|8080)'`
2. **File permissions.** Docker mounted files need appropriate read permissions even with `:ro` mode.
3. **Ngrok limitations.** Modern ngrok requires auth; use localtunnel as alternative.
4. **Proxy routing.** Use proxychains for applications that don't respect env proxy vars.
5. **Localnet exclusions.** Configure proxychains to skip localhost connections.
6. **Babel runtime.** Expo apps may need explicit `@babel/runtime` dependency.
7. **Cache clearing.** When bundling fails: `rm -rf node_modules/.cache .expo`
8. **Localtunnel reverse tunnels.** Localtunnel connects OUT from VM, simpler than forward proxying.
9. **pnpm + Metro.** pnpm's strict `node_modules` structure breaks Metro; add `node-linker=hoisted` to `.npmrc`.
10. **Reverse tunnels save complexity.** Prefer over forward proxying when working through corporate firewalls.

For deeper post-incident lessons, see [lessons-learned/](lessons-learned/).

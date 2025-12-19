# Development Environment Setup

This document covers the complete development environment setup for the Cash platform, including lessons learned and workarounds for common issues.

---

## Table of Contents

1. [Machine Requirements](#machine-requirements)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Mobile Development with Expo](#mobile-development-with-expo)
4. [Network Configuration](#network-configuration)
5. [Troubleshooting](#troubleshooting)
6. [Quick Reference](#quick-reference)

---

## Machine Requirements

### Minimum Specs (Development)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 8 GB | 16 GB |
| Disk | 20 GB free | 40 GB free |
| OS | Ubuntu 22.04 | Ubuntu 22.04 |

### Memory Budget for Dev Containers

```
PostgreSQL:       ~200 MB
MongoDB:          ~300 MB
Redis:            ~100 MB
Redpanda:         ~1 GB (configured limit)
Redpanda Console: ~100 MB
MailHog:          ~50 MB
────────────────────────
Total:            ~1.75 GB

+ Node.js services: ~500 MB
+ Expo Metro:       ~500 MB
────────────────────────
Grand Total:      ~2.75 GB
```

### Required Tools

```bash
# Install docker-compose plugin
sudo apt-get update && sudo apt-get install -y docker-compose-plugin

# Install pnpm
npm install -g pnpm

# Verify
docker compose version  # v5.0.0+
pnpm --version          # v9.0.0+
node --version          # v20+
```

---

## Infrastructure Setup

### Docker Compose Services

Start all infrastructure:

```bash
pnpm docker:up  # or: docker compose up -d
```

**Port Mappings:**

| Service | Internal Port | External Port | Notes |
|---------|---------------|---------------|-------|
| PostgreSQL | 5432 | **5433** | Changed from 5432 to avoid SSH tunnel conflict |
| MongoDB | 27017 | 27017 | |
| Redis | 6379 | 6379 | |
| Redpanda (Kafka) | 9092 | 19092 | |
| Redpanda Console | 8080 | 8080 | Web UI |
| MailHog SMTP | 1025 | 1025 | Email testing |
| MailHog Web | 8025 | 8025 | |

### Port Conflict Resolution

**Problem:** Port 5432 was already in use by SSH tunnel.

**Solution:** Changed PostgreSQL external port to 5433 in docker-compose.yml:

```yaml
postgres:
  ports:
    - "5433:5432"  # External:Internal
```

**Lesson Learned:** Always check for port conflicts before starting containers:

```bash
sudo ss -tlnp | grep -E ':(5432|27017|6379|8080)'
```

### Init Script Permissions

**Problem:** PostgreSQL init script failed with "Permission denied".

**Solution:** Fix file permissions:

```bash
chmod 644 scripts/init-postgres.sql scripts/init-mongo.js
```

**Lesson Learned:** Docker mounts with `:ro` still need read permissions for all users.

---

## Mobile Development with Expo

### Project Setup

The mobile app uses Expo with:
- expo-router for navigation
- @tanstack/react-query for data fetching
- zustand for state management

```bash
# Install dependencies
cd apps/mobile
pnpm install

# Required runtime dependency
pnpm add @babel/runtime
```

### Running Expo

```bash
# From project root
pnpm dev:mobile         # Standard mode
pnpm dev:mobile:tunnel  # Tunnel mode (for external access)

# Or directly
cd apps/mobile
npx expo start
npx expo start --tunnel
```

---

## Network Configuration

### Corporate Network Challenge

**Scenario:**
- Windows host machine with VirtualBox
- VM on host-only network (192.168.47.x)
- iPhone on WiFi network (192.168.100.x)
- Corporate VPN (Cisco AnyConnect) blocking direct connections

```
┌─────────────────────────────────────────────────────────┐
│                 WiFi Network (192.168.100.x)            │
│  ┌─────────────┐                 ┌─────────────┐        │
│  │   iPhone    │                 │   Windows   │        │
│  │             │                 │ 192.168.100.9│       │
│  └─────────────┘                 └──────┬──────┘        │
└──────────────────────────────────────────┼──────────────┘
                                           │
                         ┌─────────────────┼──────────────┐
                         │   Host-Only (192.168.47.x)     │
                         │                 │              │
                         │          ┌──────▼──────┐       │
                         │          │   Windows   │       │
                         │          │ 192.168.47.1│       │
                         │          └──────┬──────┘       │
                         │                 │              │
                         │          ┌──────▼──────┐       │
                         │          │     VM      │       │
                         │          │192.168.47.20│       │
                         │          └─────────────┘       │
                         └────────────────────────────────┘
```

### Solution: SSH SOCKS Proxy + Localtunnel

**Step 1: SSH Tunnel with SOCKS Proxy**

The VM already has an SSH tunnel to remote infrastructure with SOCKS proxy:

```bash
# In ~/.ssh/config
Host poc-cp-bd
  DynamicForward 0.0.0.0:1080  # SOCKS5 proxy
  ...
```

Start the tunnel:

```bash
ssh -fN poc-cp-bd
```

Verify SOCKS proxy:

```bash
ss -tlnp | grep 1080
curl -x socks5://127.0.0.1:1080 https://httpbin.org/ip
```

**Step 2: Install and Configure Proxychains**

```bash
# Install
sudo apt-get install -y proxychains4

# Configure to use SOCKS proxy
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

Ngrok requires authentication. Localtunnel is simpler and works directly:

```bash
# Install globally
npm install -g localtunnel

# Start Expo first
npx expo start --port 8081 &

# Start localtunnel (direct connection - no proxy needed!)
lt --port 8081
```

**Note:** Localtunnel creates a reverse tunnel - the VM connects OUT to localtunnel.me, so it usually works without proxychains even in restricted networks.

Output:

```
your url is: https://random-words-here.loca.lt
```

**Step 4: Access from iPhone**

1. Open Safari on iPhone
2. Go to: `https://random-words-here.loca.lt`
3. Click the "Click to Continue" button (localtunnel anti-abuse)
4. Expo dev tools load

### Why Ngrok Failed

1. **Auth Required:** Recent ngrok versions require account authentication
2. **Proxy Issues:** Expo's bundled @expo/ngrok doesn't respect proxy environment variables
3. **Child Process:** Ngrok spawns as separate process, doesn't inherit proxychains wrapper

### Alternative Solutions

**Option A: Windows Port Forwarding**

If you have admin access on Windows:

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

iPhone connects to: `exp://192.168.100.9:8081`

**Option B: Reverse SSH Tunnel**

If you have a publicly accessible server:

```bash
ssh -R 0.0.0.0:8081:localhost:8081 your-server.com
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot resolve module @babel/runtime"

**Cause:** Missing peer dependency.

**Fix:**

```bash
cd apps/mobile
pnpm add @babel/runtime
rm -rf node_modules/.cache
npx expo start --clear
```

#### 2. "ngrok tunnel took too long to connect"

**Cause:** Network restrictions blocking ngrok, or ngrok auth required.

**Fix:** Use localtunnel with proxychains instead (see above).

#### 3. PostgreSQL container exits with "Permission denied"

**Cause:** Init script not readable.

**Fix:**

```bash
chmod 644 scripts/init-postgres.sql
docker compose down
docker volume rm cash-local_postgres_data
docker compose up -d
```

#### 4. "Address already in use" for port 5432

**Cause:** Another service (often SSH tunnel) using the port.

**Fix:** Change the port in docker-compose.yml:

```yaml
ports:
  - "5433:5432"
```

#### 5. Expo web preview not working

**Cause:** Missing web dependencies.

**Fix:**

```bash
npx expo install react-native-web react-dom
```

### Diagnostic Commands

```bash
# Check port usage
sudo ss -tlnp | grep :PORT

# Check docker containers
docker compose ps
docker logs cash-postgres

# Check SSH tunnel
ps aux | grep "ssh -fN"

# Test SOCKS proxy
curl -x socks5://127.0.0.1:1080 https://httpbin.org/ip

# Test localtunnel connectivity
curl https://your-tunnel-url.loca.lt
```

---

## Quick Reference

### Start Development Environment

```bash
# 1. Start infrastructure (databases, message queue, etc.)
pnpm docker:up

# 2. Start backend services (when implemented)
pnpm dev:services

# 3. Start mobile app
cd apps/mobile
npx expo start --port 8081

# 4. Start tunnel for iPhone access (in another terminal)
lt --port 8081
# Note: Use the URL provided and your VM's public IP as password
# Get your IP: curl -s https://ifconfig.me
```

**Frontend-only development:**
```bash
# Skip steps 1-2 if only working on mobile UI
cd apps/mobile
npx expo start --port 8081
lt --port 8081  # For iPhone access
```

### Stop Everything

```bash
# Stop containers
pnpm docker:down

# Kill background processes
pkill -f "expo start"
pkill -f "lt --port"
```

### Environment URLs

| Service | URL |
|---------|-----|
| Expo Metro | http://localhost:8081 |
| Expo Web | http://localhost:8081 |
| Localtunnel | https://xxx.loca.lt |
| PostgreSQL | localhost:5433 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |
| Redpanda Console | http://localhost:8080 |
| MailHog | http://localhost:8025 |

### Mobile App Status Indicators

When you open the mobile app, you'll see a **Backend Status** indicator:

| Status | Meaning |
|--------|---------|
| ✅ Connected | Backend services are running and healthy |
| ❌ Disconnected | Backend services not running (expected during frontend-only development) |

**Note:** "Backend Status: Disconnected" is expected when:
- Backend services (auth-service, transfer-service, etc.) haven't been started
- You're only working on mobile UI development
- Infrastructure is running but application services aren't

The mobile app will function for UI development even without backend connectivity.

### Credentials

| Service | Username | Password |
|---------|----------|----------|
| PostgreSQL | cash | cash |
| MongoDB | cash | cash |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      iPhone (any network)                   │
│                              │                              │
│                     ┌────────▼────────┐                     │
│                     │   loca.lt URL   │                     │
│                     └────────┬────────┘                     │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                    Localtunnel.me Cloud                     │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                         Internet                            │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│               SSH Tunnel (SOCKS Proxy :1080)                │
│  VM ─────────► poc-bd ─────────► Remote Infrastructure      │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                    VM (192.168.47.20)                       │
│                              │                              │
│  ┌───────────────────────────▼────────────────────────┐     │
│  │              proxychains4 lt --port 8081           │     │
│  └───────────────────────────┬────────────────────────┘     │
│                              │                              │
│  ┌───────────────────────────▼────────────────────────┐     │
│  │         Expo Metro Bundler (localhost:8081)        │     │
│  │                    React Native App                │     │
│  └───────────────────────────┬────────────────────────┘     │
│                              │                              │
│  ┌───────────────────────────▼────────────────────────┐     │
│  │              Backend Services (future)             │     │
│  │     auth:3001   transfer:3002   claim:3003         │     │
│  └───────────────────────────┬────────────────────────┘     │
│                              │                              │
│  ┌───────────────────────────▼────────────────────────┐     │
│  │              Docker Containers                     │     │
│  │  postgres:5433  mongo:27017  redis:6379            │     │
│  │  redpanda:19092  mailhog:8025                      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary of Lessons Learned

1. **Port Conflicts:** Always check for existing port usage before starting containers
2. **File Permissions:** Docker mounted files need appropriate read permissions
3. **Ngrok Limitations:** Modern ngrok requires auth; use localtunnel as alternative
4. **Proxy Routing:** Use proxychains for applications that don't respect env proxy vars
5. **Localnet Exclusions:** Configure proxychains to skip localhost connections
6. **Babel Runtime:** Expo apps may need explicit @babel/runtime dependency
7. **Cache Clearing:** When bundling fails, clear caches: `rm -rf node_modules/.cache .expo`
8. **Localtunnel:** Simple alternative to ngrok; uses reverse tunnel so usually works directly without proxy
9. **pnpm + Metro:** pnpm's strict node_modules structure breaks Metro bundler; add `node-linker=hoisted` to `.npmrc` to fix
10. **Reverse Tunnels:** Localtunnel connects OUT from VM → saves complexity vs forward proxying

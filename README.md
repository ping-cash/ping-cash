# Ping

**The cheapest way to send money anywhere.** Worldwide P2P social money network. Send to anyone — friends, family, colleagues, neighbors — instantly, for free between users.

- **Zero fees in-network** · USDC → USDC on Solana, sub-cent settlement
- **Sub-1% cash-out** · Mobile wallets (GCash, M-Pesa, …), bank, cash pickup
- **No app to receive** · Recipient claims via WhatsApp link, verifies phone OTP
- **40+ countries** · Initial corridors: GCC → Philippines, India, Pakistan, Bangladesh, Egypt, Kenya
- **Primary domain:** [ping.cash](https://ping.cash)
- **Repository:** [github.com/ping-cash/ping-cash](https://github.com/ping-cash/ping-cash)

---

## The Problem

| Service | Fee to send $200 | Speed |
|---|---|---|
| Western Union | $10-15 (5-7%) | 1-3 days |
| Bank wire | $25-50 | 3-5 days |
| PayPal | $6-10 (3-5%) | Instant |
| Wise | $2-4 (1-2%) | Hours |
| **Ping** | **$1-2 (<1%)** | **Seconds** |

> 300 million migrant workers send $700 billion home every year, losing **$40+ billion to fees**. We're building the rails to make that flow free.

---

## How This Repo Ships

Code lives here. Builds happen in GitHub Actions. Deployments happen via Flux on the OpenOva Sovereign at [openova-io/openova-private](https://github.com/openova-io/openova-private). There is no local backend stack.

```
push → CI matrix-builds container per service → ghcr.io/ping-cash/<svc>:<sha>
     → Blueprint bp-ping:<semver> published
     → SHA-bump PR opened against openova-io/openova-private
     → Flux on the Sovereign reconciles
     → operator walks the surface on the Sovereign dev environment
```

See [ADR 0006](docs/adr/0006-deployment-via-openova-sovereign.md) for the deployment model.

## Dev Loop

```bash
git clone https://github.com/ping-cash/ping-cash.git
cd ping-cash

# Install workspace dependencies (TypeScript tooling only — no databases)
pnpm install

# Edit code; CI runs the same checks on push
pnpm typecheck
pnpm lint
pnpm test
```

Mobile-app UI work (Expo, simulators, physical-device testing) — see [`apps/mobile/README.md`](apps/mobile/README.md). For network-tunnel setup behind a corporate VPN, see [docs/RUNBOOKS.md § Network Configuration](docs/RUNBOOKS.md#network-configuration).

---

## Repository Layout

```
ping-cash/
├── README.md             ← you are here
├── CLAUDE.md             ← agent orientation for this repo
├── docs/                 ← all documentation (see tree below)
├── packages/             ← shared TS packages
│   ├── types/            ← @ping/types
│   ├── config/           ← @ping/config
│   └── utils/            ← @ping/utils
├── services/             ← backend microservices
│   └── transfer/         ← @ping/transfer-service (template)
├── apps/                 ← client apps
│   └── mobile/           ← @ping/mobile (React Native + Expo)
├── scripts/              ← init scripts (Postgres, Mongo)
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Documentation

### 📐 Canon (read in this order)

- [GLOSSARY](docs/GLOSSARY.md) — terminology + banned terms
- [STATUS](docs/STATUS.md) — what's built today vs design
- [ARCHITECTURE](docs/ARCHITECTURE.md) — system design, services, data, APIs, flows, infra
- [PRINCIPLES](docs/PRINCIPLES.md) — engineering rules + anti-pattern catalog
- [DOD](docs/DOD.md) — definition of done (operator-walk-with-screenshot)

### 🔧 Build + operate

- [RUNBOOKS](docs/RUNBOOKS.md) — operator how-tos (dev env, troubleshooting, common tasks)
- [SECURITY](docs/SECURITY.md) — threat model, secrets policy, identity, defense-in-depth
- [SRE](docs/SRE.md) — SLOs, observability, incident severity

### 🏢 Strategy

- [BUSINESS-STRATEGY](docs/BUSINESS-STRATEGY.md) — positioning, GTM, competitive analysis, fee structure, country coverage
- [ROADMAP](docs/ROADMAP.md) — phased delivery timeline

### 🏛️ Decision records ([adr/](docs/adr/))

- [0001](docs/adr/0001-stablecoin-rails-on-solana.md) — Stablecoin rails on Solana
- [0002](docs/adr/0002-istio-service-mesh.md) — Istio service mesh over Kong/Traefik
- [0003](docs/adr/0003-cap-database-split.md) — Polyglot persistence (PostgreSQL/MongoDB/Redis)
- [0004](docs/adr/0004-privy-mpc-wallets.md) — Privy MPC for embedded wallets
- [0005](docs/adr/0005-transfi-primary-offramp.md) — TransFi as primary off-ramp provider
- [0006](docs/adr/0006-deployment-via-openova-sovereign.md) — Deployment via OpenOva Sovereign (openova-private)
- [ADR index](docs/adr/README.md)

### 🟢 Live state ([ledger/](docs/ledger/))

- [TRUST](docs/ledger/TRUST.md) — verification ledger (UNVERIFIED / PASS / FAIL / PARTIAL)
- [TRACKER](docs/ledger/TRACKER.md) — open work + DoD progress

### 📚 Operator notes

- [lessons-learned/](docs/lessons-learned/README.md) — field notes (one file per topic)
- [runbooks/](docs/runbooks/README.md) — per-incident playbooks
- [proposals/](docs/proposals/README.md) — in-flight design docs (pre-ADR)
- [sessions/](docs/sessions/) — date-stamped session artifacts
- [archive/](docs/archive/README.md) — frozen / superseded content

---

## Contributing

Open a PR. Follow [PRINCIPLES.md](docs/PRINCIPLES.md). Use `Refs #N`, not `Closes #N`, in PR bodies (issue closes only after operator-walk-with-screenshot per [DOD.md](docs/DOD.md)).

## License

Proprietary — All rights reserved.

---

**Ping** — Because sending money shouldn't cost more than the message.

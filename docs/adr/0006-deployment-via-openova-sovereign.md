# ADR 0006: Deployment via OpenOva Sovereign (openova-private)

**Status:** Accepted
**Date:** 2026-05-21

## Context

Ping needs a Kubernetes cluster with Istio service mesh, managed PostgreSQL / MongoDB / Redis / Redpanda, observability (Prometheus / Grafana / Loki / Tempo), secrets management (OpenBao), and DNS automation.

Options:

- **Operate our own cluster** (Civo / Vultr / DigitalOcean) — own Helm charts, own Istio install, own observability stack, own secrets vault, own DNS
- **Ship as Blueprints to the existing OpenOva Sovereign** at [openova-io/openova-private](https://github.com/openova-io/openova-private) — reuse the founder's existing platform infrastructure

The OpenOva Sovereign already provides:

- vCluster-isolated K8s tenants
- Cilium CNI + Istio mesh (mTLS + traffic management + observability)
- CNPG PostgreSQL with active-hot-standby
- MongoDB ReplicaSet + Redis Sentinel + Redpanda 3-broker
- Grafana Alloy + Loki + Mimir + Tempo
- OpenBao + External Secrets Operator
- Harbor registry + PowerDNS + cert-manager + external-dns
- Per-Org Gitea + Application repos
- Flux per-vCluster GitOps reconciliation

## Decision

Ping ships as a **product repo** following the OpenOva Sovereign product pattern (see [user-global CLAUDE.md §0 "Cardinal facts for product repos"](https://github.com/openova-io/openova/blob/main/CLAUDE.md)):

1. **Source code** lives in `ping-cash/ping-cash` (this repo)
2. **CI builds** matrix of container images → `ghcr.io/ping-cash/<service>:<sha>`
3. **Helm charts** live under `platform/<service>/` in this repo
4. **Blueprint** (`products/bp-ping/blueprint.yaml`) composes the charts into a versioned OCI artifact `bp-ping:<semver>`
5. **Deployment** = SHA-bump PR against `openova-io/openova-private`, where Flux reconciles
6. We do NOT operate cluster lifecycle, mesh, observability, or secrets infrastructure — the Sovereign provides those

## Consequences

**Good:**

- Zero infrastructure operational overhead — the Sovereign handles K8s, Istio, observability, secrets, DNS
- Founder's existing investment in `openova-private` is leveraged directly
- Single GitOps reconciler (Flux on the Sovereign) — no per-product Flux instances
- Multi-region BCP, zero-tx-loss replication, observability come for free
- Security baseline (mTLS, OpenBao secrets, Falco runtime, Sigstore signatures) is uniform with other products on the Sovereign

**Bad / trade-offs:**

- Coupled to the Sovereign's release cadence — if openova-private has a freeze, our deploys block too
- Our Helm charts must conform to Sovereign conventions (no Pod-level networking opinions, no StatefulSets for our own databases, etc.)
- Vertical limits: we can't scale to a separate provider without first refactoring out of the Blueprint pattern
- Operational visibility into our pods is via the Sovereign's Grafana — we don't host our own dashboards

## Alternatives Considered

- **Civo as our own cluster:** Rejected — adds operational scope (cluster lifecycle, Istio install, observability stack, OpenBao setup, DNS automation) that duplicates what the Sovereign already provides. ~$150/mo just to recreate what's already running.
- **Vultr Managed K8s:** Same rejection rationale.
- **Self-host on bare metal:** Out of scope for a consumer fintech.

## CI/CD Implementation Notes

```yaml
# .github/workflows/build.yml (target shape)
on:
  push:
    branches: [main]
jobs:
  matrix-build:
    strategy:
      matrix:
        service:
          [
            auth,
            user,
            kyc,
            transfer,
            wallet,
            fx,
            ledger,
            claim,
            offramp,
            notify,
          ]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          tags: ghcr.io/ping-cash/${{ matrix.service }}:${{ github.sha }}

  blueprint-publish:
    needs: matrix-build
    steps:
      - run: ./scripts/publish-blueprint.sh ${{ github.sha }}

  bump-sovereign:
    needs: blueprint-publish
    steps:
      - uses: peter-evans/create-pull-request@v6
        with:
          repository: openova-io/openova-private
          path: clusters/contabo-mkt/apps/ping/
          commit-message: 'bump(ping): SHA ${{ github.sha }}'
          title: 'bump(ping): ${{ github.sha }}'
          base: main
```

Image builds are per-service (matrix). Blueprint publishing is once per repo SHA. Sovereign bump is an auto-PR — founder reviews + merges; Flux reconciles.

## iOS Build Toggle

Expo iOS builds need full simulator boot (~20min). GitHub Actions caps free private-repo minutes but provides unlimited minutes for public repos. We allow the repo to be **temporarily flipped to public** during iOS build batches:

```bash
gh repo edit --visibility public
# ... run iOS builds ...
gh repo edit --visibility private  # if desired afterward
```

The brand, secrets, and runtime config are NOT in the repo (they're in OpenBao on the Sovereign), so visibility toggling is safe.

## See Also

- [user-global CLAUDE.md §0 — Cardinal facts for product repos](https://github.com/openova-io/openova/blob/main/CLAUDE.md)
- [openova-io/openova/docs/BLUEPRINT-AUTHORING.md](https://github.com/openova-io/openova/blob/main/docs/BLUEPRINT-AUTHORING.md)
- [ARCHITECTURE.md § Infrastructure](../ARCHITECTURE.md#infrastructure-kubernetes)

# bp-ping — Ping Blueprint

This directory holds the **Blueprint manifest** that gets published as the versioned OCI artifact `bp-ping:<semver>` consumed by the OpenOva Sovereign at [`openova-io/openova-private`](https://github.com/openova-io/openova-private).

## What this is (and is not)

Per [ADR 0006](../../docs/adr/0006-deployment-via-openova-sovereign.md):

- ✅ **Is:** A versioned OCI artifact composing all `platform/<service>/` Helm charts in this repo into one deployable unit
- ✅ **Is:** Rendered by CI from the [`build.yml`](../../.github/workflows/build.yml) workflow at commit-time
- ❌ **Is not:** A direct deployment manifest — Flux on the Sovereign reconciles this
- ❌ **Is not:** Hardcoded — every image tag references `__SHA__` substituted by CI

## How it gets deployed

```
ping-cash/ping-cash/main commit          (this repo)
   ▼
.github/workflows/build.yml
   ├── matrix-build per service → ghcr.io/ping-cash/<svc>-service:<sha>
   ├── render blueprint.yaml with __SHA__ + __VERSION__ substituted
   ├── publish bp-ping:<semver> OCI artifact (TODO: oras integration)
   └── open PR against openova-io/openova-private with HelmRelease
   ▼
openova-io/openova-private               (Sovereign)
   ├── Founder reviews + merges PR
   ├── Flux detects bp-ping version bump
   └── Reconciles to cluster
   ▼
Sovereign cluster runs Ping services    (live)
```

## Component activation

Each component is initially `enabled: false`. As we ship each service (auth, user, transfer, wallet, fx, ledger, claim, offramp, notify, gamification, earn-vault, token, swap, pomm, compliance), the corresponding component flips to `enabled: true` in the Blueprint and the next CI build deploys it.

Today: only `auth-service` is built and ready. The others will activate as their `platform/<service>/` charts are authored.

## Per-service image lookup

The Blueprint's `spec.imageRegistry.base + spec.components[].name` maps to:

```
auth-service          → ghcr.io/ping-cash/auth-service:<sha>
user-service          → ghcr.io/ping-cash/user-service:<sha>
transfer-service      → ghcr.io/ping-cash/transfer-service:<sha>
... etc.
```

Sovereign-side credentials for `ghcr.io` are configured via `ghcr-pull-secret` in the `ping` namespace.

## Sovereign-side dependencies

This Blueprint **depends on** but does NOT install the following Sovereign-provided infrastructure (per [ADR 0006](../../docs/adr/0006-deployment-via-openova-sovereign.md)):

- PostgreSQL (CNPG operator on Sovereign)
- MongoDB ReplicaSet (Sovereign)
- Redis Sentinel (Sovereign)
- Redpanda 3-broker (Sovereign)
- Istio service mesh + Envoy sidecars (Sovereign)
- External Secrets Operator pulling from OpenBao (Sovereign)
- cert-manager + external-dns + PowerDNS (Sovereign)
- Harbor proxy-cached `ghcr.io` (Sovereign)

If any of these are missing on the target Sovereign, the Blueprint fails to install — the Sovereign operator must provision them first.

## See Also

- [ADR 0006 — Deployment via OpenOva Sovereign](../../docs/adr/0006-deployment-via-openova-sovereign.md)
- [build.yml — CI pipeline that publishes this Blueprint](../../.github/workflows/build.yml)
- [openova-io/openova/docs/BLUEPRINT-AUTHORING.md](https://github.com/openova-io/openova/blob/main/docs/BLUEPRINT-AUTHORING.md)

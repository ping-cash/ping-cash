# ADR 0002: Istio Service Mesh

**Status:** Accepted
**Date:** 2026-05-21

## Context

Our architecture is microservices-based (auth, transfer, claim, wallet, user, notify, offramp, fx, ledger, compliance — 10+ services). We need:

- mTLS between services (zero-trust network)
- Traffic management (canary, mirror, fault injection)
- Observability (service graph, distributed tracing, golden metrics)
- Authentication / rate limiting at the edge
- Single ingress with TLS termination

Options:

- **Kong** — full-featured API gateway; service mesh requires Kuma add-on
- **Traefik** — popular ingress; service mesh requires Traefik Mesh add-on (separate product)
- **Linkerd** — lighter than Istio, but smaller feature set + smaller ecosystem
- **Istio** — full service mesh + ingress in one product; native K8s CRDs

## Decision

Use **Istio** as both the ingress gateway and the service mesh. Single tool, single learning curve, native to Kubernetes.

## Consequences

**Good:**

- Automatic mTLS between all pods (no application code change)
- Native CRDs (VirtualService, DestinationRule) for traffic management
- Built-in observability (Kiali service graph, Jaeger tracing, Prometheus metrics)
- Canary deployments + traffic shifting come for free
- Fully open-source — no enterprise feature gates
- Strong K8s integration — Istio operator handles upgrades

**Bad / trade-offs:**

- Envoy sidecar adds ~50ms p99 latency per hop (acceptable for our SLOs; see [SRE.md](../SRE.md))
- Memory overhead: ~100MB per pod for the sidecar
- Steeper learning curve than Kong/Traefik for operators new to service meshes
- Istio version upgrades historically have rough edges — pin minor versions, test in staging first
- Ambient Mesh (sidecar-less Istio) is still maturing; we use the classic sidecar model

## Alternatives Considered

- **Kong + Kuma:** Rejected — two products to operate, mTLS is plugin-based (less robust)
- **Traefik + Traefik Mesh:** Rejected — Traefik Mesh is a separate product with smaller user base
- **Linkerd:** Rejected — lighter weight but doesn't have Istio's traffic-management feature set; we want canary/mirror/fault-injection built in
- **No service mesh, ingress-only:** Rejected — service-to-service mTLS would have to be implemented in each service, doubling auth complexity

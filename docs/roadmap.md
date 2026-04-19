# Roadmap

## Access And Security

- Replace shared Basic Auth with stronger upstream authentication before any broad student or internet-facing rollout. Cloudflare Access or another identity-aware proxy is the intended direction so access can move from one shared secret to individual identities, revocation, and auditability.
- Keep the current Worker-level search throttling as lightweight protection for now, then revisit whether higher-volume usage needs upstream or durable rate limiting instead of isolate-local counters.

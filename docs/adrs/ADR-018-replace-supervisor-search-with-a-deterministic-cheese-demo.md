# ADR-018: Replace Supervisor Search With A Deterministic Cheese Demo

- Status: Accepted
- Date: 2026-04-21

## Context

This repository was originally carrying a supervisor-search application with:

- private import tooling
- Vectorize and Workers AI dependencies
- runtime admin configuration
- authentication and throttling behavior aimed at a different domain

That architecture no longer fits the actual purpose of the repo. The project now exists to support a live demonstration of challenges 1 to 3 from `french-cheese-shop`, where the presenter needs a predictable French cheese shop example that can be refined live from audience input.

The demo must stay lightweight, deterministic, and easy to run locally during a presentation.

## Decision

Replace the supervisor-search architecture with a single public Worker surface that:

- serves one French cheese shop UI with baseline plus three challenge tabs
- uses a committed deterministic cheese catalog instead of remote AI retrieval
- interprets audience notes as explicit refinement cues inside Worker code
- removes the private import workflow, runtime admin surface, and remote service bindings
- adopts the presentation theme from `french-cheese-shop`, including the same palette and font direction

## Consequences

Positive:

- The demo is stable enough for live teaching and local rehearsal.
- The repository now matches its actual purpose and is easier to understand.
- Local development no longer depends on remote Cloudflare AI or Vectorize services.
- The UI and the presentation now share the same visual language.

Trade-offs:

- The demo is intentionally less open-ended than a live AI-backed system.
- Recommendation behavior is heuristic and curated rather than model-driven.
- Older ADRs about runtime ranking config and import flow remain historical context rather than current architecture.

## Rejected Alternatives

### Keep the supervisor-search stack and retheme it

Rejected because it would preserve remote dependencies, dead workflows, and domain concepts that no longer belong in the repo.

### Swap the old stack for a new live model-backed cheese recommender

Rejected because the primary requirement is a reliable presentation demo, not a production-grade AI integration. Deterministic local behavior is more valuable here than open-ended live inference.

# ADR-019: Add A Local Backend Contrast Mode

- Status: Accepted
- Date: 2026-04-21

## Context

The cheese demo is intentionally deterministic because the primary requirement is a
rehearseable live teaching flow. At the same time, one useful follow-up topic is
that different search backends can return different answers even when the prompt
and visible requirements are the same.

There were two credible ways to support that discussion:

- add a live remote LLM-backed search path
- add a local contrast mode that behaves differently from the rules engine

The first option would make the demo less predictable, add runtime dependencies,
and weaken the current architecture decision to keep the presentation path local.

## Decision

Add one optional shared `Context` drawer control for backend mode:

- `Deterministic rules` remains the default and the primary teaching path
- `LLM backend` is implemented as a local LLM-style contrast mode inside the
  deterministic scenario engine

The contrast mode may rank results differently and explain itself differently,
but it must not call a live remote model during the default runtime path.

## Consequences

Positive:

- The presenter can discuss backend variance without leaving the demo.
- The main requirements-engineering flow stays intact because the toggle is
  optional and off by default.
- Local rehearsal and automated tests remain reliable.

Trade-offs:

- The `LLM backend` label refers to a local contrast mode rather than a real
  remote inference stack.
- The contrast is intentionally curated, so it demonstrates backend variance
  without claiming to represent every live model behavior.

## Rejected Alternatives

### Add a real remote LLM backend

Rejected because it would reintroduce runtime dependency risk, make the demo
less predictable during teaching, and cut against ADR-018.

### Keep only the rules engine and explain backend variance verbally

Rejected because the concept is clearer when the presenter can flip one visible
control and show a concrete behavior difference in the app.

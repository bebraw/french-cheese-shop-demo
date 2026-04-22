# ADR-020: Add Room-Based Multiplayer Demo Sessions

- Status: Accepted
- Date: 2026-04-22

## Context

The cheese demo now has a clear single-user teaching flow, but the presentation
format benefits from collaborative participation. Audience members should be
able to join one shared session, contribute challenge inputs together, and see
the ranking update live without turning the deterministic search engine into a
distributed state machine.

There were three credible directions:

- keep the app single-user and rely on screen sharing
- store shared room state in a stateless route plus client polling
- introduce a dedicated coordination primitive for one canonical room state

The first option does not meet the collaboration goal. The second can work, but
it pushes synchronization and race handling into a stateless surface that is not
well-suited to many concurrent writers.

## Decision

Add room-based multiplayer sessions with one canonical shared state per room.

- The deterministic cheese-ranking engine remains a pure function.
- Shared room state is coordinated through a Durable Object keyed by room id.
- Browsers read and mutate room state through `GET /api/session?room=...` and
  `POST /api/session?room=...`.
- Browsers subscribe to `GET /api/session/live?room=...` over WebSockets for
  live snapshot fan-out.
- Only durable collaboration state becomes shared: query, active scenario,
  audience presets and notes, world context, backend mode, and room reset.
- Local-only UI state stays per browser: context drawer open state, expanded
  result cards, and transient input focus.

## Consequences

Positive:

- Multiple participants can complete the same challenge flow together.
- Search behavior stays deterministic because collaboration wraps the ranking
  engine instead of rewriting it.
- Room state remains strongly ordered under concurrent edits.

Trade-offs:

- The runtime now depends on one Durable Object binding for coordination.
- Browser tests must isolate room ids because room state persists by room.
- The browser client must handle out-of-order snapshots and reconnects.

## Rejected Alternatives

### Keep collaboration outside the app

Rejected because shared-screen narration does not let participants contribute to
the same challenge state directly.

### Use stateless polling only

Rejected because the app now has many small shared writes, and a single-writer
coordination primitive is easier to reason about than layering race handling
onto independent stateless requests.

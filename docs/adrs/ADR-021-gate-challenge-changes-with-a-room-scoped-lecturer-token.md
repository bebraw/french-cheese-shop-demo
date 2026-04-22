# ADR-021: Gate Challenge Changes With A Room-Scoped Lecturer Token

- Status: Accepted
- Date: 2026-04-22

## Context

ADR-020 introduced shared room sessions so multiple browsers can participate in
the same demo. That collaboration worked technically, but it left the shared
search query, challenge switching, and room reset open to every participant in
the room.

That is a poor fit for the teaching flow. The lecturer needs to control when
the room advances from baseline to challenge 1, 2, or 3, while participants
should still be able to help by contributing hidden needs, missing data, world
context, and evaluation criteria inside the current challenge.

There were three credible directions:

- leave challenge switching open to everyone and rely on social convention
- add full user authentication and explicit lecturer identities
- add a lightweight room-scoped control mechanism for lecturer-only actions

The first option is too fragile for live teaching. The second would add much
more product and operational surface than this demo needs.

## Decision

Gate the shared search query, room-level challenge switching, and room reset
with a room-scoped lecturer token.

- A room may be claimed by one lecturer token.
- The browser stores that token locally per room and sends it on session
  requests.
- Room snapshots expose lecturer access flags so the UI can show whether the
  current device may manage challenge flow.
- `set-query`, `set-scenario`, and `reset-room` require the room's lecturer
  token.
- Audience inputs, world context, and backend mode remain collaborative so
  participants can still contribute to the current challenge.
- The UI exposes separate lecturer-link and audience-link copy actions so the
  safe sharing path does not include lecturer control by default.

## Consequences

Positive:

- The lecturer keeps control over the pacing of the challenge narrative and the
  wording of the shared request.
- Participants can still collaborate inside each challenge without taking over
  the room flow.
- The solution stays lightweight and local to the current room model rather
  than introducing full authentication.

Trade-offs:

- Lecturer control is possession-based, not identity-based.
- If the lecturer link is shared intentionally, another browser with the same
  token can manage challenge flow too.
- Room coordination now has to personalize access flags per connected client in
  live snapshots instead of broadcasting one identical access view to everyone.

## Rejected Alternatives

### Leave challenge changes fully collaborative

Rejected because one accidental edit from the audience can derail the live
teaching flow.

### Add full authentication and lecturer accounts

Rejected because it would add account, session, and deployment complexity that
does not fit a lightweight demo whose state is already room-scoped.

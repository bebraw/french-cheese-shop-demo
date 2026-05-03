# ADR-024: Share Focus Mode Across The Room

- Status: Accepted
- Date: 2026-05-03

## Context

Focus mode supports the short lecturer-led flow by hiding the optional
`Context` drawer. It was originally a lecturer-device setting, but that left the
same surface visible to already-joined student browsers during the focused
demonstration.

## Decision

Store Focus mode in room state and guard changes with the room-scoped lecturer
token.

- The lecturer toggles Focus mode through a protected room command.
- Room snapshots include the current Focus mode flag for every connected
  browser.
- While Focus mode is active, every browser hides the `Context` drawer button
  and panel.
- Room reset preserves Focus mode so the lecturer can reset content without
  changing the presentation setup.

## Consequences

Positive:

- Lecturer and student browsers now show the same reduced teaching surface
  during Focus mode.
- Already-joined students update through live room synchronization instead of
  needing a new link.
- The access-control model stays consistent with other lecturer-only room
  controls.

Trade-offs:

- Focus mode is no longer a private browser preference.
- Disabling Focus mode requires the lecturer device that holds control.

## Rejected Alternatives

### Keep Focus Mode Local

Rejected because it does not hide `Context` for students who have already joined
the room.

### Encode Focus Mode Only In Audience Links

Rejected because it would not update connected browsers and would make the live
room depend on which link each participant used.

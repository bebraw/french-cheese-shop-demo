# ADR-022: Use Vote-Derived Audience Inputs

- Status: Accepted
- Date: 2026-04-25

## Context

The live demo has about five minutes for direct interaction. The previous
audience controls used shared toggles, which made it quick for one person to
set options but did not work well for a room: every click directly changed the
canonical requirements instead of making audience preference visible first.

Some choices are semantic alternatives. For example, `cow`, `goat`, `sheep`,
and `mixed` answer the same milk-type question and should compete with each
other instead of accumulating as unrelated facts.

The lecturer also needs a way to override the audience result when that creates
a better teaching discussion.

## Decision

Challenge options are vote-derived room inputs.

- Each challenge preset belongs to a semantic vote group.
- Audience browsers cast one local vote per group.
- The room stores aggregate vote counts per preset.
- The active requirement for each group is the highest-voted preset, including
  ties.
- A lecturer click on a preset selects or clears the override for that preset's
  group and takes precedence over audience vote counts for that group.
- Custom text remains available as a fallback note when a useful answer is not
  represented by a preset.

## Consequences

Positive:

- The presenter can ask the room for quick input without losing control of the
  demo pacing.
- Vote counts make audience disagreement visible during the discussion.
- Semantic alternatives stay legible because grouped options compete directly.
- Lecturer overrides keep the teaching path recoverable when the vote is useful
  to discuss but not useful as the next system input.

Trade-offs:

- Local vote selection is browser-scoped, not identity-authenticated.
- Vote counts are lightweight demo state and are not designed to prevent
  deliberate duplicate voting.
- Ties intentionally select multiple winning options, which can make the
  resulting requirements broader.

## Rejected Alternatives

### Keep Shared Toggles

Rejected because toggles hide the difference between one participant selecting
an option and a room converging on an option.

### Add Authenticated Polling

Rejected because participant identity, login, and anti-abuse controls would add
too much product and deployment surface for a five-minute teaching demo.

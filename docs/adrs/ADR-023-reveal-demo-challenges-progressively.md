# ADR-023: Reveal Demo Challenges Progressively

- Status: Accepted
- Date: 2026-04-25

## Context

The live demo has only a few minutes for direct interaction. Showing every
challenge to audience browsers at the start exposes the whole lesson structure
early and can invite people to think ahead instead of focusing on the current
question.

The lecturer still needs fast access to the full flow, and the room must remain
synchronized across participant browsers.

## Decision

Reveal challenges progressively through room state.

- Baseline is visible to everyone by default.
- Challenge 1, 2, and 3 stay hidden from audience browsers until revealed.
- The lecturer sees all challenge controls after claiming lecturer controls.
- A lecturer-only next-challenge control reveals and activates the next
  challenge for the room.
- Direct lecturer challenge selection also reveals that challenge and earlier
  challenge steps.
- Room reset returns the audience view to baseline-only.

## Consequences

Positive:

- The audience sees only the current and already-opened parts of the demo.
- The lecturer can stop after Challenge 1 or Challenge 2 without leaving visible
  unfinished tabs.
- The implementation stays lightweight because reveal state lives beside the
  existing room state.

Trade-offs:

- Lecturer and audience browsers intentionally see different challenge
  navigation.
- Direct lecturer jumps can reveal multiple challenge steps at once, which is
  useful for rehearsal but should be used deliberately in live teaching.

## Rejected Alternatives

### Keep All Challenges Visible

Rejected because it invites side conversations about later stages before the
current ambiguity lesson has landed.

### Add A Separate Presentation Mode

Rejected because it would duplicate the current room flow and add more setup
surface than a short demo needs.

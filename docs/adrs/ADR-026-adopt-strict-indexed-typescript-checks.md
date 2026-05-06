# ADR-026: Adopt Strict Indexed TypeScript Checks

- Status: Accepted
- Date: 2026-05-06

## Context

The upstream `bebraw/vibe-template` TypeScript setup enables stricter indexed
access and object-shape checks than this project had enabled. This project now
has enough shared room state, browser state, and recommendation data that
unchecked array and record access can hide real runtime assumptions.

## Decision

Adopt the upstream strict TypeScript compiler checks in this project:

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`

Keep the existing project-specific TypeScript settings that support this
Worker/Vite setup, including `allowImportingTsExtensions`, DOM types, and the
current include paths.

## Consequences

Positive:

- Array and record lookups must handle missing values explicitly.
- Optional properties keep their stricter shape instead of silently accepting
  explicit `undefined` where the type did not say so.
- Class overrides must be marked intentionally if they are introduced later.

Trade-offs:

- Some existing code needs explicit guards or non-null assertions after prior
  length checks.
- Future changes may need more precise local types before passing
  `npm run typecheck`.

## Rejected Alternatives

### Copy The Whole Upstream Config Literally

Rejected because this project has additional local needs, including Vite output,
browser script type checking, and scripts outside `src/`.

### Keep The Previous Strict Baseline

Rejected because it still allowed unchecked indexed access in places where a
missing value would produce a runtime failure.

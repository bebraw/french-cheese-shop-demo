# KV Lexical Search Implementation Sketch

This document describes how to execute the proposal in [ADR-016](./adrs/ADR-016-propose-kv-backed-lexical-search.md) without changing the current architecture yet.

## Goal

Replace the live Workers AI plus Vectorize retrieval path with a deterministic lexical search path backed by a Cloudflare KV snapshot of normalized supervisor records.

## Non-Goals

- Do not change the confidential HTML source workflow.
- Do not add D1, Durable Objects, or another external search service in the first iteration.
- Do not change the Basic Auth, rate limiting, or search-page interaction model.

## Proposed Runtime Shape

### Import Path

1. Parse the confidential HTML snapshot into `SupervisorRecord[]`.
2. Derive a version id such as the import timestamp or source fingerprint.
3. Write the full normalized snapshot JSON to a versioned KV key.
4. Write a small manifest key that points to the active version.
5. Preserve the existing safety checks that guard against suspiciously small imports.

### Search Path

1. Expand aliases from `src/supervisors/aliases.ts`.
2. Load the active supervisor snapshot from KV.
3. Tokenize the query and each supervisor's searchable text.
4. Score every supervisor with deterministic lexical signals.
5. Sort, slice to the visible result limit, and return the existing JSON result shape with renamed scoring signals.

## Storage Shape

Use one KV namespace binding, for example `SUPERVISOR_SEARCH_DATA`.

Suggested keys:

- `supervisors/current` for the active version id
- `supervisors/snapshots/<version>` for the serialized supervisor list
- `supervisors/meta/<version>` for import metadata such as `importedAt`, source fingerprint summary, and supervisor count

The first pass should prefer a full snapshot write over a per-record key layout. If snapshot size or propagation behavior becomes problematic, that is the point to reconsider D1.

## File-Level Sketch

### Worker Configuration

- Update `wrangler.jsonc` to remove `AI` and `SUPERVISOR_SEARCH_INDEX` from the live search path.
- Add a KV binding for supervisor search data.

### Search Types

- Update [src/supervisors/types.ts](/Users/juhovepsalainen/Projects/aalto/supervisor-search/src/supervisors/types.ts:1) to:
  - remove embedding and vector query types from the live search contract
  - add the KV binding to `SupervisorSearchEnv`
  - replace `source: "vectorize"` with a lexical storage source such as `source: "kv"`
  - rename `vectorSimilarity` in the result signals to a lexical signal name

### Search Service

- Rewrite [src/supervisors/service.ts](/Users/juhovepsalainen/Projects/aalto/supervisor-search/src/supervisors/service.ts:16) to:
  - load the active snapshot from KV
  - parse the stored JSON into `SupervisorRecord[]`
  - calculate lexical candidates locally instead of calling `createEmbedding()` and `SUPERVISOR_SEARCH_INDEX.query()`
  - keep `searchSampleSupervisors()` as the offline fallback

### Ranking

- Replace or refactor [src/supervisors/ranking.ts](/Users/juhovepsalainen/Projects/aalto/supervisor-search/src/supervisors/ranking.ts:5) so the main signals are lexical rather than vector-based.

Suggested scoring signals:

- `exactPhraseMatch`: whether the normalized query appears as a phrase in `topicArea` or `searchText`
- `topicOverlap`: token overlap against `topicArea`
- `searchTextOverlap`: token overlap against the broader `searchText`
- `availability`: existing thesis-load signal

Suggested ordering:

1. phrase hits
2. total score
3. lower `activeThesisCount`
4. alphabetical tie-break

### Import Planning

- Replace the vector-oriented plan in [src/supervisors/import.ts](/Users/juhovepsalainen/Projects/aalto/supervisor-search/src/supervisors/import.ts:30) with a snapshot-oriented plan that returns:
  - `supervisors`
  - `snapshotJson`
  - `version`
  - `metadata`

The existing safety guardrails should stay, but they should compare parsed supervisor counts against the currently active snapshot metadata instead of Vectorize ids.

### Import Script

- Rewrite [scripts/import-supervisors.ts](/Users/juhovepsalainen/Projects/aalto/supervisor-search/scripts/import-supervisors.ts:1) to:
  - stop requesting embeddings
  - stop listing, upserting, and deleting vectors
  - fetch the current snapshot metadata
  - validate the import against the current snapshot
  - upload the next snapshot and switch the active pointer

### Tests

- Update `src/supervisors/service.test.ts` to exercise KV-backed retrieval instead of AI plus Vectorize mocks.
- Update `src/supervisors/ranking.test.ts` to validate lexical signal weighting.
- Update `src/supervisors/import.test.ts` for snapshot planning and guardrails.
- Keep browser search tests focused on user-visible behavior so the storage swap does not force UI churn.

## Suggested Migration Sequence

1. Add the new ADR and implementation sketch.
2. Introduce lexical ranking alongside the existing vector ranking behind a temporary switch.
3. Change the import script to produce and validate KV snapshots.
4. Switch live search to KV retrieval.
5. Remove embedding, Vectorize, and dimension-specific code paths.
6. Update `README.md`, `docs/development.md`, `docs/production.md`, `docs/architecture.md`, and `specs/supervisor-search/spec.md` in the same change set as the code switch.
7. Mark ADR-014 as superseded only when the lexical path is accepted and implemented.

## Open Questions

- Does the real supervisor snapshot stay small enough for a single active KV snapshot with acceptable read latency?
- Should the Worker cache the parsed snapshot in module scope with a short TTL to avoid repeated JSON parsing?
- Should phrase matches be mandatory for very short queries, or is token overlap enough after alias expansion?
- Do we want a temporary dual-mode flag so live environments can compare vector and lexical results before cutover?

## Verification

When implementation starts, the minimum verification bar should remain:

- `npm run typecheck`
- `npm run quality:gate`
- `npm run ci:local:quiet`

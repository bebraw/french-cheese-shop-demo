# ADR-016: Propose KV-Backed Lexical Search For Supervisor Discovery

**Status:** Proposed

**Date:** 2026-04-19

## Context

Supervisor search currently uses Workers AI to create embeddings and Vectorize to retrieve candidate supervisors before explicit reranking in Worker code. That architecture is documented in ADR-014 and reflected in the live feature spec.

That design gives semantic retrieval, but it also introduces a second operational surface beyond the Worker itself:

- the deployed Worker depends on Workers AI and Vectorize bindings
- the local import path depends on Cloudflare credentials that can create embeddings and mutate a Vectorize index
- local development and production setup both need vector-specific configuration and troubleshooting

The current dataset is a confidential supervisor directory rather than a large, unbounded corpus. Query intent is also relatively narrow: students typically search for explicit topic phrases, abbreviations, and known research areas rather than open-ended natural-language questions. The project already expands common aliases and already keeps final ranking explainable in Worker code.

We need to decide whether the retrieval layer should stay semantic and vector-backed, or whether the simpler shape for this project is a lexical search path that stores normalized supervisor records directly and scores them in application code.

## Decision

If we replace the current vector architecture, we will move supervisor search to a KV-backed lexical retrieval model with these constraints:

- keep the confidential HTML import as a local operator workflow
- store normalized supervisor records in a Cloudflare KV namespace as the only live search data store
- use a versioned snapshot write during import, then switch an active pointer after the new snapshot is fully uploaded
- load the active snapshot in the Worker and score supervisors with deterministic lexical matching plus the existing availability signal
- keep alias expansion and explicit ranking logic in Worker code instead of introducing another hosted search service

This proposal assumes the full normalized supervisor snapshot stays comfortably small enough for a KV snapshot design. If that assumption stops holding, D1 with full-text search becomes the next fallback.

## Trigger

The current implementation solves retrieval with semantic search, but the product need appears narrower than that stack suggests. We want an explicit proposal that tests whether the project can stay useful while removing Workers AI and Vectorize from the runtime path.

## Consequences

**Positive:**

- The deployed search path becomes easier to reason about because it no longer depends on embeddings, vector dimensions, or vector index configuration.
- Local imports need fewer Cloudflare capabilities and fewer failure modes.
- Search behavior stays fully inspectable in code because every ranking signal remains lexical or operationally explicit.
- The production architecture becomes closer to the product shape: a protected directory search service with deterministic ranking.

**Negative:**

- Retrieval quality will likely get worse for broad semantic queries, paraphrases, and fuzzy topic descriptions that do not share obvious vocabulary with stored supervisor text.
- KV snapshot retrieval assumes the directory remains small enough for single-snapshot loading and acceptable per-request latency.
- The proposal would supersede ADR-014 if accepted, so migration work must update code, docs, tests, and runtime configuration together.

**Neutral:**

- The local import workflow still exists, but it would write JSON snapshots instead of vectors.
- Reranking remains in Worker code, but the signal named `vectorSimilarity` would be replaced by lexical scoring signals.
- Sample-data mode can remain as a local-only fallback for tests and offline development.

## Alternatives Considered

### Keep Workers AI And Vectorize

Rejected for this proposal because the operational cost and setup complexity may be disproportionate to a bounded supervisor directory with mostly keyword-shaped user queries.

### Use D1 With Full-Text Search

Not chosen as the first replacement because it adds a database surface and schema management when a small snapshot-oriented corpus may still fit a simpler KV design. It remains the best fallback if KV snapshot assumptions fail.

### Use A Curated Topic Taxonomy Instead Of Free-Text Search

Rejected because it would trade infrastructure complexity for ongoing manual maintenance and would make the system less forgiving of new or mixed-topic phrasing.

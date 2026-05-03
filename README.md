# french-cheese-shop-demo

This repo hosts the live demo companion for [french-cheese-shop](https://github.com/bebraw/french-cheese-shop).

The app is a single public Worker surface for a short live demo about AI requirements engineering. Use one vague customer request across four passes:

- baseline search from a vague customer request
- challenge 1: hidden requirements
- challenge 2: data requirements
- challenge 3: evaluation under uncertainty

## Quick Demo

If time is short, run the demo like this:

1. Start with `I want something like Brie, but stronger.`
2. `Baseline`: show the plausible but shallow answer from surface wording alone.
3. Press `Next` to reveal `Challenge 1`, then let the room vote on hidden requirements such as `keep it creamy` and milk-type alternatives like `cow`, `goat`, `sheep`, or `mixed`.
4. Press `Next` again only if time allows. In `Challenge 2`, vote on missing data such as `serve it with cider` or `must be in stock`, while the foldable `Context` drawer can add world context like `Winter holiday` to change both seasonal fit and stock pressure.
5. Use `Challenge 3` only as an optional final step for evaluation checks such as `show why it fits`, `mark a backup choice`, and `keep it to two finalists`.

Use the visible vote counts to keep the interaction short. If the room chooses
an option that is more useful as a discussion point than as the next system
input, press that option from the lecturer device to override the group and
explain why the override changes the recommendation.

The point is not to explain every tab in depth. It is to show a clean progression from vague wording, to clarified needs, to concrete facts, to visible evaluation checks.

If there is extra time, use the `Ranking Mode` controls inside the foldable `Context` drawer as a short coda. `Deterministic rules` shows the stable teaching path, while `LLM-style ranking` offers a local contrast mode for discussing backend variance without adding a live remote dependency.

## Teaching Alignment

The live demo is meant to match the `french-cheese-shop` deck, not just reuse the same visuals.

- `Baseline` sets up the ambiguity problem from the slides: the answer can look plausible even when key meaning is still unstated.
- `Challenge 1` supports the learning outcome `Interpret vague requests` by turning hidden preferences into explicit ranking signals.
- `Challenge 2` supports `Specify domain and operational context` by adding catalog facts, stock, pairings, and shared world context.
- `Challenge 3` supports `Evaluate ambiguity` by making success criteria visible as checks instead of treating the top-ranked answer as self-justifying.
- The lecturer-only `Teaching Focus` panel keeps the current learning goal, the question to ask the room, and the thing to notice available without exposing presenter scaffolding to audience browsers.

The repo vendors ASDLC reference material in `.asdlc/` as local guidance instead of recreating it per project. Repo-specific truth lives in `ARCHITECTURE.md`, `specs/`, and `docs/adrs/`: generated code still needs to match those documents, and passing CI alone is not enough.

Local development in this repo targets macOS. Other platforms may need script and tooling adjustments before the baseline workflow works as documented.

## Documentation

- Technical summary, routes, and source layout: `docs/technical-overview.md`
- Development setup and verification: `docs/development.md`
- Application architecture overview: `docs/architecture.md`
- Production deployment runbook: `docs/production.md`
- Delivery and security roadmap: `docs/roadmap.md`
- Architecture decisions: `docs/adrs/README.md`
- Feature and architecture specs: `specs/README.md`
- Agent behavior and project rules: `AGENTS.md`

## Technical Notes

- Start with [docs/technical-overview.md](/Users/juhovepsalainen/Projects/aalto/french-cheese-shop-demo/docs/technical-overview.md) for the short implementation summary, common commands, runtime routes, and source layout.
- Use [docs/development.md](/Users/juhovepsalainen/Projects/aalto/french-cheese-shop-demo/docs/development.md) for the full local setup and verification workflow.

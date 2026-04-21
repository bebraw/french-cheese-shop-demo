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
3. `Challenge 1`: add hidden requirements such as `keep it creamy` and `cow's milk`.
4. `Challenge 2`: add missing data such as `serve it with cider` or `must be in stock`, while the shared sidebar can add world context like `Winter holiday` to change both seasonal fit and stock pressure.
5. `Challenge 3`: judge the gathered requirements with visible checks such as `show why it fits`, `mark a backup choice`, and `keep it to two finalists`.

The point is not to explain every tab in depth. It is to show a clean progression from vague wording, to clarified needs, to concrete facts, to visible evaluation checks.

If there is extra time, use the sidebar `Search Backend` toggle as a short coda. `Deterministic rules` shows the stable teaching path, while `LLM backend` offers a local contrast mode for discussing backend variance without adding a live remote dependency.

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

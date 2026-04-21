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
4. `Challenge 2`: add missing data such as `serve it with cider` and `must be in stock`.
5. `Challenge 3`: add evaluation criteria such as `explain why it fits` and `give a backup option`.

The point is not to explain every tab in depth. It is to show that the same request produces different behavior once requirements become explicit.

The repo vendors ASDLC reference material in `.asdlc/` as local guidance instead of recreating it per project. Repo-specific truth lives in `ARCHITECTURE.md`, `specs/`, and `docs/adrs/`: generated code still needs to match those documents, and passing CI alone is not enough.

Local development in this repo targets macOS. Other platforms may need script and tooling adjustments before the baseline workflow works as documented.

## Documentation

- Development setup and verification: `docs/development.md`
- Application architecture overview: `docs/architecture.md`
- Production deployment runbook: `docs/production.md`
- Delivery and security roadmap: `docs/roadmap.md`
- Architecture decisions: `docs/adrs/README.md`
- Feature and architecture specs: `specs/README.md`
- Agent behavior and project rules: `AGENTS.md`

## Development

- Start with [docs/development.md](/Users/juhovepsalainen/Projects/aalto/french-cheese-shop-demo/docs/development.md) for local setup, runtime commands, and verification.
- The most common commands are `npm run dev`, `npm run quality:gate`, and `npm run ci:local:quiet`.
- `npm install` configures the repo-managed `pre-push` hook so `git push` runs `npm run quality:gate:fast` before code leaves your machine.

## App Surface

- `GET /` serves the French cheese shop demo UI.
- `GET /styles.css` serves the generated Tailwind stylesheet.
- `GET /app.js` serves the browser tab and search logic.
- `GET /api/search?q=...&scenario=...&audience=...` serves live demo results as JSON.
- `GET /api/health` serves a JSON health response for smoke tests and tooling.

## Source Layout

- `src/worker.ts` is the Worker entry point and top-level router.
- `src/api/` holds API response modules such as search and health.
- `src/cheese/` holds the deterministic cheese catalog and scenario scoring logic.
- `src/views/` holds HTML rendering modules and browser script output.
- Tests live next to the code they exercise under `src/`.

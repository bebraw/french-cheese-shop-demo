# french-cheese-shop-demo

This is the demo portion for [french-cheese-shop](https://github.com/bebraw/french-cheese-shop) presentation.

The repo vendors ASDLC reference material in `.asdlc/` as local guidance instead of recreating it per project. Repo-specific truth lives in `ARCHITECTURE.md`, `specs/`, and `docs/adrs/`: generated code still needs to match those documents, and passing CI alone is not enough.

Local development in this repo targets macOS. Other platforms may need script and tooling adjustments before the baseline workflow works as documented.

## Documentation

- Development setup, local runtime, imports, and verification: `docs/development.md`
- Application architecture overview: `docs/architecture.md`
- Production deployment runbook: `docs/production.md`
- Delivery and security roadmap: `docs/roadmap.md`
- Architecture decisions: `docs/adrs/README.md`
- Feature and architecture specs: `specs/README.md`
- Agent behavior and project rules: `AGENTS.md`

## Development

- Start with [docs/development.md](/Users/juhovepsalainen/Projects/aalto/supervisor-search/docs/development.md) for local setup, runtime commands, import workflow, and verification.
- The most common commands are `npm run dev`, `npm run import:supervisors -- --input /absolute/path/to/snapshot.html`, `npm run quality:gate`, and `npm run ci:local:quiet`.
- `npm install` configures the repo-managed `pre-push` hook so `git push` runs `npm run quality:gate:fast` before code leaves your machine.

## App Surface

- `GET /` serves the basic-auth-protected supervisor search page.
- `GET /styles.css` serves the generated Tailwind stylesheet.
- `GET /api/search?q=...` serves realtime supervisor search results as JSON.
- `GET /api/health` serves a JSON health response for smoke tests and tooling.

## Source Layout

- `src/worker.ts` is the Worker entry point and top-level router.
- `src/api/` holds API response modules such as the search and health endpoints.
- `src/supervisors/` holds parsing, ranking, auth, and import logic for the supervisor domain.
- `src/views/` holds HTML rendering modules for the search UI.
- Tests live next to the code they exercise under `src/`.

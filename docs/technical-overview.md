# Technical Overview

This document keeps the implementation-facing repo summary in one place. Use it with:

- [Development setup](./development.md) for local setup, prerequisites, and verification details
- [Application architecture](./architecture.md) for system-level structure and runtime flow
- [ARCHITECTURE.md](../ARCHITECTURE.md) for repo-wide architecture rules and documentation conventions

## Common Commands

- `npm run dev` starts the local Worker on `http://127.0.0.1:8787`
- `npm run quality:gate` runs the baseline verification gate
- `npm run ci:local:quiet` runs the local GitHub Actions workflow through Agent CI
- `npm install` configures the repo-managed `pre-push` hook so `git push` runs `npm run quality:gate:fast`

## App Surface

- `GET /` serves the French cheese shop demo UI
- `GET /styles.css` serves the generated Tailwind stylesheet
- `GET /app.js` serves the browser tab and search logic
- `GET /api/search?q=...&scenario=...&audience=...&season=...&shopState=...&backend=...` serves live demo results as JSON
- `GET /api/health` serves a JSON health response for smoke tests and tooling

The UI keeps `season` and `shopState` in a shared sidebar as optional world context that can affect baseline and every challenge. `season` changes recommendation suitability, while `shopState` adds operational stock pressure.

The same sidebar also exposes a shared `backend` toggle. `rules` is the default deterministic engine, while `llm` is a local contrast mode that changes ranking style without adding a live model dependency.

## Source Layout

- `src/worker.ts` is the Worker entry point and top-level router
- `src/api/` holds API response modules such as search and health
- `src/cheese/` holds the deterministic cheese catalog and scenario scoring logic
- `src/views/` holds HTML rendering modules and browser script output
- Tests live next to the code they exercise under `src/`

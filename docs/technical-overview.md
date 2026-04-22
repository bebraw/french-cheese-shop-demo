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
- `GET /api/session?room=...` serves the canonical shared room snapshot plus lecturer access flags for the current client
- `POST /api/session?room=...` applies one shared room command, with challenge switching and room reset reserved for the claimed lecturer device
- `GET /api/session/live?room=...` streams live room updates over WebSockets
- `GET /api/health` serves a JSON health response for smoke tests and tooling

The UI keeps `season` and `shopState` in a foldable right-side `Context` container as optional world context that can affect baseline and every challenge. `season` changes recommendation suitability, while `shopState` adds operational stock pressure.

The same `Context` container also exposes a shared `backend` toggle. `rules` is the default deterministic engine, while `llm` is a local contrast mode that changes ranking style without adding a live model dependency.

The page now also exposes a shared `room` control so multiple browsers can join
the same deterministic teaching session. The browser URL tracks the joined room
and whether the `Context` container is explicitly open via `context=open`,
while the default page load keeps the drawer closed. Lecturer control is
room-scoped rather than account-based: one device can claim challenge-management
rights for the room, and the UI exposes separate lecturer and audience share
links so participants do not receive that control by default.

## Source Layout

- `src/worker.ts` is the Worker entry point and top-level router
- `src/api/` holds API response modules such as search, session, and health
- `src/demo-room*.ts` holds the shared multiplayer room state and Durable
  Object coordination code
- `src/cheese/` holds the deterministic cheese catalog and scenario scoring logic
- `src/views/` holds HTML rendering modules and browser script output
- Tests live next to the code they exercise under `src/`

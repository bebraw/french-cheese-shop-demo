# Production

This document describes how to take `french-cheese-shop-demo` to production on Cloudflare.

## Summary

The current deployment is lightweight:

1. Build generated CSS and browser assets.
2. Deploy the Worker.
3. Smoke-test the public demo routes.

No Vectorize, Workers AI, KV, or import workflow is required for the current architecture.

## 1. Prepare The Environment

- Use the Node and npm versions pinned in `package.json`.
- Install dependencies with `npm install`.
- Run the full local verification baseline before deploy:

```bash
npm run quality:gate
npm run ci:local:quiet
```

## 2. Confirm Wrangler Config

`wrangler.jsonc` should define:

- Worker name: `french-cheese-shop-demo`
- entry module: `src/worker.ts`
- asset build command: `npm run build:assets`

No runtime bindings or secrets are required for the current demo.

## 3. Deploy

Deploy with:

```bash
npm run deploy
```

If the Worker has not been deployed before in this account, make sure the account has a configured `workers.dev` subdomain and Preview URLs enabled.

## 4. Smoke Test

After deploy:

1. Open `/` and confirm the French cheese shop landing surface renders.
2. Run a baseline search such as `I want something like Brie but stronger`.
3. Switch to challenge 2 and confirm audience input changes the result ordering.
4. Confirm `/api/health` returns `200`.
5. Confirm `styles.css` and `app.js` load successfully.

## 5. Operational Notes

- The demo is only as current as the committed cheese catalog and scenario heuristics.
- Any lasting change to the scenarios, catalog fields, or deployment assumptions must land with matching spec and ADR updates.

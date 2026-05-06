# ADR-025: Bundle Browser Script With Vite

- Status: Accepted
- Date: 2026-05-06

## Context

The browser behavior for the demo lived in `src/views/home-script.ts` as a
large template string returned by `renderHomeScript()`. That kept `/app.js`
simple to serve, but TypeScript could not check the browser code itself. The
student and lecturer interaction logic has grown enough that hidden script
errors are now a material maintenance risk.

## Decision

Use Vite to bundle the browser script from `src/views/home-script.ts` into
`.generated/app.js`.

- `src/views/home-script.ts` is a normal TypeScript browser module.
- `vite.config.ts` builds that module as a single ES output file.
- `npm run build:assets` builds both Tailwind CSS and the Vite browser bundle.
- Wrangler runs `npm run build:assets` before local development and deployment.
- The Worker keeps serving the bundle at `/app.js`.

## Consequences

Positive:

- `npm run typecheck` now checks the browser interaction code.
- The page keeps the same `/app.js` runtime contract.
- The generated asset pattern stays consistent with `.generated/styles.css`.

Trade-offs:

- Local builds now require Vite as dev tooling.
- The browser script has a separate generated output step instead of being
  assembled directly by the Worker.

## Rejected Alternatives

### Keep The Template String

Rejected because it preserves the exact blind spot this change is meant to
remove: TypeScript cannot check code hidden inside a string.

### Inline The Script In HTML

Rejected because it would make the HTML renderer larger, weaken CSP hygiene,
and still avoid a real browser-module build step.

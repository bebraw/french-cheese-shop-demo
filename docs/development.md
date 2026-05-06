# Development

This document collects development-facing setup and workflow notes for the template.

## Agent Context

The template vendors the ASDLC knowledge base in `.asdlc/`.

- Start with `.asdlc/SKILL.md` for ASDLC concepts, patterns, and practices.
- Use `AGENTS.md` as the Codex-native context anchor for this repo.

## Local Setup

This template is set up for the local Agent CI runner from `agent-ci.dev`.

### Prerequisites

- Local development in this template targets macOS. The documented commands assume a macOS shell environment and are not maintained as a cross-platform baseline.
- Run `nvm use` before `npm install` or any other development command so your shell uses the Node.js version mirrored in `.nvmrc`, which keeps the bundled npm version close to the repo pin as well.
- Install dependencies with `npm install`.
- `npm install` also configures the repo-managed Git hook path and enables the `pre-push` hook that runs `npm run quality:gate:fast`.
- The exact Node.js version is pinned in `package.json`, mirrored in `.nvmrc` for `nvm` users, and read directly by CI through `actions/setup-node`.
- The repo pins npm exactly in `package.json` as the source-of-truth version. Using `nvm use` is the expected local path for staying close to that npm baseline, and CI upgrades npm to the exact pinned version after `actions/setup-node` and invokes that pinned CLI directly for install and verification steps. `devEngines` intentionally accepts a compatible npm 11 patch release so hosted build providers such as Cloudflare can still install dependencies when their bundled npm lags slightly behind the repo pin.
- Copy `.dev.vars.example` to `.dev.vars` only when a future local-only setting needs to be added.
- Copy `.env.agent-ci.example` to `.env.agent-ci` when you need machine-local Agent CI overrides. Agent CI loads that file automatically.
- If your clone has no `origin` remote, set `GITHUB_REPO=owner/repo` in `.env.agent-ci` to stop Agent CI from warning while inferring the repository name.
- If your Docker CLI uses a non-default socket or context, set `DOCKER_HOST=...` in `.env.agent-ci` so Agent CI reaches the same engine as `docker info`.
- Start a Docker runtime before running Agent CI.
- Install the GitHub Actions runner image once with `docker pull ghcr.io/actions/actions-runner:latest`.

The repo pins CLI tooling in `devDependencies`, including Wrangler for Cloudflare-based experiments. Prefer invoking those tools through `npx` or repo scripts so the project version is used instead of a global install.

## Local Runtime

- Start the local Worker with `npm run dev`.
- Open `http://127.0.0.1:8787` in your browser.
- Rebuild generated CSS and browser assets manually with `npm run build:assets` when needed.

The Worker serves the cheese demo from `src/worker.ts`. `npm run dev` starts it on `http://127.0.0.1:8787`, and Playwright uses `npm run e2e:server` on `http://127.0.0.1:8788`. API modules live under `src/api/`, cheese-domain logic lives under `src/cheese/`, view modules live under `src/views/`, and tests are colocated under `src/`.

## Commands

### Local CI and Verification

If local CI fails with `No such image: ghcr.io/actions/actions-runner:latest`, pull that image manually and re-run the workflow.

If local CI warns with `No such remote 'origin'`, add `GITHUB_REPO=owner/repo` to `.env.agent-ci` and rerun the workflow.

- Run the local workflow with `npm run ci:local`.
- Run the quiet local workflow with `npm run ci:local:quiet`.
- Run all relevant workflows with `npm run ci:local:all`.
- Run the fast local gate with `npm run quality:gate:fast`.
- Run the baseline quality gate with `npm run quality:gate`.
- Run the shipped runtime dependency audit with `npm run security:audit`.
- Install the Playwright browser with `npm run playwright:install`.
- Run end-to-end tests with `npm run e2e`.
- Run unit and integration tests with `npm test`.
- Run the unit coverage gate with `npm run test:coverage`.
- Run TypeScript checks with `npm run typecheck`.
- Run Lighthouse with `LIGHTHOUSE_URL=http://127.0.0.1:8787 LIGHTHOUSE_SERVER_COMMAND="npm run dev" npm run lighthouse`.
- Format the repo with `npm run format`.
- Check formatting with `npm run format:check`.
- If a run pauses on failure, fix the issue and resume with `npm run ci:local:retry -- --name <runner-name>`.

The GitHub Actions CI workflow splits fast checks from browser checks into separate jobs, reads the pinned Node version from `package.json`, upgrades npm to the repo-pinned version from `package.json`, runs repository-shape validation as part of the fast job, runs the browser job in the version-pinned Playwright container image `mcr.microsoft.com/playwright:v1.59.1-noble`, and cancels superseded runs on the same ref.

The starter UI uses Tailwind v4 and Vite. Tailwind input lives in `src/tailwind-input.css`, generated CSS is written to `.generated/styles.css`, browser code lives in `src/views/home-script.ts`, Vite writes `.generated/app.js`, and Wrangler runs `npm run build:assets` automatically before local development.

The Lighthouse setup is generic, but the Worker gives it a concrete local target. Use `LIGHTHOUSE_URL=http://127.0.0.1:8787 LIGHTHOUSE_SERVER_COMMAND="npm run dev" npm run lighthouse`. Reports are written to `reports/lighthouse/`.

The Vitest setup is generic as well. `vitest.config.ts` targets colocated `src/**/*.test.ts` files while excluding `src/**/*.e2e.ts`. The default `npm test` command uses `--passWithNoTests` so the template remains usable before a project adds its first test file.

The coverage gate is stricter than the basic test run. `npm run test:coverage` measures runtime `src/**` code with the V8 provider, writes reports to `reports/coverage/`, and enforces high thresholds once a project actually has `src/` code. Colocated unit tests, end-to-end tests, test-support files, and the Vite browser entry do not count toward unit coverage; the browser entry is checked by TypeScript and Playwright.

The TypeScript setup follows the strict upstream `bebraw/vibe-template` baseline. `tsconfig.json` covers repo-level `.ts` files and `src/**/*.ts`, including the Vite-bundled browser module, and `npm run typecheck` runs `tsc --noEmit` with unchecked indexed access, exact optional property types, and implicit overrides rejected.

## Cheese Demo Notes

The current app is deliberately local-first and deterministic:

- The live demo depends only on the committed cheese catalog in `src/cheese/catalog.ts`.
- Each challenge tab uses the same `/api/search` endpoint with a different `scenario` parameter.
- Audience refinements are passed through the `audience` query parameter and translated into explicit ranking or evaluation cues in `src/cheese/demo.ts`.

Because the Worker runs with `--local`, the demo stays usable without Cloudflare service bindings or local secrets.

## Security Baseline

The template keeps secret handling lightweight and explicit:

- Keep local secrets in untracked files such as `.dev.vars`.
- Commit example files such as `.dev.vars.example` with placeholder values only.
- Treat `npm run security:audit` as part of the baseline gate for shipped runtime dependencies.

## Quality Gate

Use this expectation for routine changes:

- `npm run quality:gate` must pass before a change is considered ready.
- Use `npm run quality:gate:fast` for quicker local iteration when browser coverage is not the immediate focus.
- `npm run ci:local:quiet` should also pass before proposing or landing the change.
- The repo-managed `pre-push` hook runs `npm run quality:gate:fast` automatically after `npm install`, so pushes stop locally when the fast gate is already red.

The quality gate currently runs the fast gate first, then the Playwright browser gate. The local and remote CI workflow runs separate fast and browser jobs, with repository-shape validation included in the fast job.

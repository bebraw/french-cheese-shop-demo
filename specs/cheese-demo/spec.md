# Feature: French Cheese Shop Demo

## Blueprint

### Context

French Cheese Shop Demo supports a fast live teaching flow around AI in requirements engineering. The presenter starts from a vague customer request and uses audience input to refine the system behavior across three explicit challenges.

### Architecture

- **Entry points:** `GET /`, `GET /api/search?q=...&scenario=...&audience=...`, and `GET /api/health`
- **Data models:** `CheeseRecord` in `src/cheese/catalog.ts` is the committed product model. Required fields are `cheeseId`, `name`, `region`, `milkType`, `style`, `textures`, `pairings`, `servingContexts`, `intensity`, `priceEur`, `stock`, and `blurb`.
- **Scenario contract:** `scenario` must accept `baseline`, `challenge-1`, `challenge-2`, and `challenge-3`.
- **Dependencies:** The deployed Worker depends only on the committed repo assets and generated CSS. No remote AI, Vectorize, KV, or import-time credentials are part of the current runtime path.

### Anti-Patterns

- Do not reintroduce the removed supervisor domain into active routes, docs, or tests.
- Do not hide scenario scoring logic inside route handlers. Keep it in dedicated cheese-domain code.
- Do not make the live demo depend on a remote service unless the spec and ADR set are updated intentionally.
- Do not drift away from the `french-cheese-shop` presentation theme without explicit discussion.

## Contract

### Definition of Done

- [ ] `GET /` renders a single French cheese shop page with clear controls for baseline, challenge 1, challenge 2, and challenge 3.
- [ ] `GET /` keeps one shared customer-request input and a tab-specific audience refinement area.
- [ ] `GET /` opens with the baseline prompt prefilled so the demo starts in a meaningful default state.
- [ ] `GET /` keeps the baseline and challenge descriptions visible enough that the audience can tell the four passes apart before the presenter switches tabs.
- [ ] `GET /` uses the same visual direction as the `french-cheese-shop` presentation, including the cream background, navy and burgundy accents, and Didot/Avenir Next typography.
- [ ] `GET /api/search?q=...&scenario=...&audience=...` returns ordered cheese recommendations from the committed catalog.
- [ ] `baseline` ranks from the request wording alone.
- [ ] `challenge-1` makes hidden requirements explicit in the ranking and insight output.
- [ ] `challenge-2` uses extra product and context cues from the audience input.
- [ ] `challenge-3` returns evaluation checks alongside the ranking.
- [ ] Spec and ADR updates land in the same change set as the implementation.
- [ ] Automated tests cover Worker routing, scenario scoring, and browser tab flows.

### Regression Guardrails

- The live demo must stay publicly accessible without basic auth.
- The runtime path must stay deterministic enough for rehearsal and live teaching.
- The challenge controls must continue to share the same underlying customer request so the audience can compare behavior shifts.
- The live page copy should stay concise enough that the presenter can move through the full baseline-to-challenge flow quickly during a short demonstration.
- The default baseline prompt should stay visible in the main request input instead of being repeated in separate promo copy.
- The baseline and challenge summaries should remain easy to scan from a distance instead of depending on long body copy or tab switching to become understandable.
- HTML responses must ship with restrictive browser security headers, and client-side code must load from same-origin script assets so the CSP can keep `script-src 'self'`.
- The cheese catalog should stay small, committed, and easy to review.
- Challenge behavior must stay explainable through returned insights and, for challenge 3, evaluation checks.

### Verification

- **Automated tests:** Vitest covers the scenario engine, Worker responses, and API validation. Playwright covers the tabbed UI and scenario changes against the local Worker.
- **Coverage target:** The cheese-domain and Worker entry code must remain within the repo coverage gate enforced by `npm run test:coverage`.

### Scenarios

**Scenario: Presenter runs the baseline search**

- Given: the demo page is open
- When: the presenter keeps or enters `I want something like Brie but stronger`
- Then: the baseline tab returns a plausible but shallow recommendation based on the wording alone and the presenter can explain that step quickly

**Scenario: Audience adds hidden requirements**

- Given: the presenter is on challenge 1
- When: the audience adds cues such as `keep it creamy` or `cow's milk`
- Then: the ranking and insight panel change to reflect those explicit requirements

**Scenario: Audience adds data needs**

- Given: the presenter is on challenge 2
- When: the audience adds extra context such as `serve it with cider` or `it must be in stock`
- Then: the ranking changes to use those product and context data cues

**Scenario: Audience defines success criteria**

- Given: the presenter is on challenge 3
- When: the audience adds criteria such as `must be in stock` or `explain why it fits`
- Then: the results include evaluation checks that make the quality judgment inspectable

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

- [ ] `GET /` renders a three-column French cheese shop page on larger screens with challenge controls on the left, the main search view in the middle, and the requirements lens on the right.
- [ ] `GET /` keeps one shared customer-request input and a challenge-specific audience answer area.
- [ ] `GET /` opens with the baseline prompt prefilled so the demo starts in a meaningful default state.
- [ ] `GET /` keeps the baseline and challenge descriptions visible enough that the audience can tell the four passes apart before the presenter switches tabs.
- [ ] `GET /` lets the presenter capture audience answers through visible challenge-specific choices before falling back to a custom note.
- [ ] `GET /` carries forward earlier challenge answers into later challenge searches so the teaching flow can layer requirements instead of replacing them.
- [ ] `GET /` uses the same visual direction as the `french-cheese-shop` presentation, including the cream background, navy and burgundy accents, and Didot/Avenir Next typography.
- [ ] `GET /api/search?q=...&scenario=...&audience=...` returns ordered cheese recommendations from the committed catalog.
- [ ] Search results stay compact by default and can reveal more explanation on demand.
- [ ] The requirements lens stays synchronized with each active ranking signal, including explicit milk type and carry-forward audience cues from earlier challenges.
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
- Later challenges must preserve earlier explicit audience cues in both ranking and the requirements lens unless the presenter removes them.
- The challenge controls should stay visible in a fixed left sidebar on larger screens, and the requirements lens should stay visible in a fixed right sidebar.
- The live page copy should stay concise enough that the presenter can move through the full baseline-to-challenge flow quickly during a short demonstration.
- The default baseline prompt should stay visible in the main request input instead of being repeated in separate promo copy.
- The baseline and challenge summaries should remain easy to scan from a distance instead of depending on long body copy or tab switching to become understandable.
- The audience capture flow should make the type of answer visible in the UI instead of relying on an abstract blank text box.
- HTML responses must ship with restrictive browser security headers, and client-side code must load from same-origin script assets so the CSP can keep `script-src 'self'`.
- The cheese catalog should stay small, committed, and easy to review.
- Challenge behavior must stay explainable through returned insights and, for challenge 3, evaluation checks.
- Result rows should prioritize quick scanning and avoid showing every explanation block at full length by default.

### Verification

- **Automated tests:** Vitest covers the scenario engine, Worker responses, and API validation. Playwright covers the tabbed UI and scenario changes against the local Worker.
- **Coverage target:** The cheese-domain and Worker entry code must remain within the repo coverage gate enforced by `npm run test:coverage`.

### Scenarios

**Scenario: Presenter runs the baseline search**

- Given: the demo page is open
- When: the presenter keeps or enters `I want something like Brie but stronger`
- Then: the baseline tab returns a plausible but shallow recommendation based on the wording alone and the presenter can explain that step quickly

**Scenario: Presenter expands one result**

- Given: a result list is visible
- When: the presenter opens one result row
- Then: the supporting explanation and matched signals become visible without expanding every other result

**Scenario: Audience adds hidden requirements**

- Given: the presenter is on challenge 1
- When: the audience selects cues such as `keep it creamy` or `cow's milk`
- Then: the ranking and insight panel change to reflect those explicit requirements

**Scenario: Audience adds data needs**

- Given: the presenter is on challenge 2
- When: the audience selects extra context such as `serve it with cider` or `it must be in stock`
- Then: the ranking changes to use those product and context data cues

**Scenario: Presenter carries earlier requirements into later challenges**

- Given: the presenter selected hidden-need cues such as `keep it creamy` and `cow's milk` in challenge 1
- When: the presenter switches to challenge 2 or challenge 3 and adds more audience answers
- Then: the requirements lens and ranking continue to include the earlier cues until the presenter clears them

**Scenario: Audience defines success criteria**

- Given: the presenter is on challenge 3
- When: the audience selects criteria such as `must be in stock` or `explain why it fits`
- Then: the results include evaluation checks that make the quality judgment inspectable

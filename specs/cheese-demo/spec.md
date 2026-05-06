# Feature: French Cheese Shop Demo

## Blueprint

### Context

French Cheese Shop Demo supports a fast live teaching flow around AI in requirements engineering. The presenter starts from a vague customer request and uses audience input to refine the system behavior across three explicit challenges.

### Architecture

- **Entry points:** `GET /`, `GET /api/search?q=...&scenario=...&audience=...&season=...&shopState=...&backend=...`, `GET /api/session?room=...`, `POST /api/session?room=...`, `GET /api/session/live?room=...`, and `GET /api/health`
- **Data models:** `CheeseRecord` in `src/cheese/catalog.ts` is the committed product model. Required fields are `cheeseId`, `name`, `region`, `milkType`, `style`, `textures`, `pairings`, `servingContexts`, `intensity`, `priceEur`, `stock`, and `blurb`.
- **Catalog coverage:** the committed catalog should include enough cow, goat, sheep, and mixed-milk variants across bloomy, washed-rind, blue, pressed, and fresh-goat styles for visible result changes when the audience votes on constraints.
- **Scenario contract:** `scenario` must accept `baseline`, `challenge-1`, `challenge-2`, and `challenge-3`.
- **Simulation context contract:** `season` and `shopState` are shared world-context controls available from baseline through challenge 3.
- **Backend contract:** `backend` must accept `rules` and `llm`, with `rules` as the default and `llm` implemented as a local contrast mode instead of a live remote model call.
- **Multiplayer contract:** a room id selects one canonical shared demo session. Shared room state is coordinated server-side, while local-only UI state such as expanded result cards and the `Context` drawer open state stays per browser.
- **Focus mode contract:** the lecturer can enable a room-scoped focus mode that hides `Context` for every connected browser while leaving challenge controls and audience choices aligned.
- **Audience voting contract:** challenge presets are grouped vote options. Audience browsers contribute vote counts, the room derives active challenge inputs from the highest-voted option in each semantic group, and lecturer overrides take precedence per group.
- **Complete reset contract:** the lecturer can reset the room back to the default query, baseline challenge, empty audience votes, empty lecturer overrides, empty world context, and rules backend while retaining lecturer control.
- **Lecturer release contract:** the current lecturer can release room controls without resetting shared demo state so another lecturer device can claim the room.
- **Challenge pacing contract:** baseline is the only challenge visible to audience browsers by default. The lecturer can reveal later challenges one at a time, and revealed challenge state is shared by the room.
- **Dependencies:** The deployed Worker depends only on the committed repo assets, generated CSS, the generated browser bundle, and one Durable Object binding for room coordination. No remote AI, Vectorize, KV, or import-time credentials are part of the current runtime path.

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
- [ ] `GET /` hides unrevealed challenge controls from audience browsers so the lecturer can pace the demo without previewing later steps.
- [ ] `GET /` gives the lecturer a next-challenge control that reveals and activates the next challenge for the room.
- [ ] `GET /` keeps a compact lecturer-only teaching-focus panel in the main column with the current learning outcome plus short `Ask`, `Notice`, `Pause`, and `Timebox` prompts so the deck's pedagogical goal stays available to the presenter without distracting audience browsers.
- [ ] `GET /` gives the lecturer a stop-here marker for Challenge 1 and Challenge 2 so the demo can end cleanly when time runs short.
- [ ] `GET /` lets the lecturer enable a room-scoped focus mode for short demos that hides Context for students and the lecturer while keeping challenge controls and audience choices aligned.
- [ ] `GET /` keeps Challenge 1 on the same baseline ranking until the lecturer or audience selects an explicit hidden need.
- [ ] `GET /` tells the room that Challenge 1 still uses baseline ranking while no hidden need is selected.
- [ ] `GET /` shows a compact `What changed?` strip above results so the audience can compare the vague-request baseline against the current explicit requirements and leading recommendation.
- [ ] `GET /` shows a compact `Requirements learned` summary that closes the loop from original request to clarified preferences, operational constraints, and evaluation checks.
- [ ] `GET /` lets the presenter capture audience answers through visible challenge-specific vote choices before falling back to a custom note.
- [ ] `GET /` gives each challenge a direct audience instruction so participants know the one action expected at that step.
- [ ] `GET /` marks one lecturer-friendly suggested path option per challenge so a live demo can proceed quickly without forcing the lecturer to improvise the next vote.
- [ ] `GET /` groups semantic alternatives such as milk type so the audience votes between options instead of selecting contradictory cues.
- [ ] `GET /` shows vote counts beside challenge options and in the selected audience summary.
- [ ] `GET /` frames selected vote winners as room choices so students can see their collective input in the requirements lens.
- [ ] `GET /` lets the lecturer override the audience vote for one option group by pressing an option in that group when the teaching path needs a deliberate contrast.
- [ ] `GET /` lets the lecturer clear the current challenge's audience votes and overrides without resetting the full room.
- [ ] `GET /` carries forward earlier challenge answers into later challenge searches so the teaching flow can layer requirements instead of replacing them.
- [ ] Each challenge preset list teaches one distinct step in the story: hidden needs, concrete facts, then evaluation criteria.
- [ ] `GET /` exposes simulation context controls inside a compact foldable `Context` container on the right so the presenter can change season and shop state explicitly from baseline through challenge 3.
- [ ] `GET /` exposes one optional backend toggle inside the same `Context` container so the presenter can compare deterministic rules with an LLM-style backend without interrupting the main challenge flow.
- [ ] The `Context` container stays closed by default and only restores its open state from an explicit query flag.
- [ ] `GET /` exposes a shareable room id control so multiple browsers can join the same demo session intentionally.
- [ ] The shared-room controls can be folded when the presenter wants to reduce visual noise without leaving the room.
- [ ] `GET /` keeps the shared-room controls folded by default on phone-sized screens so the search results stay visible sooner.
- [ ] `GET /` shows whether the room is live and how many participants are currently connected.
- [ ] `GET /` lets one device claim lecturer controls for the current room so only that device can change the shared search query, shared world context, active challenge, or reset the room.
- [ ] `GET /` hides lecturer controls from non-lecturer browsers after another device has claimed lecturer controls for the room.
- [ ] `GET /` hides lecturer-link copying and room reset actions from non-lecturer browsers after another device has claimed lecturer controls for the room.
- [ ] `GET /` lets the lecturer completely reset the current room while keeping lecturer controls active for the next run.
- [ ] `GET /` shows a lecturer ready check after reset so repeated demos can confirm baseline state, lecturer control, and focus-mode status.
- [ ] `GET /` lets the lecturer release room controls manually without resetting the current room.
- [ ] `GET /` exposes a safe audience-link copy action that joins the room without handing lecturer controls to participants.
- [ ] `GET /` uses the same visual direction as the `french-cheese-shop` presentation, including the cream background, navy and burgundy accents, and Didot/Avenir Next typography.
- [ ] `GET /api/search?q=...&scenario=...&audience=...&season=...&shopState=...&backend=...` returns ordered cheese recommendations from the committed catalog.
- [ ] `GET /api/session?room=...` returns the canonical shared room snapshot including the active scenario, accumulated challenge inputs, shared world context, backend mode, derived search results, and lecturer access flags for that room.
- [ ] `POST /api/session?room=...` accepts room commands such as query changes, scenario changes, preset toggles, context changes, backend changes, and room reset.
- [ ] `POST /api/session?room=...` protects shared query changes, shared world context changes, challenge changes, and room reset behind lecturer access for the current room.
- [ ] `GET /api/session/live?room=...` streams room snapshots so multiple connected browsers converge on the same shared session state without manual refresh.
- [ ] Search results stay compact by default and can reveal more explanation on demand.
- [ ] Expanded result rows stay open across incremental challenge updates when the same result remains visible.
- [ ] The requirements lens stays synchronized with each active ranking signal, including explicit milk type and carry-forward audience cues from earlier challenges.
- [ ] Context controls produce visible suitability and availability changes in the results and requirements lens.
- [ ] `baseline` ranks from the request wording alone unless the presenter enables shared world context.
- [ ] `baseline` makes the deliberate teaching failure visible when the lead repeats the named reference despite a stronger-target request.
- [ ] `challenge-1` makes hidden requirements explicit in the ranking and insight output.
- [ ] `challenge-2` uses extra product, operating constraint, and use-context cues from the audience input.
- [ ] `challenge-3` returns evaluation checks alongside the ranking.
- [ ] Challenge 3 evaluation options produce visible result changes such as a two-finalist shortlist, a concrete expanded-card trade-off section, or a direct why-it-fits explanation.
- [ ] Spec and ADR updates land in the same change set as the implementation.
- [ ] Automated tests cover Worker routing, scenario scoring, and browser tab flows.

### Regression Guardrails

- The live demo must stay publicly accessible without basic auth.
- The runtime path must stay deterministic enough for rehearsal and live teaching.
- The challenge controls must continue to share the same underlying customer request so the audience can compare behavior shifts.
- Later challenges must preserve earlier explicit audience cues in both ranking and the requirements lens unless the presenter removes them.
- Shared world context must preserve the selected season and shop state until the presenter changes them, including across baseline and every challenge.
- The backend toggle must stay optional and shared across baseline plus all challenges, so the presenter can treat it as a short coda instead of a second primary lesson.
- Participants should still be able to contribute audience and backend inputs even when lecturer controls are locked to one device.
- Audience challenge inputs should be derived from grouped vote winners, while lecturer overrides should visibly replace the vote winner for that group.
- Room reset must advance the room version monotonically so connected browsers accept the reset even after many prior updates.
- Room reset must clear stale local audience vote selections when reset snapshots reach participant browsers.
- Audience-facing room sharing must not require copying a lecturer token by default.
- Preset examples and lens labels should avoid challenge overlap unless the carry-forward behavior is the point being taught explicitly.
- The challenge controls should stay visible in a fixed left sidebar on larger screens, and the requirements lens plus the foldable `Context` container should stay visible on the right.
- Unrevealed challenge controls should stay hidden from audience browsers until the lecturer reveals them.
- Phone-sized viewports should prioritize the search box and visible result rows over persistent room chrome or other sticky overlays.
- URL-synced state should include whether the `Context` container is explicitly open, without forcing it open just because season or backend selections exist.
- The live page copy should stay concise enough that the presenter can move through the full baseline-to-challenge flow quickly during a short demonstration.
- Focus mode should be shared room state controlled by the lecturer, so already-joined student browsers lose the `Context` surface during the short demo flow.
- The default baseline prompt should stay visible in the main request input instead of being repeated in separate promo copy.
- The baseline and challenge summaries should remain easy to scan from a distance instead of depending on long body copy or tab switching to become understandable.
- The audience capture flow should make the type of answer and vote count visible in the UI instead of relying on an abstract blank text box.
- The teaching prompts should stay short enough to scan during a live session and should stay aligned with the slide-deck learning outcomes: interpreting vague requests, specifying domain and operational context, and evaluating ambiguity.
- HTML responses must ship with restrictive browser security headers, and client-side code must load from same-origin script assets so the CSP can keep `script-src 'self'`.
- The cheese catalog should stay small, committed, and easy to review.
- The cheese catalog should cover the visible vote options well enough that milk type, style, pairing, budget, serving context, season, and stock constraints can change the shortlist.
- Challenge behavior must stay explainable through returned insights and, for challenge 3, evaluation checks.
- Comparative follow-up requests such as `like Livarot, but stronger` should not keep the named reference cheese as the top result when the request explicitly asks for the next stronger or milder step away from it.
- The `LLM-style ranking` option must remain local and deterministic enough for rehearsal, even if it intentionally produces a different ranking style from the rules engine.
- Challenge 3 explanation requests should explain the current ranking signals rather than act as a hidden reranking criterion.
- Challenge 3 should avoid abstract criteria that do not produce a visible change in the result set or result details.
- Result rows should prioritize quick scanning and avoid showing every explanation block at full length by default.
- Incremental audience refinements should not collapse an already expanded result row unless that result leaves the visible list.

### Verification

- **Automated tests:** Vitest covers the scenario engine, Worker responses, and API validation. Playwright covers the tabbed UI, scenario changes, and at least one phone-sized viewport flow against the local Worker.
- **Coverage target:** The cheese-domain and Worker entry code must remain within the repo coverage gate enforced by `npm run test:coverage`.

### Scenarios

**Scenario: Presenter runs the baseline search**

- Given: the demo page is open
- When: the presenter keeps or enters `I want something like Brie but stronger`
- Then: the baseline tab returns a plausible but shallow recommendation based on the wording alone, and the main teaching prompt makes the ambiguity lesson explicit

**Scenario: Presenter adds shared world context before switching challenges**

- Given: the presenter opens the `Context` container in baseline
- When: the lecturer selects a season or shop-state overlay such as `Winter holiday`
- Then: the same context remains active in baseline and every later challenge until the presenter changes it

**Scenario: Two browsers join the same demo room**

- Given: two participants open the same `room` URL
- When: one participant changes the active challenge or selects an audience preset
- Then: the second participant sees the same shared challenge state and derived results without a page refresh

**Scenario: Presenter shares a room link**

- Given: the presenter is preparing the demo for a group
- When: the presenter copies the current room link and opens it in another browser
- Then: both browsers join the same shared room while keeping local-only UI details such as expanded result cards independent

**Scenario: Lecturer locks shared demo controls to one device**

- Given: multiple browsers have joined the same room
- When: the lecturer claims lecturer controls on one device
- Then: only that device can change the shared search query, shared world context, active challenge, or reset the room, while other participants can still contribute shared audience inputs

**Scenario: Lecturer resets the room between demo runs**

- Given: the room has a custom query, revealed challenges, audience votes, and lecturer controls claimed
- When: the lecturer resets the room
- Then: all connected browsers return to the default baseline state, audience votes and lecturer overrides are cleared, and the lecturer keeps control for the next run

**Scenario: Lecturer releases a room**

- Given: the lecturer has claimed room controls
- When: the lecturer releases the room
- Then: the room keeps its current query and challenge state, lecturer controls become unclaimed, and another lecturer device can claim control

**Scenario: Presenter optionally compares backend styles**

- Given: the presenter wants a short coda after the main requirements flow
- When: the presenter opens the `Context` container and switches from `Deterministic rules` to `LLM-style ranking`
- Then: the ranking and insights visibly change, while the app remains local and deterministic enough to rehearse

**Scenario: Presenter expands one result**

- Given: a result list is visible
- When: the presenter opens one result row
- Then: the supporting explanation and matched signals become visible without expanding every other result

**Scenario: Presenter refines a challenge while one result is open**

- Given: a result row is expanded
- When: the presenter adds or removes a challenge preset such as `explain why it fits`
- Then: the same row stays expanded if that result remains in the visible results

**Scenario: Audience adds hidden requirements**

- Given: the presenter is on challenge 1
- When: the audience votes for cues such as `keep it creamy` or `cow's milk`
- Then: the ranking, insight panel, and teaching prompt all reinforce that the team has converted hidden meaning into explicit requirements

**Scenario: Audience votes between semantic alternatives**

- Given: the presenter is on challenge 1
- When: the audience votes for milk-type alternatives such as `cow's milk`, `goat's milk`, `sheep's milk`, or `mixed milk ok`
- Then: the room uses the highest-voted milk option as the active requirement and shows the vote count for the selected option

**Scenario: Lecturer overrides an audience vote**

- Given: the audience has voted on a challenge option group
- When: the lecturer presses a different option in that group
- Then: the overridden option becomes the active requirement for that group while the audience vote count remains visible for discussion

**Scenario: Audience adds data needs**

- Given: the presenter is on challenge 2
- When: the audience votes for extra context such as `Pairing: cider`, `Availability: in stock`, or `Winter holiday`
- Then: the ranking changes to use those product, context, and simulation cues, and the teaching prompt ties those changes back to domain and operational context

**Scenario: Presenter carries earlier requirements into later challenges**

- Given: the presenter selected hidden-need cues such as `keep it creamy` and `cow's milk` in challenge 1
- When: the presenter switches to challenge 2 or challenge 3 and adds more audience answers
- Then: the requirements lens and ranking continue to include the earlier cues until the presenter clears them

**Scenario: Audience defines success criteria**

- Given: the presenter is on challenge 3
- When: the audience votes for criteria such as `show why it fits`, `show trade-offs`, or `keep it to two finalists`
- Then: the results include visible changes that make the quality judgment inspectable, and the teaching prompt frames that step as evaluation under ambiguity

**Scenario: Presenter asks for a why-it-fits explanation**

- Given: the presenter is on challenge 3 with a visible ranked shortlist
- When: the presenter selects `show why it fits`
- Then: expanded cards explain the current ranking signals without changing the order by themselves

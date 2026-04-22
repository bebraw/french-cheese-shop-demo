import { DEFAULT_QUERY, DEFAULT_ROOM_ID } from "../demo-config";
import { escapeHtml } from "./shared";

const appTitle = "French Cheese Shop";

export function renderHomePage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(appTitle)}</title>
    <link rel="stylesheet" href="/styles.css">
    <script src="/app.js" defer></script>
  </head>
  <body class="min-h-screen bg-app-canvas text-app-text antialiased">
    <main class="px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
      <div class="mx-auto flex max-w-7xl flex-col gap-6">
        <h1 class="font-display text-[clamp(1.35rem,2.8vw,2rem)] leading-none text-app-primary">${escapeHtml(appTitle)}</h1>
        <section class="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)_18rem] lg:items-start">
          <aside class="order-2 lg:order-1 lg:sticky lg:top-6 lg:self-start">
            <section>
              <p class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-app-accent">Challenges</p>
              <div class="mt-4 grid gap-3" role="group" aria-label="Choose demo challenge">
                <button type="button" class="scenario-guide-item scenario-guide-item-active text-left" data-scenario="baseline" aria-pressed="true">
                  <p class="scenario-guide-kicker">Baseline</p>
                  <p class="scenario-guide-title">Surface match</p>
                  <p class="scenario-guide-copy">Use “${escapeHtml(DEFAULT_QUERY)}” as-is.</p>
                </button>
                <button type="button" class="scenario-guide-item text-left" data-scenario="challenge-1" aria-pressed="false">
                  <p class="scenario-guide-kicker">Challenge 1</p>
                  <p class="scenario-guide-title">Hidden needs</p>
                  <p class="scenario-guide-copy">Clarify implied preferences.</p>
                </button>
                <button type="button" class="scenario-guide-item text-left" data-scenario="challenge-2" aria-pressed="false">
                  <p class="scenario-guide-kicker">Challenge 2</p>
                  <p class="scenario-guide-title">Missing data</p>
                  <p class="scenario-guide-copy">Add facts and constraints.</p>
                </button>
                <button type="button" class="scenario-guide-item text-left" data-scenario="challenge-3" aria-pressed="false">
                  <p class="scenario-guide-kicker">Challenge 3</p>
                  <p class="scenario-guide-title">Evaluation</p>
                  <p class="scenario-guide-copy">Make the results prove something concrete.</p>
                </button>
              </div>
            </section>
          </aside>
          <div class="order-1 lg:order-2">
            <div class="sticky top-4 z-10 rounded-[1.6rem] bg-app-canvas/92 py-1 supports-[backdrop-filter]:bg-app-canvas/82 backdrop-blur-xl">
              <section class="rounded-[1.35rem] border border-app-line bg-white/92 px-4 py-4 shadow-[0_10px_30px_rgba(13,29,46,0.04)]">
                <button
                  id="room-panel-toggle"
                  type="button"
                  class="flex w-full items-start justify-between gap-4 text-left"
                  aria-expanded="true"
                  aria-controls="room-panel-body"
                >
                  <span class="min-w-0">
                    <span class="block text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-accent">Shared Room</span>
                    <span class="mt-2 block text-sm leading-6 text-app-text-soft">Room link, collaboration status, and reset controls.</span>
                  </span>
                  <span
                    id="room-panel-icon"
                    class="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-line bg-app-canvas text-sm text-app-secondary"
                    aria-hidden="true"
                  >−</span>
                </button>
                <div id="room-panel-body" class="mt-4">
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div class="min-w-0 flex-1">
                      <label class="block" for="room-id-input">
                        <span class="sr-only">Room id</span>
                        <input id="room-id-input" name="room" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escapeHtml(DEFAULT_ROOM_ID)}" class="w-full rounded-[1.15rem] bg-app-surface px-4 py-3 text-sm leading-6 text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-white focus:ring-2 focus:ring-app-secondary/28">
                      </label>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <button id="room-join-button" type="button" class="audience-preset audience-preset-active">Join room</button>
                        <button id="room-copy-link-button" type="button" class="audience-preset">Copy link</button>
                        <button id="room-reset-button" type="button" class="audience-preset">Reset room</button>
                      </div>
                    </div>
                    <div class="rounded-[1.15rem] border border-app-line bg-app-canvas px-4 py-3 sm:max-w-[14rem]">
                      <p class="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-app-secondary">Collaboration</p>
                      <p id="room-connection-status" class="mt-2 text-sm leading-6 text-app-text-soft">Connecting...</p>
                      <p id="room-participant-count" class="mt-1 text-sm leading-6 text-app-text-soft">1 participant</p>
                    </div>
                  </div>
                </div>
              </section>
              <label class="block" for="customer-query">
                <span class="sr-only">Customer request</span>
                <input id="customer-query" name="q" type="search" autocomplete="off" spellcheck="false" value="${escapeHtml(DEFAULT_QUERY)}" placeholder="Type the customer request" class="mt-4 w-full rounded-[1.35rem] bg-app-surface px-5 py-4 text-lg text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-white focus:ring-2 focus:ring-app-secondary/28">
              </label>
              <div id="audience-controls" class="mt-4 hidden">
                <p id="audience-prompt" class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Audience answer</p>
                <div id="audience-presets" class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Audience answer options"></div>
                <label class="mt-4 block" for="audience-custom-input">
                  <span id="audience-label" class="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Other audience note</span>
                  <input id="audience-custom-input" name="audience-note" type="text" autocomplete="off" spellcheck="false" placeholder="" class="w-full rounded-[1.15rem] bg-app-surface px-4 py-3 text-sm leading-6 text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-white focus:ring-2 focus:ring-app-secondary/28">
                </label>
                <div class="mt-4 border-t border-app-line pt-4">
                  <p id="audience-summary-label" class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Audience answer</p>
                  <p id="audience-summary-empty" class="mt-3 text-sm leading-6 text-app-text-soft">Choose one or more answers below.</p>
                  <ul id="audience-summary-chips" class="mt-3 flex flex-wrap gap-2" aria-live="polite"></ul>
                </div>
              </div>
              <div id="search-status" class="mt-3 text-sm leading-6 text-app-text-soft"></div>
            </div>
            <div id="demo-panel" class="mt-6">
              <p class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-accent">Search Results</p>
              <ol id="search-results" class="mt-5 grid gap-4" aria-live="polite"></ol>
            </div>
          </div>
          <aside class="order-3 lg:sticky lg:top-6 lg:self-start">
            <section class="mt-8 border-t border-app-line pt-6 lg:mt-0 lg:border-t-0 lg:pt-0">
              <p class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-app-accent">Requirements Lens</p>
              <h2 id="scenario-title" class="mt-4 font-display text-[2rem] leading-[0.95] text-app-primary">Baseline</h2>
              <p id="scenario-description" class="mt-4 text-sm leading-7 text-app-text-soft">
                Start with the request wording alone.
              </p>
              <p id="insights-label" class="mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Signals in play</p>
              <ul id="scenario-insights" class="mt-4 grid gap-3 text-sm leading-6 text-app-text-soft"></ul>
            </section>
            <section class="relative mt-6 lg:mt-0">
              <button
                id="context-drawer-toggle"
                type="button"
                class="group flex items-center gap-3 rounded-[1.6rem] border border-app-line/85 bg-app-primary px-4 py-3 text-left text-app-canvas shadow-[0_10px_30px_rgba(13,29,46,0.14)] transition hover:border-app-secondary/30 lg:fixed lg:right-0 lg:top-32 lg:z-40 lg:flex-col lg:rounded-r-none lg:rounded-l-[2rem] lg:px-3 lg:py-5"
                aria-expanded="false"
                aria-controls="context-drawer-panel"
              >
                <span
                  id="context-drawer-icon"
                  class="text-xs font-semibold tracking-[0.2em] text-app-canvas transition lg:-mb-1 lg:text-sm"
                  aria-hidden="true"
                >▶</span>
                <span class="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-app-canvas lg:[writing-mode:vertical-rl] lg:text-[0.92rem]">Context</span>
              </button>
              <div
                id="context-drawer-panel"
                class="mt-4 rounded-[1.6rem] border border-app-line bg-white/92 px-4 py-4 shadow-[0_16px_40px_rgba(13,29,46,0.08)] backdrop-blur-xl lg:fixed lg:right-[3.25rem] lg:top-24 lg:z-30 lg:mt-0 lg:max-h-[calc(100vh-7rem)] lg:w-[18.75rem] lg:overflow-y-auto"
                hidden
              >
                <div>
                  <p class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-app-accent">World Context</p>
                  <p class="mt-2 text-sm leading-6 text-app-text-soft">Optional simulation state shared by baseline and every challenge.</p>
                  <div class="mt-4">
                    <p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-text-soft">Season</p>
                    <div id="season-controls" class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Season options"></div>
                  </div>
                  <div class="mt-4">
                    <p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-text-soft">Shop state</p>
                    <div id="shop-state-controls" class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Shop state options"></div>
                  </div>
                </div>
                <div class="mt-5 border-t border-app-line pt-4">
                  <p class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Context in play</p>
                  <p id="context-summary-empty" class="mt-3 text-sm leading-6 text-app-text-soft">No world context applied.</p>
                  <ul id="context-summary-chips" class="mt-3 flex flex-wrap gap-2" aria-live="polite"></ul>
                </div>
                <div class="mt-5 border-t border-app-line pt-4">
                  <p class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-app-accent">Search Backend</p>
                  <p class="mt-2 text-sm leading-6 text-app-text-soft">Optional coda for contrasting the stable rules engine with an LLM-style backend.</p>
                  <div class="mt-4">
                    <p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-text-soft">Mode</p>
                    <div id="backend-controls" class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Search backend options"></div>
                    <p class="mt-3 text-xs leading-6 text-app-text-soft">The LLM backend option stays local and deterministic for rehearsal. It is a contrast mode, not a live remote call.</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  </body>
</html>`;
}

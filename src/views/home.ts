import { escapeHtml } from "./shared";

const appTitle = "French Cheese Shop";
const defaultQuery = "I want something like Brie, but stronger.";

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
                  <p class="scenario-guide-copy">Use “${escapeHtml(defaultQuery)}” as-is.</p>
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
            <section class="mt-6 border-t border-app-line pt-5">
              <button
                id="context-toggle"
                type="button"
                class="flex w-full items-center justify-between gap-3 text-left"
                aria-expanded="false"
                aria-controls="context-panel"
              >
                <span>
                  <span class="block text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-app-accent">World Context</span>
                  <span class="mt-2 block text-sm leading-6 text-app-text-soft">Optional simulation state shared by baseline and every challenge.</span>
                </span>
                <span id="context-toggle-label" class="shrink-0 rounded-full border border-app-line bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-secondary">Show</span>
              </button>
              <div id="context-panel" class="mt-4" hidden>
                <div>
                  <p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-text-soft">Season</p>
                  <div id="season-controls" class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Season options"></div>
                </div>
                <div class="mt-4">
                  <p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-text-soft">Shop state</p>
                  <div id="shop-state-controls" class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Shop state options"></div>
                </div>
              </div>
              <div class="mt-4 border-t border-app-line pt-4">
                <p class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Context in play</p>
                <p id="context-summary-empty" class="mt-3 text-sm leading-6 text-app-text-soft">No world context applied.</p>
                <ul id="context-summary-chips" class="mt-3 flex flex-wrap gap-2" aria-live="polite"></ul>
              </div>
            </section>
          </aside>
          <div class="order-1 lg:order-2">
            <div class="sticky top-4 z-10 rounded-[1.6rem] bg-app-canvas/92 py-1 supports-[backdrop-filter]:bg-app-canvas/82 backdrop-blur-xl">
              <label class="block" for="customer-query">
                <span class="sr-only">Customer request</span>
                <input id="customer-query" name="q" type="search" autocomplete="off" spellcheck="false" value="${escapeHtml(defaultQuery)}" placeholder="Type the customer request" class="w-full rounded-[1.35rem] bg-app-surface px-5 py-4 text-lg text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-white focus:ring-2 focus:ring-app-secondary/28">
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
          </aside>
        </section>
      </div>
    </main>
  </body>
</html>`;
}

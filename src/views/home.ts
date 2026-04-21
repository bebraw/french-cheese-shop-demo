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
        <header class="overflow-hidden rounded-[2.1rem] border border-app-line bg-app-card shadow-[var(--shadow-panel)]">
          <div class="px-6 py-6 sm:px-8 sm:py-8">
            <h1 class="max-w-4xl font-display text-[clamp(1.9rem,4vw,3rem)] leading-[0.94] text-app-primary">${escapeHtml(appTitle)}</h1>
            <p class="mt-3 max-w-2xl text-base leading-7 text-app-text-soft sm:text-lg">
              One vague request. Four ways to tighten it.
            </p>
            <div class="mt-6 grid gap-3 sm:grid-cols-2" role="group" aria-label="Choose demo challenge">
              <button type="button" class="scenario-guide-item scenario-guide-item-active text-left" data-scenario="baseline" aria-pressed="true">
                <p class="scenario-guide-kicker">Baseline</p>
                <p class="scenario-guide-title">Surface wording only</p>
                <p class="scenario-guide-copy">Start with “${escapeHtml(defaultQuery)}” as written.</p>
              </button>
              <button type="button" class="scenario-guide-item text-left" data-scenario="challenge-1" aria-pressed="false">
                <p class="scenario-guide-kicker">Challenge 1</p>
                <p class="scenario-guide-title">Hidden requirements</p>
                <p class="scenario-guide-copy">Ask what “like Brie” and “stronger” really mean.</p>
              </button>
              <button type="button" class="scenario-guide-item text-left" data-scenario="challenge-2" aria-pressed="false">
                <p class="scenario-guide-kicker">Challenge 2</p>
                <p class="scenario-guide-title">Missing data</p>
                <p class="scenario-guide-copy">Add facts like stock, pairing, or style.</p>
              </button>
              <button type="button" class="scenario-guide-item text-left" data-scenario="challenge-3" aria-pressed="false">
                <p class="scenario-guide-kicker">Challenge 3</p>
                <p class="scenario-guide-title">Evaluation</p>
                <p class="scenario-guide-copy">Decide what counts as a good answer.</p>
              </button>
            </div>
          </div>
        </header>
        <section class="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div class="rounded-[2rem] border border-app-line bg-app-panel px-5 py-5 shadow-[var(--shadow-panel)] sm:px-6 sm:py-6">
            <div class="sticky top-4 z-10 rounded-[1.6rem] border border-app-line bg-app-canvas/92 p-3 shadow-[var(--shadow-soft)] supports-[backdrop-filter]:bg-app-canvas/82 backdrop-blur-xl">
              <label class="block" for="customer-query">
                <span class="sr-only">Customer request</span>
                <input id="customer-query" name="q" type="search" autocomplete="off" spellcheck="false" value="${escapeHtml(defaultQuery)}" placeholder="Type the customer request" class="w-full rounded-[1.35rem] bg-app-surface px-5 py-4 text-lg text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-white focus:ring-2 focus:ring-app-secondary/28">
              </label>
              <div id="audience-controls" class="mt-4 hidden">
                <div class="rounded-[1.35rem] border border-app-line bg-white/72 px-4 py-4">
                  <p id="audience-prompt" class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Audience answer</p>
                  <div id="audience-presets" class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Audience answer options"></div>
                  <label class="mt-4 block" for="audience-custom-input">
                    <span id="audience-label" class="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Other audience note</span>
                    <input id="audience-custom-input" name="audience-note" type="text" autocomplete="off" spellcheck="false" placeholder="" class="w-full rounded-[1.15rem] bg-app-surface px-4 py-3 text-sm leading-6 text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-white focus:ring-2 focus:ring-app-secondary/28">
                  </label>
                </div>
                <div class="mt-4 rounded-[1.35rem] border border-app-line bg-app-surface px-4 py-4">
                  <p id="audience-summary-label" class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Audience answer</p>
                  <p id="audience-summary-empty" class="mt-3 text-sm leading-6 text-app-text-soft">Choose one or more answers below.</p>
                  <ul id="audience-summary-chips" class="mt-3 flex flex-wrap gap-2" aria-live="polite"></ul>
                </div>
              </div>
              <div id="search-status" class="mt-3 text-sm leading-6 text-app-text-soft"></div>
            </div>
            <div id="demo-panel" class="mt-6">
              <div class="rounded-[1.6rem] border border-app-line bg-white px-5 py-5">
                <p class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-accent">Search Results</p>
                <ol id="search-results" class="mt-5 grid gap-4" aria-live="polite"></ol>
              </div>
            </div>
          </div>
          <aside class="rounded-[2rem] border border-app-line bg-app-canvas px-5 py-5 shadow-[var(--shadow-panel)] sm:px-6 sm:py-6">
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-app-accent">Requirements Lens</p>
            <h2 id="scenario-title" class="mt-4 font-display text-[2rem] leading-[0.95] text-app-primary">Baseline</h2>
            <p id="scenario-description" class="mt-4 text-sm leading-7 text-app-text-soft">
              Start with the request text alone and show the first plausible answer.
            </p>
            <div class="mt-6 rounded-[1.5rem] border border-app-line bg-app-surface px-4 py-4">
              <p id="insights-label" class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Signals in play</p>
              <ul id="scenario-insights" class="mt-4 grid gap-3 text-sm leading-6 text-app-text-soft"></ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  </body>
</html>`;
}

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
        <header class="grid gap-5 overflow-hidden rounded-[2.1rem] border border-app-line bg-app-card shadow-[var(--shadow-panel)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
          <div class="px-6 py-8 sm:px-8 sm:py-10">
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-app-secondary">French Cheese Shop</p>
            <h1 class="mt-4 max-w-4xl font-display text-[clamp(2.9rem,8vw,5.6rem)] leading-[0.88] text-app-primary">${escapeHtml(appTitle)}</h1>
            <p class="mt-4 max-w-2xl text-base leading-7 text-app-text-soft sm:text-lg">
              Live demo for AI in requirements engineering: start from a vague cheese request, then refine the behavior through hidden requirements, data needs, and evaluation criteria.
            </p>
          </div>
          <aside class="bg-app-secondary px-6 py-8 text-app-cream sm:px-8 sm:py-10">
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-app-accent">Presentation Mode</p>
            <h2 class="mt-4 font-display text-[2rem] leading-[0.95]">Baseline and challenge tabs</h2>
            <p class="mt-4 max-w-sm text-sm leading-6 text-app-cream/84">
              Use the same customer request in every tab and let the audience add the missing requirements that shift the recommendation.
            </p>
            <div class="mt-6 rounded-[1.5rem] border border-white/12 bg-white/8 p-4">
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-app-accent">Starter prompt</p>
              <p class="mt-3 font-display text-[1.4rem] leading-[1.05]">“I want something like Brie, but stronger.”</p>
            </div>
          </aside>
        </header>
        <section class="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div class="rounded-[2rem] border border-app-line bg-app-panel px-5 py-5 shadow-[var(--shadow-panel)] sm:px-6 sm:py-6">
            <div class="sticky top-4 z-10 rounded-[1.6rem] border border-app-line bg-app-canvas/92 p-3 shadow-[var(--shadow-soft)] supports-[backdrop-filter]:bg-app-canvas/82 backdrop-blur-xl">
              <div class="flex flex-wrap gap-2" id="scenario-tabs" role="tablist" aria-label="Demo scenarios">
                <button type="button" id="tab-baseline" class="demo-tab demo-tab-active" data-scenario="baseline" role="tab" aria-selected="true" aria-controls="demo-panel">Baseline</button>
                <button type="button" id="tab-challenge-1" class="demo-tab" data-scenario="challenge-1" role="tab" aria-selected="false" aria-controls="demo-panel">Challenge 1</button>
                <button type="button" id="tab-challenge-2" class="demo-tab" data-scenario="challenge-2" role="tab" aria-selected="false" aria-controls="demo-panel">Challenge 2</button>
                <button type="button" id="tab-challenge-3" class="demo-tab" data-scenario="challenge-3" role="tab" aria-selected="false" aria-controls="demo-panel">Challenge 3</button>
              </div>
              <label class="mt-4 block" for="customer-query">
                <span class="sr-only">Customer request</span>
                <input id="customer-query" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="Type the customer request" class="w-full rounded-[1.35rem] bg-app-surface px-5 py-4 text-lg text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-white focus:ring-2 focus:ring-app-secondary/28">
              </label>
              <div id="audience-controls" class="mt-4 hidden">
                <label class="block" for="audience-input">
                  <span id="audience-label" class="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">Audience refinements</span>
                  <textarea id="audience-input" rows="3" placeholder="" class="w-full resize-y rounded-[1.35rem] bg-app-surface px-5 py-4 text-base leading-7 text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-white focus:ring-2 focus:ring-app-secondary/28"></textarea>
                </label>
              </div>
              <div id="search-status" class="mt-3 text-sm leading-6 text-app-text-soft"></div>
            </div>
            <div id="demo-panel" class="mt-6" role="tabpanel" aria-labelledby="tab-baseline">
              <div class="rounded-[1.6rem] border border-app-line bg-white px-5 py-5">
                <p class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-accent">Search Results</p>
                <ol id="search-results" class="mt-5 grid gap-4" aria-live="polite"></ol>
              </div>
            </div>
          </div>
          <aside class="rounded-[2rem] border border-app-line bg-app-canvas px-5 py-5 shadow-[var(--shadow-panel)] sm:px-6 sm:py-6">
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-app-accent">Requirements Lens</p>
            <h2 id="scenario-title" class="mt-4 font-display text-[2rem] leading-[0.95] text-app-primary">Baseline Search</h2>
            <p id="scenario-description" class="mt-4 text-sm leading-7 text-app-text-soft">
              Start with the customer wording alone and show how a reasonable but shallow result can still miss what the user really means.
            </p>
            <div class="mt-6 rounded-[1.5rem] border border-app-line bg-app-surface px-4 py-4">
              <p id="insights-label" class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary">What the system sees</p>
              <ul id="scenario-insights" class="mt-4 grid gap-3 text-sm leading-6 text-app-text-soft"></ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  </body>
</html>`;
}

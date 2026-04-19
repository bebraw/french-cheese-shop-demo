import { escapeHtml } from "./shared";

const appTitle = "Find an MSc Supervisor";
const appDescription =
  "Search supervisors by topic fit and current thesis load. Results update as you type and can be retuned in application code without rebuilding the data pipeline.";

export function renderHomePage(): string {
  const suggestionChips = ["Machine learning systems", "HCI and accessibility", "Cybersecurity", "Distributed systems"]
    .map(
      (suggestion) =>
        `<button type="button" data-suggestion="${escapeHtml(suggestion)}" class="rounded-full border border-app-line/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-app-text transition hover:border-app-accent hover:text-app-accent-strong">${escapeHtml(suggestion)}</button>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(appTitle)}</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body class="min-h-screen bg-app-canvas text-app-text antialiased">
    <main class="mx-auto w-[min(72rem,calc(100vw-2rem))] px-0 py-8 sm:py-12">
      <article class="overflow-hidden rounded-[1.75rem] border border-app-line/80 bg-app-surface/95 shadow-panel backdrop-blur">
        <section class="grid gap-8 border-b border-app-line/80 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)] lg:items-end">
          <div>
            <p class="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-app-accent">Internal Matching Tool</p>
            <h1 class="max-w-[12ch] text-5xl leading-none font-semibold tracking-[-0.05em] sm:text-7xl">${escapeHtml(appTitle)}</h1>
            <p class="mt-4 max-w-3xl text-lg leading-8 text-app-text-soft">${escapeHtml(appDescription)}</p>
            <div class="mt-6 flex flex-wrap gap-2">${suggestionChips}</div>
          </div>
          <aside class="rounded-[1.25rem] border border-app-line/70 bg-white/75 p-5 shadow-[0_20px_50px_-34px_rgba(30,26,22,0.35)]">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-app-accent">How ranking works</p>
            <p class="mt-3 text-base leading-7 text-app-text-soft">Vector retrieval finds likely matches first. The app then reranks by topic overlap and lighter current supervision load so tuning stays in code, not in the import workflow.</p>
            <p class="mt-4 text-sm leading-6 text-app-text-soft">Health probe: <a class="font-semibold text-app-accent-strong underline decoration-app-accent/30 underline-offset-4" href="/api/health">/api/health</a></p>
          </aside>
        </section>
        <section class="grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.7fr)]">
          <div class="rounded-[1.25rem] border border-app-line/70 bg-white/75 p-5 shadow-[0_20px_50px_-34px_rgba(30,26,22,0.32)] sm:p-6">
            <label class="block" for="supervisor-query">
              <span class="text-sm font-semibold uppercase tracking-[0.18em] text-app-accent">Topic Search</span>
              <input id="supervisor-query" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="Describe your MSc topic or methods" class="mt-3 w-full rounded-[1rem] border border-app-line bg-white px-4 py-4 text-lg text-app-text outline-none transition placeholder:text-app-text-soft/70 focus:border-app-accent focus:ring-4 focus:ring-app-accent/10">
            </label>
            <p class="mt-3 text-sm leading-6 text-app-text-soft">Try a research domain, methods, or topic description. Results update automatically after a short pause.</p>
            <div id="search-status" class="mt-6 rounded-[1rem] border border-dashed border-app-line/90 bg-app-canvas/70 px-4 py-4 text-sm leading-6 text-app-text-soft">Start typing to see ranked supervisor matches.</div>
            <ol id="search-results" class="mt-5 grid gap-4" aria-live="polite"></ol>
          </div>
          <aside class="rounded-[1.25rem] border border-app-line/70 bg-app-ink px-5 py-6 text-app-ink-text shadow-[0_20px_50px_-34px_rgba(18,35,42,0.45)]">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-app-accent-ghost">Current scope</p>
            <h2 class="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">Confidential source stays offline</h2>
            <p class="mt-4 text-base leading-7 text-app-ink-text/85">The deployed app only searches embeddings and stored supervisor metadata. HTML import happens locally from a confidential snapshot and can be rerun whenever the source page changes.</p>
            <div class="mt-6 rounded-[1rem] border border-white/10 bg-white/6 p-4">
              <p class="text-sm font-semibold uppercase tracking-[0.18em] text-app-accent-ghost">Realtime result cards</p>
              <p class="mt-2 text-sm leading-6 text-app-ink-text/85">Each result shows supervisor name, topic area, and active thesis count so topic fit and availability stay visible together.</p>
            </div>
          </aside>
        </section>
      </article>
    </main>
    <script>
      const queryInput = document.getElementById("supervisor-query");
      const statusElement = document.getElementById("search-status");
      const resultsElement = document.getElementById("search-results");
      const suggestionButtons = Array.from(document.querySelectorAll("[data-suggestion]"));
      let debounceHandle = null;
      let requestCounter = 0;

      function setStatus(message) {
        statusElement.textContent = message;
      }

      function clearResults() {
        while (resultsElement.firstChild) {
          resultsElement.removeChild(resultsElement.firstChild);
        }
      }

      function createChip(label, tone) {
        const span = document.createElement("span");
        span.className = tone === "count"
          ? "rounded-full bg-app-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-app-accent-strong"
          : "rounded-full bg-app-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft";
        span.textContent = label;
        return span;
      }

      function renderResults(results) {
        clearResults();

        for (const result of results) {
          const item = document.createElement("li");
          item.className = "rounded-[1.2rem] border border-app-line/80 bg-white px-4 py-4 shadow-[0_18px_40px_-34px_rgba(30,26,22,0.42)] sm:px-5";

          const topRow = document.createElement("div");
          topRow.className = "flex flex-wrap items-start justify-between gap-3";

          const titleGroup = document.createElement("div");
          titleGroup.className = "space-y-1";

          const title = document.createElement("h3");
          title.className = "text-2xl font-semibold tracking-[-0.03em] text-app-text";
          title.textContent = result.name;

          const topic = document.createElement("p");
          topic.className = "text-base leading-7 text-app-text-soft";
          topic.textContent = result.topicArea;

          titleGroup.append(title, topic);

          const score = document.createElement("div");
          score.className = "rounded-full border border-app-line bg-app-canvas px-3 py-1 text-sm font-semibold text-app-text-soft";
          score.textContent = "Score " + result.score.toFixed(2);

          topRow.append(titleGroup, score);

          const chips = document.createElement("div");
          chips.className = "mt-4 flex flex-wrap gap-2";
          chips.append(
            createChip(result.activeThesisCount + " active theses", "count"),
            createChip("vector " + result.signals.vectorSimilarity.toFixed(2), "signal"),
            createChip("topic " + result.signals.topicOverlap.toFixed(2), "signal"),
            createChip("availability " + result.signals.availability.toFixed(2), "signal"),
          );

          item.append(topRow, chips);
          resultsElement.appendChild(item);
        }
      }

      async function runSearch(rawQuery) {
        const query = rawQuery.trim();

        if (!query) {
          clearResults();
          setStatus("Start typing to see ranked supervisor matches.");
          return;
        }

        const currentRequest = ++requestCounter;
        setStatus("Searching supervisors...");

        try {
          const response = await fetch("/api/search?q=" + encodeURIComponent(query), {
            headers: {
              accept: "application/json",
            },
          });
          const payload = await response.json();

          if (currentRequest !== requestCounter) {
            return;
          }

          if (!response.ok) {
            clearResults();
            setStatus(payload.error || "Search failed.");
            return;
          }

          if (!payload.results.length) {
            clearResults();
            setStatus("No supervisors matched that query yet.");
            return;
          }

          renderResults(payload.results);
          setStatus('Showing ' + payload.results.length + ' supervisors ranked for "' + payload.query + '".');
        } catch (error) {
          clearResults();
          setStatus("Search failed. Try again in a moment.");
        }
      }

      queryInput.addEventListener("input", (event) => {
        const nextValue = event.currentTarget.value;
        window.clearTimeout(debounceHandle);
        debounceHandle = window.setTimeout(() => runSearch(nextValue), 180);
      });

      for (const button of suggestionButtons) {
        button.addEventListener("click", () => {
          const suggestion = button.getAttribute("data-suggestion") || "";
          queryInput.value = suggestion;
          runSearch(suggestion);
          queryInput.focus();
        });
      }
    </script>
  </body>
</html>`;
}

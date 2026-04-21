export function renderHomeScript(): string {
  return `const queryInput = document.getElementById("customer-query");
const audienceControls = document.getElementById("audience-controls");
const audienceInput = document.getElementById("audience-input");
const audienceLabel = document.getElementById("audience-label");
const statusElement = document.getElementById("search-status");
const resultsElement = document.getElementById("search-results");
const scenarioTitleElement = document.getElementById("scenario-title");
const scenarioDescriptionElement = document.getElementById("scenario-description");
const scenarioInsightsElement = document.getElementById("scenario-insights");
const tabButtons = Array.from(document.querySelectorAll("[data-scenario]"));
const searchParamName = "q";
const scenarioParamName = "scenario";
const audienceParamName = "audience";
const minimumQueryLength = 2;
let debounceHandle = null;
let activeController = null;
let requestCounter = 0;
let activeScenario = "baseline";

const scenarios = {
  baseline: {
    title: "Baseline",
    description: "Use only the request text.",
    audienceLabel: "",
    audiencePlaceholder: "",
  },
  "challenge-1": {
    title: "Challenge 1: Hidden Requirements",
    description: "Make the missing preferences explicit.",
    audienceLabel: "Add hidden requirements",
    audiencePlaceholder: "Try: Keep it creamy, cow's milk, and make it much stronger.",
  },
  "challenge-2": {
    title: "Challenge 2: Data Requirements",
    description: "Add product facts or customer context.",
    audienceLabel: "Add extra data",
    audiencePlaceholder: "Try: Wants it with cider, prefers washed rind, and it must be in stock.",
  },
  "challenge-3": {
    title: "Challenge 3: Evaluation Under Uncertainty",
    description: "Turn success criteria into visible checks.",
    audienceLabel: "Add evaluation criteria",
    audiencePlaceholder: "Try: Must be in stock, explain why it fits, and give a backup option.",
  },
};

function setStatus(message) {
  statusElement.textContent = message;
}

function clearResults() {
  while (resultsElement.firstChild) {
    resultsElement.removeChild(resultsElement.firstChild);
  }
}

function clearInsights() {
  while (scenarioInsightsElement.firstChild) {
    scenarioInsightsElement.removeChild(scenarioInsightsElement.firstChild);
  }
}

function syncUrlState(rawQuery, rawAudience, scenario) {
  const url = new URL(window.location.href);
  const query = rawQuery.trim();
  const audience = rawAudience.trim();

  if (query) {
    url.searchParams.set(searchParamName, query);
  } else {
    url.searchParams.delete(searchParamName);
  }

  if (scenario && scenario !== "baseline") {
    url.searchParams.set(scenarioParamName, scenario);
  } else {
    url.searchParams.delete(scenarioParamName);
  }

  if (audience) {
    url.searchParams.set(audienceParamName, audience);
  } else {
    url.searchParams.delete(audienceParamName);
  }

  window.history.replaceState(window.history.state, "", url);
}

function renderInsights(insights) {
  clearInsights();

  for (const insight of insights) {
    const item = document.createElement("li");
    item.className = "rounded-[1.1rem] border border-app-line bg-white px-4 py-3";
    item.textContent = insight;
    scenarioInsightsElement.appendChild(item);
  }
}

function renderResults(results, scenario) {
  clearResults();

  for (const result of results) {
    const item = document.createElement("li");
    item.className = "rounded-[1.4rem] border border-app-line bg-app-canvas px-4 py-4 sm:px-5 sm:py-5";

    const meta = document.createElement("p");
    meta.className = "text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary";
    meta.textContent = result.meta;

    const title = document.createElement("h3");
    title.className = "mt-3 font-display text-[1.8rem] leading-[0.96] text-app-primary sm:text-[2.25rem]";
    title.textContent = result.name;

    const blurb = document.createElement("p");
    blurb.className = "mt-3 max-w-3xl text-base leading-7 text-app-text-soft";
    blurb.textContent = result.blurb;

    const reason = document.createElement("p");
    reason.className = "mt-4 text-sm leading-6 text-app-text";
    reason.textContent = result.reason;

    const matchedSignals = document.createElement("ul");
    matchedSignals.className = "mt-4 flex flex-wrap gap-2";
    for (const signal of result.matchedSignals) {
      const chip = document.createElement("li");
      chip.className = "rounded-full bg-app-secondary/8 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-app-secondary uppercase";
      chip.textContent = signal;
      matchedSignals.appendChild(chip);
    }

    item.append(meta, title, blurb, reason, matchedSignals);

    if (scenario === "challenge-3" && Array.isArray(result.checks) && result.checks.length > 0) {
      const checksList = document.createElement("ul");
      checksList.className = "mt-4 grid gap-2";

      for (const check of result.checks) {
        const checkItem = document.createElement("li");
        checkItem.className =
          "flex items-start justify-between gap-3 rounded-[1rem] border px-3 py-3 text-sm leading-6 " +
          (check.passed
            ? "border-app-primary/18 bg-app-primary/5 text-app-text"
            : "border-app-secondary/18 bg-app-secondary/6 text-app-text");
        const label = document.createElement("span");
        label.textContent = check.label;
        const note = document.createElement("span");
        note.className = "text-app-text-soft";
        note.textContent = check.note;
        checkItem.append(label, note);
        checksList.appendChild(checkItem);
      }

      item.appendChild(checksList);
    }

    resultsElement.appendChild(item);
  }
}

function applyScenario(nextScenario) {
  activeScenario = nextScenario;
  const copy = scenarios[nextScenario];
  scenarioTitleElement.textContent = copy.title;
  scenarioDescriptionElement.textContent = copy.description;
  audienceLabel.textContent = copy.audienceLabel;
  audienceInput.placeholder = copy.audiencePlaceholder;
  audienceControls.classList.toggle("hidden", nextScenario === "baseline");

  for (const button of tabButtons) {
    const isActive = button.dataset.scenario === nextScenario;
    button.setAttribute("aria-selected", String(isActive));
    button.classList.toggle("demo-tab-active", isActive);
  }
}

async function runSearch(rawQuery, rawAudience) {
  const query = rawQuery.trim();
  const audience = rawAudience.trim();

  if (!query) {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    clearResults();
    clearInsights();
    setStatus("");
    return;
  }

  if (query.length < minimumQueryLength) {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    clearResults();
    clearInsights();
    setStatus("Type at least " + minimumQueryLength + " characters.");
    return;
  }

  const currentRequest = ++requestCounter;
  if (activeController) {
    activeController.abort();
  }
  activeController = new AbortController();
  const currentController = activeController;
  setStatus("Searching...");

  try {
    const response = await fetch(
      "/api/search?q=" +
        encodeURIComponent(query) +
        "&scenario=" +
        encodeURIComponent(activeScenario) +
        "&audience=" +
        encodeURIComponent(audience),
      {
        headers: {
          accept: "application/json",
        },
        signal: currentController.signal,
      },
    );
    const payload = await response.json();

    if (currentRequest !== requestCounter || currentController !== activeController) {
      return;
    }

    if (!response.ok) {
      clearResults();
      clearInsights();
      setStatus(payload.error || "Search failed.");
      return;
    }

    if (!payload.results.length) {
      clearResults();
      clearInsights();
      setStatus("No cheeses matched that combination.");
      return;
    }

    renderResults(payload.results, payload.scenario);
    renderInsights(payload.insights || []);
    setStatus(payload.results.length + (payload.results.length === 1 ? " result" : " results"));
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
      return;
    }

    clearResults();
    clearInsights();
    setStatus("Search failed. Try again.");
  } finally {
    if (currentController === activeController) {
      activeController = null;
    }
  }
}

function scheduleSearch() {
  window.clearTimeout(debounceHandle);
  debounceHandle = window.setTimeout(() => runSearch(queryInput.value, audienceInput.value), 180);
}

queryInput.addEventListener("input", () => {
  syncUrlState(queryInput.value, audienceInput.value, activeScenario);
  scheduleSearch();
});

audienceInput.addEventListener("input", () => {
  syncUrlState(queryInput.value, audienceInput.value, activeScenario);
  scheduleSearch();
});

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    applyScenario(button.dataset.scenario || "baseline");
    syncUrlState(queryInput.value, audienceInput.value, activeScenario);
    scheduleSearch();
  });
}

const initialUrl = new URL(window.location.href);
const initialScenario = scenarios[initialUrl.searchParams.get(scenarioParamName)] ? initialUrl.searchParams.get(scenarioParamName) : "baseline";
const initialQuery = initialUrl.searchParams.get(searchParamName) || "";
const initialAudience = initialUrl.searchParams.get(audienceParamName) || "";

applyScenario(initialScenario);
if (initialQuery) {
  queryInput.value = initialQuery;
}
if (initialAudience) {
  audienceInput.value = initialAudience;
}
if (initialQuery) {
  runSearch(initialQuery, initialAudience);
} else {
  renderInsights(["Enter a vague request. Then switch tabs to tighten the logic."]);
}
`;
}

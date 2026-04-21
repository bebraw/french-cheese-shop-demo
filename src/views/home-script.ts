export function renderHomeScript(): string {
  return `const queryInput = document.getElementById("customer-query");
const audienceControls = document.getElementById("audience-controls");
const audiencePromptElement = document.getElementById("audience-prompt");
const audiencePresetsElement = document.getElementById("audience-presets");
const audienceCustomInput = document.getElementById("audience-custom-input");
const audienceLabel = document.getElementById("audience-label");
const audienceSummaryLabelElement = document.getElementById("audience-summary-label");
const audienceSummaryEmptyElement = document.getElementById("audience-summary-empty");
const audienceSummaryChipsElement = document.getElementById("audience-summary-chips");
const statusElement = document.getElementById("search-status");
const resultsElement = document.getElementById("search-results");
const scenarioTitleElement = document.getElementById("scenario-title");
const scenarioDescriptionElement = document.getElementById("scenario-description");
const scenarioInsightsElement = document.getElementById("scenario-insights");
const scenarioButtons = Array.from(document.querySelectorAll("[data-scenario]"));
const searchParamName = "q";
const scenarioParamName = "scenario";
const audienceParamName = "audience";
const minimumQueryLength = 2;
const defaultQuery = "I want something like Brie, but stronger.";
let debounceHandle = null;
let activeController = null;
let requestCounter = 0;
let activeScenario = "baseline";

const scenarios = {
  baseline: {
    title: "Baseline",
    description: "Use only the request text and show the first plausible answer.",
    audienceLabel: "",
    audiencePlaceholder: "",
    audiencePrompt: "",
    audienceSummaryLabel: "",
    presets: [],
  },
  "challenge-1": {
    title: "Challenge 1: Hidden Requirements",
    description: "Turn fuzzy preferences into explicit requirements.",
    audienceLabel: "Other hidden requirement",
    audiencePlaceholder: "Add a custom hidden requirement if the audience says something else.",
    audiencePrompt: "What did the audience clarify?",
    audienceSummaryLabel: "Audience answer",
    presets: [
      { id: "creamy", label: "Keep it creamy", value: "keep it creamy" },
      { id: "cow", label: "Cow's milk", value: "cow's milk" },
      { id: "stronger", label: "Much stronger", value: "much stronger" },
      { id: "washed-rind", label: "Washed rind", value: "washed rind" },
    ],
  },
  "challenge-2": {
    title: "Challenge 2: Data Requirements",
    description: "Add the product facts or customer context the model needs.",
    audienceLabel: "Other missing data",
    audiencePlaceholder: "Add another fact or context cue from the audience.",
    audiencePrompt: "What extra data should the system use?",
    audienceSummaryLabel: "Audience answer",
    presets: [
      { id: "cider", label: "With cider", value: "with cider" },
      { id: "washed-rind", label: "Washed rind", value: "prefers washed rind" },
      { id: "stock", label: "In stock", value: "it must be in stock" },
      { id: "budget", label: "Budget", value: "under EUR 12" },
      { id: "salad", label: "For salad", value: "for salad" },
    ],
  },
  "challenge-3": {
    title: "Challenge 3: Evaluation Under Uncertainty",
    description: "Make success criteria visible so the answer can be judged.",
    audienceLabel: "Other evaluation criterion",
    audiencePlaceholder: "Add another way the audience wants to judge the answer.",
    audiencePrompt: "How should the answer be judged?",
    audienceSummaryLabel: "Evaluation criteria",
    presets: [
      { id: "explain", label: "Explain why", value: "explain why it fits" },
      { id: "backup", label: "Backup option", value: "give a backup option" },
      { id: "stock", label: "In stock", value: "it must be in stock" },
      { id: "shortlist", label: "Shortlist", value: "give a shortlist" },
    ],
  },
};

const audienceState = {
  "challenge-1": { selectedPresetIds: [], customText: "" },
  "challenge-2": { selectedPresetIds: [], customText: "" },
  "challenge-3": { selectedPresetIds: [], customText: "" },
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

function clearAudiencePresets() {
  while (audiencePresetsElement.firstChild) {
    audiencePresetsElement.removeChild(audiencePresetsElement.firstChild);
  }
}

function clearAudienceSummary() {
  while (audienceSummaryChipsElement.firstChild) {
    audienceSummaryChipsElement.removeChild(audienceSummaryChipsElement.firstChild);
  }
}

function getAudienceState(scenario) {
  return audienceState[scenario];
}

function getSelectedPresetValues(scenario) {
  const copy = scenarios[scenario];
  const state = getAudienceState(scenario);

  if (!copy || !state) {
    return [];
  }

  return copy.presets.filter((preset) => state.selectedPresetIds.includes(preset.id));
}

function buildAudienceInput(scenario) {
  if (scenario === "baseline") {
    return "";
  }

  const state = getAudienceState(scenario);
  const parts = getSelectedPresetValues(scenario).map((preset) => preset.value);
  const customText = state.customText.trim();

  if (customText) {
    parts.push(customText);
  }

  return parts.join(". ");
}

function syncUrlState(rawQuery, scenario) {
  const url = new URL(window.location.href);
  const query = rawQuery.trim();
  const audience = buildAudienceInput(scenario);

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

function renderAudienceSummary(scenario) {
  clearAudienceSummary();

  if (scenario === "baseline") {
    audienceSummaryEmptyElement.textContent = "";
    return;
  }

  const state = getAudienceState(scenario);
  const summaryItems = getSelectedPresetValues(scenario).map((preset) => preset.label);

  if (state.customText.trim()) {
    summaryItems.push(state.customText.trim());
  }

  const hasItems = summaryItems.length > 0;
  audienceSummaryEmptyElement.textContent = hasItems ? "" : "Choose one or more answers below.";

  for (const itemText of summaryItems) {
    const item = document.createElement("li");
    item.className = "audience-summary-chip";
    item.textContent = itemText;
    audienceSummaryChipsElement.appendChild(item);
  }
}

function renderAudiencePresets(scenario) {
  clearAudiencePresets();

  if (scenario === "baseline") {
    return;
  }

  const state = getAudienceState(scenario);

  for (const preset of scenarios[scenario].presets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "audience-preset";
    button.textContent = preset.label;
    const isActive = state.selectedPresetIds.includes(preset.id);
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("audience-preset-active", isActive);
    button.addEventListener("click", () => {
      const nextSelectedPresetIds = state.selectedPresetIds.includes(preset.id)
        ? state.selectedPresetIds.filter((id) => id !== preset.id)
        : [...state.selectedPresetIds, preset.id];
      state.selectedPresetIds = nextSelectedPresetIds;
      renderAudiencePresets(activeScenario);
      renderAudienceSummary(activeScenario);
      syncUrlState(queryInput.value, activeScenario);
      scheduleSearch();
    });
    audiencePresetsElement.appendChild(button);
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
  audienceControls.classList.toggle("hidden", nextScenario === "baseline");
  audiencePromptElement.textContent = copy.audiencePrompt;
  audienceSummaryLabelElement.textContent = copy.audienceSummaryLabel;
  audienceLabel.textContent = copy.audienceLabel;
  audienceCustomInput.placeholder = copy.audiencePlaceholder;

  for (const button of scenarioButtons) {
    const isActive = button.dataset.scenario === nextScenario;
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("scenario-guide-item-active", isActive);
  }

  if (nextScenario !== "baseline") {
    audienceCustomInput.value = getAudienceState(nextScenario).customText;
  }

  renderAudiencePresets(nextScenario);
  renderAudienceSummary(nextScenario);
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
  debounceHandle = window.setTimeout(() => runSearch(queryInput.value, buildAudienceInput(activeScenario)), 180);
}

queryInput.addEventListener("input", () => {
  syncUrlState(queryInput.value, activeScenario);
  scheduleSearch();
});

audienceCustomInput.addEventListener("input", () => {
  if (activeScenario === "baseline") {
    return;
  }

  getAudienceState(activeScenario).customText = audienceCustomInput.value;
  renderAudienceSummary(activeScenario);
  syncUrlState(queryInput.value, activeScenario);
  scheduleSearch();
});

for (const button of scenarioButtons) {
  button.addEventListener("click", () => {
    applyScenario(button.dataset.scenario || "baseline");
    syncUrlState(queryInput.value, activeScenario);
    scheduleSearch();
  });
}

const initialUrl = new URL(window.location.href);
const initialScenario = scenarios[initialUrl.searchParams.get(scenarioParamName)] ? initialUrl.searchParams.get(scenarioParamName) : "baseline";
const initialQuery = initialUrl.searchParams.get(searchParamName) || defaultQuery;
const initialAudience = initialUrl.searchParams.get(audienceParamName) || "";

applyScenario(initialScenario);
if (initialQuery) {
  queryInput.value = initialQuery;
}
if (initialAudience && initialScenario !== "baseline") {
  getAudienceState(initialScenario).customText = initialAudience;
  audienceCustomInput.value = initialAudience;
  renderAudienceSummary(initialScenario);
}
runSearch(initialQuery, initialAudience);
`;
}

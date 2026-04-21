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
const insightsLabelElement = document.getElementById("insights-label");
const scenarioInsightsElement = document.getElementById("scenario-insights");
const scenarioButtons = Array.from(document.querySelectorAll("[data-scenario]"));
const searchParamName = "q";
const scenarioParamName = "scenario";
const audienceParamName = "audience";
const minimumQueryLength = 2;
const defaultQuery = "I want something like Brie, but stronger.";
const challengeSequence = ["challenge-1", "challenge-2", "challenge-3"];
let debounceHandle = null;
let activeController = null;
let requestCounter = 0;
let activeScenario = "baseline";
const expandedResultIds = new Set();

const scenarios = {
  baseline: {
    title: "Baseline",
    description: "Start with the request wording alone.",
    insightLabel: "Signals in play",
    audienceLabel: "",
    audiencePlaceholder: "",
    audiencePrompt: "",
    audienceSummaryLabel: "",
    audienceSummaryEmptyText: "",
    presets: [],
  },
  "challenge-1": {
    title: "Challenge 1: Hidden Needs",
    description: "Clarify what the customer really means.",
    insightLabel: "Explicit requirements",
    audienceLabel: "Other hidden need",
    audiencePlaceholder: "Add another hidden preference.",
    audiencePrompt: "What hidden need became explicit?",
    audienceSummaryLabel: "Clarified needs",
    audienceSummaryEmptyText: "Select the newly clarified needs.",
    presets: [
      { id: "creamy", label: "Keep it creamy", value: "keep it creamy" },
      { id: "cow", label: "Cow's milk", value: "cow's milk" },
      { id: "stronger", label: "Much stronger", value: "much stronger" },
      { id: "oozy", label: "Oozy center", value: "oozy center" },
    ],
  },
  "challenge-2": {
    title: "Challenge 2: Data Requirements",
    description: "Add facts and constraints the first pass did not know.",
    insightLabel: "Extra data in play",
    audienceLabel: "Other fact or constraint",
    audiencePlaceholder: "Add another fact or constraint.",
    audiencePrompt: "What new fact or constraint do we know?",
    audienceSummaryLabel: "Known facts",
    audienceSummaryEmptyText: "Select the extra facts that should influence ranking.",
    presets: [
      { id: "cider", label: "With cider", value: "with cider" },
      { id: "washed-rind", label: "Washed rind", value: "prefers washed rind" },
      { id: "stock", label: "In stock", value: "it must be in stock" },
      { id: "budget", label: "Budget", value: "under EUR 12" },
      { id: "salad", label: "For salad", value: "for salad" },
    ],
  },
  "challenge-3": {
    title: "Challenge 3: Evaluation",
    description: "Choose what the results should visibly prove to the audience.",
    insightLabel: "Evaluation checks",
    audienceLabel: "Other evaluation criterion",
    audiencePlaceholder: "Add another success criterion.",
    audiencePrompt: "What should the results visibly show?",
    audienceSummaryLabel: "Evaluation criteria",
    audienceSummaryEmptyText: "Select the checks the final answer must satisfy.",
    presets: [
      { id: "explain", label: "Show why it fits", value: "show why it fits" },
      { id: "backup", label: "Mark a backup", value: "mark a backup choice" },
      { id: "shortlist", label: "Two finalists", value: "keep it to two finalists" },
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

function getScenarioTrail(scenario) {
  if (scenario === "baseline") {
    return [];
  }

  const scenarioIndex = challengeSequence.indexOf(scenario);
  return scenarioIndex >= 0 ? challengeSequence.slice(0, scenarioIndex + 1) : [];
}

function getSelectedPresetValues(scenario) {
  const copy = scenarios[scenario];
  const state = getAudienceState(scenario);

  if (!copy || !state) {
    return [];
  }

  return copy.presets.filter((preset) => state.selectedPresetIds.includes(preset.id));
}

function buildAccumulatedAudienceParts(scenario, valueSelector) {
  const parts = [];
  const seen = new Set();

  for (const scenarioId of getScenarioTrail(scenario)) {
    const state = getAudienceState(scenarioId);
    const presetValues = getSelectedPresetValues(scenarioId).map((preset) => valueSelector(preset));
    const customText = state.customText.trim();

    for (const part of [...presetValues, customText]) {
      if (!part || seen.has(part)) {
        continue;
      }

      seen.add(part);
      parts.push(part);
    }
  }

  return parts;
}

function buildAudienceInput(scenario) {
  return buildAccumulatedAudienceParts(scenario, (preset) => preset.value).join(". ");
}

function buildAudienceSummaryItems(scenario) {
  return buildAccumulatedAudienceParts(scenario, (preset) => preset.label);
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

  const summaryItems = buildAudienceSummaryItems(scenario);
  const summaryEmptyText = scenarios[scenario].audienceSummaryEmptyText;

  const hasItems = summaryItems.length > 0;
  audienceSummaryEmptyElement.textContent = hasItems ? "" : summaryEmptyText;

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
    item.className = "rounded-[1.35rem] border border-app-line bg-app-canvas px-4 py-4 sm:px-5";

    const meta = document.createElement("p");
    meta.className = "text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-secondary";
    meta.textContent = result.meta;

    const summaryRow = document.createElement("div");
    summaryRow.className = "mt-3 flex items-start justify-between gap-4";

    const headingGroup = document.createElement("div");
    headingGroup.className = "min-w-0";

    const title = document.createElement("h3");
    title.className = "font-display text-[1.45rem] leading-[0.94] text-app-primary sm:text-[1.7rem]";
    title.textContent = result.name;

    let tag = null;
    if (result.presentationTag) {
      tag = document.createElement("p");
      tag.className =
        "mt-2 inline-flex rounded-full bg-app-primary/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-primary";
      tag.textContent = result.presentationTag;
    }

    const expandButton = document.createElement("button");
    expandButton.type = "button";
    expandButton.className =
      "shrink-0 rounded-full border border-app-line bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-secondary transition hover:border-app-secondary/30 hover:text-app-secondary";
    expandButton.textContent = "More";

    const blurb = document.createElement("p");
    blurb.className = "text-sm leading-6 text-app-text-soft";
    blurb.textContent = result.blurb;

    const reason = document.createElement("p");
    reason.className = "text-sm leading-6 text-app-text";
    reason.textContent = result.reason;

    const explanation = document.createElement("p");
    explanation.className = "text-sm leading-6 text-app-text";
    explanation.hidden = !result.explanation;
    explanation.textContent = result.explanation ? "Why it fits: " + result.explanation : "";

    const matchedSignals = document.createElement("ul");
    matchedSignals.className = "flex flex-wrap gap-2";
    for (const signal of result.matchedSignals) {
      const chip = document.createElement("li");
      chip.className = "rounded-full bg-app-secondary/8 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-app-secondary uppercase";
      chip.textContent = signal;
      matchedSignals.appendChild(chip);
    }

    const details = document.createElement("div");
    details.className = "mt-4 grid gap-4";
    const isExpanded = expandedResultIds.has(result.cheeseId);
    details.hidden = !isExpanded;

    headingGroup.append(title);
    if (tag) {
      headingGroup.append(tag);
    }
    summaryRow.append(headingGroup, expandButton);
    details.append(blurb, reason, explanation, matchedSignals);
    item.append(meta, summaryRow, details);

    if (scenario === "challenge-3" && Array.isArray(result.checks) && result.checks.length > 0) {
      const checksList = document.createElement("ul");
      checksList.className = "grid gap-2";

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

      details.appendChild(checksList);
    }

    expandButton.setAttribute("aria-expanded", String(isExpanded));
    expandButton.textContent = isExpanded ? "Hide" : "More";
    expandButton.addEventListener("click", () => {
      const isOpen = !details.hidden;
      details.hidden = isOpen;
      expandButton.setAttribute("aria-expanded", String(!isOpen));
      expandButton.textContent = isOpen ? "More" : "Hide";

      if (isOpen) {
        expandedResultIds.delete(result.cheeseId);
      } else {
        expandedResultIds.add(result.cheeseId);
      }
    });

    resultsElement.appendChild(item);
  }
}

function applyScenario(nextScenario) {
  activeScenario = nextScenario;
  const copy = scenarios[nextScenario];
  scenarioTitleElement.textContent = copy.title;
  scenarioDescriptionElement.textContent = copy.description;
  insightsLabelElement.textContent = copy.insightLabel;
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
    insightsLabelElement.textContent = payload.promptLabel || scenarios[payload.scenario].insightLabel;
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

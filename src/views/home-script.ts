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
const contextToggle = document.getElementById("context-toggle");
const contextToggleLabel = document.getElementById("context-toggle-label");
const contextPanel = document.getElementById("context-panel");
const seasonControlsElement = document.getElementById("season-controls");
const shopStateControlsElement = document.getElementById("shop-state-controls");
const contextSummaryEmptyElement = document.getElementById("context-summary-empty");
const contextSummaryChipsElement = document.getElementById("context-summary-chips");
const backendToggle = document.getElementById("backend-toggle");
const backendToggleLabel = document.getElementById("backend-toggle-label");
const backendPanel = document.getElementById("backend-panel");
const backendControlsElement = document.getElementById("backend-controls");
const backendSummaryChipsElement = document.getElementById("backend-summary-chips");
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
const seasonParamName = "season";
const shopStateParamName = "shopState";
const backendParamName = "backend";
const minimumQueryLength = 2;
const defaultQuery = "I want something like Brie, but stronger.";
const challengeSequence = ["challenge-1", "challenge-2", "challenge-3"];
let debounceHandle = null;
let activeController = null;
let requestCounter = 0;
let activeScenario = "baseline";
const expandedResultIds = new Set();
let contextPanelOpen = false;
let backendPanelOpen = false;
const seasonOptions = [
  { id: "spring", label: "Spring menu" },
  { id: "summer", label: "Summer picnic" },
  { id: "autumn", label: "Autumn board" },
  { id: "winter", label: "Winter holiday" },
];
const shopStateOptions = [
  { id: "normal", label: "Normal service" },
  { id: "holiday-rush", label: "Holiday rush" },
];
const backendOptions = [
  { id: "rules", label: "Deterministic rules" },
  { id: "llm", label: "LLM backend" },
];

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
const contextState = {
  season: "",
  shopState: "",
};
const backendState = {
  mode: "rules",
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

function clearSeasonControls() {
  while (seasonControlsElement.firstChild) {
    seasonControlsElement.removeChild(seasonControlsElement.firstChild);
  }
}

function clearShopStateControls() {
  while (shopStateControlsElement.firstChild) {
    shopStateControlsElement.removeChild(shopStateControlsElement.firstChild);
  }
}

function clearContextSummary() {
  while (contextSummaryChipsElement.firstChild) {
    contextSummaryChipsElement.removeChild(contextSummaryChipsElement.firstChild);
  }
}

function clearBackendControls() {
  while (backendControlsElement.firstChild) {
    backendControlsElement.removeChild(backendControlsElement.firstChild);
  }
}

function clearBackendSummary() {
  while (backendSummaryChipsElement.firstChild) {
    backendSummaryChipsElement.removeChild(backendSummaryChipsElement.firstChild);
  }
}

function getAudienceState(scenario) {
  return audienceState[scenario];
}

function getScenarioTrail(scenario) {
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

function getContextSummaryItems(scenario) {
  const items = [];
  const season = seasonOptions.find((option) => option.id === contextState.season);
  const shopState = shopStateOptions.find((option) => option.id === contextState.shopState);

  if (season) {
    items.push(season.label);
  }
  if (shopState) {
    items.push(shopState.label);
  }

  return items;
}

function readContextQuery(scenario) {
  return {
    season: contextState.season,
    shopState: contextState.shopState,
  };
}

function readBackendQuery() {
  return backendState.mode;
}

function syncUrlState(rawQuery, scenario) {
  const url = new URL(window.location.href);
  const query = rawQuery.trim();
  const audience = buildAudienceInput(scenario);
  const context = readContextQuery(scenario);

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

  if (context.season) {
    url.searchParams.set(seasonParamName, context.season);
  } else {
    url.searchParams.delete(seasonParamName);
  }

  if (context.shopState) {
    url.searchParams.set(shopStateParamName, context.shopState);
  } else {
    url.searchParams.delete(shopStateParamName);
  }

  if (readBackendQuery() !== "rules") {
    url.searchParams.set(backendParamName, readBackendQuery());
  } else {
    url.searchParams.delete(backendParamName);
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

function renderContextSummary(scenario) {
  clearContextSummary();

  const summaryItems = getContextSummaryItems(scenario);
  const hasItems = summaryItems.length > 0;
  contextSummaryEmptyElement.textContent = hasItems ? "" : "No world context applied.";

  for (const itemText of summaryItems) {
    const item = document.createElement("li");
    item.className = "audience-summary-chip";
    item.textContent = itemText;
    contextSummaryChipsElement.appendChild(item);
  }
}

function renderBackendSummary() {
  clearBackendSummary();

  const selectedBackend = backendOptions.find((option) => option.id === backendState.mode) || backendOptions[0];
  const backendChip = document.createElement("li");
  backendChip.className = "audience-summary-chip";
  backendChip.textContent = selectedBackend.label;
  backendSummaryChipsElement.appendChild(backendChip);

  if (selectedBackend.id === "llm") {
    const detailChip = document.createElement("li");
    detailChip.className = "audience-summary-chip";
    detailChip.textContent = "Local contrast mode";
    backendSummaryChipsElement.appendChild(detailChip);
  }
}

function renderToggleGroup(options, selectedId, container, onSelect) {
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "audience-preset";
    button.textContent = option.label;
    const isActive = selectedId === option.id;
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("audience-preset-active", isActive);
    button.addEventListener("click", () => {
      onSelect(isActive ? "" : option.id);
    });
    container.appendChild(button);
  }
}

function renderBackendControls() {
  clearBackendControls();
  renderToggleGroup(backendOptions, backendState.mode, backendControlsElement, (nextBackend) => {
    backendState.mode = nextBackend || "rules";
    renderBackendControls();
    renderBackendSummary();
    syncUrlState(queryInput.value, activeScenario);
    scheduleSearch();
  });
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

function renderContextControls(scenario) {
  clearSeasonControls();
  clearShopStateControls();

  renderToggleGroup(seasonOptions, contextState.season, seasonControlsElement, (nextSeason) => {
    contextState.season = nextSeason;
    renderContextControls(activeScenario);
    renderContextSummary(activeScenario);
    syncUrlState(queryInput.value, activeScenario);
    scheduleSearch();
  });

  renderToggleGroup(shopStateOptions, contextState.shopState, shopStateControlsElement, (nextShopState) => {
    contextState.shopState = nextShopState;
    renderContextControls(activeScenario);
    renderContextSummary(activeScenario);
    syncUrlState(queryInput.value, activeScenario);
    scheduleSearch();
  });
}

function renderBackendPanel() {
  backendPanel.hidden = !backendPanelOpen;
  backendToggle.setAttribute("aria-expanded", String(backendPanelOpen));
  backendToggleLabel.textContent = backendPanelOpen ? "Hide" : "Show";
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
  renderContextControls(nextScenario);
  renderContextSummary(nextScenario);
  renderBackendControls();
  renderBackendSummary();
}

function renderContextPanel() {
  contextPanel.hidden = !contextPanelOpen;
  contextToggle.setAttribute("aria-expanded", String(contextPanelOpen));
  contextToggleLabel.textContent = contextPanelOpen ? "Hide" : "Show";
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
        encodeURIComponent(audience) +
        "&season=" +
        encodeURIComponent(readContextQuery(activeScenario).season) +
        "&shopState=" +
        encodeURIComponent(readContextQuery(activeScenario).shopState) +
        "&backend=" +
        encodeURIComponent(readBackendQuery()),
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

contextToggle.addEventListener("click", () => {
  contextPanelOpen = !contextPanelOpen;
  renderContextPanel();
});

backendToggle.addEventListener("click", () => {
  backendPanelOpen = !backendPanelOpen;
  renderBackendPanel();
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
const initialSeason = initialUrl.searchParams.get(seasonParamName) || "";
const initialShopState = initialUrl.searchParams.get(shopStateParamName) || "";
const initialBackend = initialUrl.searchParams.get(backendParamName) || "rules";

applyScenario(initialScenario);
if (initialQuery) {
  queryInput.value = initialQuery;
}
if (seasonOptions.some((option) => option.id === initialSeason)) {
  contextState.season = initialSeason;
}
if (shopStateOptions.some((option) => option.id === initialShopState)) {
  contextState.shopState = initialShopState;
}
if (backendOptions.some((option) => option.id === initialBackend)) {
  backendState.mode = initialBackend;
}
contextPanelOpen = Boolean(contextState.season || contextState.shopState);
backendPanelOpen = backendState.mode !== "rules";
if (initialAudience && initialScenario !== "baseline") {
  getAudienceState(initialScenario).customText = initialAudience;
  audienceCustomInput.value = initialAudience;
  renderAudienceSummary(initialScenario);
}
renderContextPanel();
renderContextControls(initialScenario);
renderContextSummary(initialScenario);
renderBackendPanel();
renderBackendControls();
renderBackendSummary();
runSearch(initialQuery, initialAudience);
`;
}

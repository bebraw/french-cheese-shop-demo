import { MINIMUM_QUERY_LENGTH } from "../cheese/demo";
import {
  DEFAULT_QUERY,
  DEFAULT_ROOM_ID,
  backendOptions,
  challengeSequence,
  scenarioCopy,
  seasonOptions,
  shopStateOptions,
} from "../demo-config";

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
const contextDrawerToggle = document.getElementById("context-drawer-toggle");
const contextDrawerIcon = document.getElementById("context-drawer-icon");
const contextDrawerPanel = document.getElementById("context-drawer-panel");
const seasonControlsElement = document.getElementById("season-controls");
const shopStateControlsElement = document.getElementById("shop-state-controls");
const contextSummaryEmptyElement = document.getElementById("context-summary-empty");
const contextSummaryChipsElement = document.getElementById("context-summary-chips");
const backendControlsElement = document.getElementById("backend-controls");
const statusElement = document.getElementById("search-status");
const resultsElement = document.getElementById("search-results");
const scenarioTitleElement = document.getElementById("scenario-title");
const scenarioDescriptionElement = document.getElementById("scenario-description");
const insightsLabelElement = document.getElementById("insights-label");
const scenarioInsightsElement = document.getElementById("scenario-insights");
const scenarioButtons = Array.from(document.querySelectorAll("[data-scenario]"));
const roomIdInput = document.getElementById("room-id-input");
const roomPanelToggle = document.getElementById("room-panel-toggle");
const roomPanelIcon = document.getElementById("room-panel-icon");
const roomPanelBody = document.getElementById("room-panel-body");
const roomJoinButton = document.getElementById("room-join-button");
const roomCopyLinkButton = document.getElementById("room-copy-link-button");
const roomResetButton = document.getElementById("room-reset-button");
const roomConnectionStatusElement = document.getElementById("room-connection-status");
const roomParticipantCountElement = document.getElementById("room-participant-count");
const minimumQueryLength = ${JSON.stringify(MINIMUM_QUERY_LENGTH)};
const defaultQuery = ${JSON.stringify(DEFAULT_QUERY)};
const defaultRoomId = ${JSON.stringify(DEFAULT_ROOM_ID)};
const challengeSequence = ${JSON.stringify(challengeSequence)};
const scenarios = ${JSON.stringify(scenarioCopy)};
const seasonOptions = ${JSON.stringify(seasonOptions)};
const shopStateOptions = ${JSON.stringify(shopStateOptions)};
const backendOptions = ${JSON.stringify(backendOptions)};
const expandedResultIds = new Set();
let activeRoomId = defaultRoomId;
let activeScenario = "baseline";
let activeSnapshot = null;
let contextDrawerOpen = false;
let roomPanelOpen = true;
let liveSocket = null;
let reconnectHandle = null;
let pollHandle = null;
let querySyncHandle = null;
let audienceSyncHandle = null;
let pendingQueryDraft = null;
let pendingAudienceDraft = null;

function createFallbackSnapshot(roomId) {
  return {
    roomId,
    participantCount: 1,
    state: {
      roomId,
      version: 1,
      query: defaultQuery,
      activeScenario: "baseline",
      audienceByChallenge: {
        "challenge-1": { selectedPresetIds: [], customText: "" },
        "challenge-2": { selectedPresetIds: [], customText: "" },
        "challenge-3": { selectedPresetIds: [], customText: "" },
      },
      season: "",
      shopState: "",
      backend: "rules",
      updatedAt: "",
    },
    search: null,
  };
}

function getRoomState() {
  return activeSnapshot ? activeSnapshot.state : createFallbackSnapshot(activeRoomId).state;
}

function getAudienceState(scenario) {
  return getRoomState().audienceByChallenge[scenario];
}

function sanitizeRoomId(rawRoomId) {
  const normalized = String(rawRoomId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length >= 3 ? normalized.slice(0, 32) : defaultRoomId;
}

function setConnectionStatus(message) {
  roomConnectionStatusElement.textContent = message;
}

function setRoomParticipantCount(participantCount) {
  roomParticipantCountElement.textContent = participantCount + " participant" + (participantCount === 1 ? "" : "s");
}

function setStatus(message) {
  statusElement.textContent = message;
}

function clearChildren(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function clearResults() {
  clearChildren(resultsElement);
}

function clearInsights() {
  clearChildren(scenarioInsightsElement);
}

function clearAudienceSummary() {
  clearChildren(audienceSummaryChipsElement);
}

function clearContextSummary() {
  clearChildren(contextSummaryChipsElement);
}

function clearAudiencePresets() {
  clearChildren(audiencePresetsElement);
}

function clearSeasonControls() {
  clearChildren(seasonControlsElement);
}

function clearShopStateControls() {
  clearChildren(shopStateControlsElement);
}

function clearBackendControls() {
  clearChildren(backendControlsElement);
}

function getScenarioTrail(scenario) {
  const scenarioIndex = challengeSequence.indexOf(scenario);
  return scenarioIndex >= 0 ? challengeSequence.slice(0, scenarioIndex + 1) : [];
}

function buildAccumulatedAudienceParts(scenario, valueSelector) {
  const parts = [];
  const seen = new Set();

  for (const scenarioId of getScenarioTrail(scenario)) {
    const audienceState = getAudienceState(scenarioId);
    const selectedPresets = scenarios[scenarioId].presets.filter((preset) => audienceState.selectedPresetIds.includes(preset.id));

    for (const part of [...selectedPresets.map((preset) => valueSelector(preset)), audienceState.customText.trim()]) {
      if (!part || seen.has(part)) {
        continue;
      }

      seen.add(part);
      parts.push(part);
    }
  }

  return parts;
}

function buildAudienceSummaryItems(scenario) {
  return buildAccumulatedAudienceParts(scenario, (preset) => preset.label);
}

function buildContextSummaryItems() {
  const state = getRoomState();
  const items = [];
  const season = seasonOptions.find((option) => option.id === state.season);
  const shopState = shopStateOptions.find((option) => option.id === state.shopState);

  if (season) {
    items.push(season.label);
  }

  if (shopState) {
    items.push(shopState.label);
  }

  return items;
}

function updateUrlState() {
  const url = new URL(window.location.href);
  url.searchParams.set("room", activeRoomId);

  if (contextDrawerOpen) {
    url.searchParams.set("context", "open");
  } else {
    url.searchParams.delete("context");
  }

  for (const legacyParam of ["q", "scenario", "audience", "season", "shopState", "backend"]) {
    url.searchParams.delete(legacyParam);
  }

  window.history.replaceState(window.history.state, "", url);
}

function renderInsights(insights, promptLabel) {
  clearInsights();
  insightsLabelElement.textContent = promptLabel || scenarios[activeScenario].insightLabel;

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
  const hasItems = summaryItems.length > 0;
  audienceSummaryEmptyElement.textContent = hasItems ? "" : scenarios[scenario].audienceSummaryEmptyText;

  for (const itemText of summaryItems) {
    const item = document.createElement("li");
    item.className = "audience-summary-chip";
    item.textContent = itemText;
    audienceSummaryChipsElement.appendChild(item);
  }
}

function renderContextSummary() {
  clearContextSummary();

  const summaryItems = buildContextSummaryItems();
  const hasItems = summaryItems.length > 0;
  contextSummaryEmptyElement.textContent = hasItems ? "" : "No world context applied.";

  for (const itemText of summaryItems) {
    const item = document.createElement("li");
    item.className = "audience-summary-chip";
    item.textContent = itemText;
    contextSummaryChipsElement.appendChild(item);
  }
}

function sendCommand(command) {
  return fetch("/api/session?room=" + encodeURIComponent(activeRoomId), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(command),
  })
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.snapshot) {
        throw new Error(payload.error || "Room update failed.");
      }

      applySnapshot(payload.snapshot);
      return payload.snapshot;
    })
    .catch(() => {
      setConnectionStatus("Connection issue. Retrying...");
    });
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

  renderToggleGroup(backendOptions, getRoomState().backend, backendControlsElement, (nextBackend) => {
    sendCommand({ type: "set-backend", backend: nextBackend || "rules" });
  });
}

function renderContextControls() {
  const state = getRoomState();

  clearSeasonControls();
  clearShopStateControls();

  renderToggleGroup(seasonOptions, state.season, seasonControlsElement, (nextSeason) => {
    sendCommand({ type: "set-season", season: nextSeason || "" });
  });

  renderToggleGroup(shopStateOptions, state.shopState, shopStateControlsElement, (nextShopState) => {
    sendCommand({ type: "set-shop-state", shopState: nextShopState || "" });
  });
}

function renderAudiencePresets(scenario) {
  clearAudiencePresets();

  if (scenario === "baseline") {
    return;
  }

  const audienceState = getAudienceState(scenario);

  for (const preset of scenarios[scenario].presets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "audience-preset";
    button.textContent = preset.label;
    const isActive = audienceState.selectedPresetIds.includes(preset.id);
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("audience-preset-active", isActive);
    button.addEventListener("click", () => {
      sendCommand({ type: "toggle-preset", scenario, presetId: preset.id });
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

  const nextCustomText = nextScenario === "baseline" ? "" : getAudienceState(nextScenario).customText;
  if (document.activeElement !== audienceCustomInput || pendingAudienceDraft == null || pendingAudienceDraft.scenario !== nextScenario) {
    audienceCustomInput.value = nextCustomText;
  }

  renderAudiencePresets(nextScenario);
  renderAudienceSummary(nextScenario);
  renderContextControls();
  renderContextSummary();
  renderBackendControls();
}

function renderContextPanel() {
  contextDrawerPanel.hidden = !contextDrawerOpen;
  contextDrawerToggle.setAttribute("aria-expanded", String(contextDrawerOpen));
  contextDrawerIcon.textContent = contextDrawerOpen ? "◀" : "▶";
}

function renderRoomPanel() {
  roomPanelBody.hidden = !roomPanelOpen;
  roomPanelToggle.setAttribute("aria-expanded", String(roomPanelOpen));
  roomPanelIcon.textContent = roomPanelOpen ? "−" : "+";
}

function renderSearchSnapshot(snapshot) {
  const state = snapshot.state;
  const search = snapshot.search;
  const query = state.query.trim();

  if (!query) {
    clearResults();
    clearInsights();
    setStatus("");
    return;
  }

  if (query.length < minimumQueryLength) {
    clearResults();
    clearInsights();
    setStatus("Type at least " + minimumQueryLength + " characters.");
    return;
  }

  if (!search) {
    clearResults();
    clearInsights();
    setStatus("Search unavailable.");
    return;
  }

  if (!search.results.length) {
    clearResults();
    clearInsights();
    setStatus("No cheeses matched that combination.");
    return;
  }

  renderResults(search.results, search.scenario);
  renderInsights(search.insights || [], search.promptLabel);
  setStatus(search.results.length + (search.results.length === 1 ? " result" : " results"));
}

function applySnapshot(snapshot) {
  if (activeSnapshot && snapshot.state.version < activeSnapshot.state.version) {
    return;
  }

  activeSnapshot = snapshot;
  setRoomParticipantCount(snapshot.participantCount || 1);

  if (pendingQueryDraft !== null && snapshot.state.query === pendingQueryDraft) {
    pendingQueryDraft = null;
  }

  if (
    pendingAudienceDraft &&
    snapshot.state.audienceByChallenge[pendingAudienceDraft.scenario].customText === pendingAudienceDraft.value
  ) {
    pendingAudienceDraft = null;
  }

  if (document.activeElement !== queryInput || pendingQueryDraft === null) {
    queryInput.value = snapshot.state.query;
  }

  roomIdInput.value = snapshot.roomId;
  applyScenario(snapshot.state.activeScenario);
  renderSearchSnapshot(snapshot);
  updateUrlState();
}

function scheduleReconnect() {
  window.clearTimeout(reconnectHandle);
  reconnectHandle = window.setTimeout(() => {
    openLiveSync();
  }, 1200);
}

function stopPolling() {
  window.clearInterval(pollHandle);
  pollHandle = null;
}

function startPolling() {
  if (pollHandle) {
    return;
  }

  pollHandle = window.setInterval(async () => {
    try {
      const snapshot = await fetchSessionSnapshot(activeRoomId);
      applySnapshot(snapshot);
    } catch {}
  }, 1800);
}

function closeLiveSync() {
  window.clearTimeout(reconnectHandle);
  reconnectHandle = null;

  if (liveSocket) {
    const socket = liveSocket;
    liveSocket = null;
    socket.close();
  }

  stopPolling();
}

function openLiveSync() {
  stopPolling();

  const liveUrl = new URL("/api/session/live", window.location.href);
  liveUrl.searchParams.set("room", activeRoomId);
  liveUrl.protocol = liveUrl.protocol === "https:" ? "wss:" : "ws:";

  try {
    liveSocket = new WebSocket(liveUrl.toString());
  } catch {
    setConnectionStatus("Polling fallback active");
    startPolling();
    return;
  }

  const socket = liveSocket;

  socket.addEventListener("open", () => {
    if (socket !== liveSocket) {
      return;
    }

    setConnectionStatus("Live sync connected");
    stopPolling();
  });

  socket.addEventListener("message", (event) => {
    if (socket !== liveSocket) {
      return;
    }

    let payload = null;

    try {
      payload = JSON.parse(String(event.data || "{}"));
    } catch {
      return;
    }

    if (payload.type === "snapshot" && payload.snapshot) {
      applySnapshot(payload.snapshot);
    }
  });

  socket.addEventListener("close", () => {
    if (socket !== liveSocket) {
      return;
    }

    liveSocket = null;

    setConnectionStatus("Reconnecting...");
    startPolling();
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    if (socket !== liveSocket) {
      return;
    }

    setConnectionStatus("Reconnecting...");
  });
}

async function fetchSessionSnapshot(roomId) {
  const response = await fetch("/api/session?room=" + encodeURIComponent(roomId), {
    headers: {
      accept: "application/json",
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Room fetch failed.");
  }

  return payload;
}

async function joinRoom(nextRoomId) {
  const roomId = sanitizeRoomId(nextRoomId);
  closeLiveSync();
  activeRoomId = roomId;
  roomIdInput.value = roomId;
  updateUrlState();
  setConnectionStatus("Connecting...");

  try {
    const snapshot = await fetchSessionSnapshot(roomId);
    applySnapshot(snapshot);
    openLiveSync();
  } catch {
    setConnectionStatus("Room unavailable");
    startPolling();
  }
}

function flashCopyButton(message) {
  const originalLabel = roomCopyLinkButton.textContent;
  roomCopyLinkButton.textContent = message;
  window.setTimeout(() => {
    roomCopyLinkButton.textContent = originalLabel;
  }, 1200);
}

queryInput.addEventListener("input", () => {
  pendingQueryDraft = queryInput.value;
  setStatus("Updating room...");
  window.clearTimeout(querySyncHandle);
  querySyncHandle = window.setTimeout(() => {
    sendCommand({ type: "set-query", query: queryInput.value });
  }, 180);
});

audienceCustomInput.addEventListener("input", () => {
  if (activeScenario === "baseline") {
    return;
  }

  pendingAudienceDraft = {
    scenario: activeScenario,
    value: audienceCustomInput.value,
  };
  renderAudienceSummary(activeScenario);
  setStatus("Updating room...");
  window.clearTimeout(audienceSyncHandle);
  audienceSyncHandle = window.setTimeout(() => {
    sendCommand({ type: "set-custom-text", scenario: activeScenario, customText: audienceCustomInput.value });
  }, 180);
});

contextDrawerToggle.addEventListener("click", () => {
  contextDrawerOpen = !contextDrawerOpen;
  renderContextPanel();
  updateUrlState();
});

roomPanelToggle.addEventListener("click", () => {
  roomPanelOpen = !roomPanelOpen;
  renderRoomPanel();
});

for (const button of scenarioButtons) {
  button.addEventListener("click", () => {
    sendCommand({ type: "set-scenario", scenario: button.dataset.scenario || "baseline" });
  });
}

roomJoinButton.addEventListener("click", () => {
  void joinRoom(roomIdInput.value);
});

roomIdInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void joinRoom(roomIdInput.value);
  }
});

roomCopyLinkButton.addEventListener("click", async () => {
  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set("room", activeRoomId);
  if (contextDrawerOpen) {
    shareUrl.searchParams.set("context", "open");
  } else {
    shareUrl.searchParams.delete("context");
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl.toString());
      flashCopyButton("Copied");
      return;
    }
  } catch {}

  flashCopyButton("Copy manually");
});

roomResetButton.addEventListener("click", () => {
  if (window.confirm("Reset the shared room for everyone connected to it?")) {
    sendCommand({ type: "reset-room" });
  }
});

const initialUrl = new URL(window.location.href);
const initialRoomId = sanitizeRoomId(initialUrl.searchParams.get("room"));
contextDrawerOpen = initialUrl.searchParams.get("context") === "open";
renderRoomPanel();
renderContextPanel();
setRoomParticipantCount(1);
void joinRoom(initialRoomId);
`;
}

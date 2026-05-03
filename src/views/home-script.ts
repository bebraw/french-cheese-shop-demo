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
const audienceCustomField = document.getElementById("audience-custom-field");
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
const teachingFocusPanelElement = document.getElementById("teaching-focus-panel");
const teachingOutcomeElement = document.getElementById("teaching-outcome");
const teachingFocusElement = document.getElementById("teaching-focus-copy");
const teachingQuestionElement = document.getElementById("teaching-question");
const teachingNoticeElement = document.getElementById("teaching-notice");
const resultsElement = document.getElementById("search-results");
const changeStripElement = document.getElementById("change-strip");
const changeStripItemsElement = document.getElementById("change-strip-items");
const scenarioTitleElement = document.getElementById("scenario-title");
const scenarioDescriptionElement = document.getElementById("scenario-description");
const insightsLabelElement = document.getElementById("insights-label");
const scenarioInsightsElement = document.getElementById("scenario-insights");
const scenarioButtons = Array.from(document.querySelectorAll("[data-scenario]"));
const scenarioNextButton = document.getElementById("scenario-next-button");
const roomIdInput = document.getElementById("room-id-input");
const roomPanelToggle = document.getElementById("room-panel-toggle");
const roomPanelIcon = document.getElementById("room-panel-icon");
const roomPanelBody = document.getElementById("room-panel-body");
const roomLecturerControlsPanel = document.getElementById("room-lecturer-controls-panel");
const roomLecturerStatusElement = document.getElementById("room-lecturer-status");
const roomClaimLecturerButton = document.getElementById("room-claim-lecturer-button");
const roomSimpleModeButton = document.getElementById("room-simple-mode-button");
const roomCopyAudienceLinkButton = document.getElementById("room-copy-audience-link-button");
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
const compactViewportQuery = window.matchMedia("(max-width: 639px)");
let activeRoomId = defaultRoomId;
let activeScenario = "baseline";
let activeSnapshot = null;
let contextDrawerOpen = false;
let roomPanelOpen = !compactViewportQuery.matches;
let activePresenterToken = null;
let liveSocket = null;
let reconnectHandle = null;
let pollHandle = null;
let querySyncHandle = null;
let audienceSyncHandle = null;
let pendingQueryDraft = null;
let pendingAudienceDraft = null;
const presenterStoragePrefix = "demo-presenter-token:";
const simpleModeStorageKey = "demo-simple-mode";
const voteStoragePrefix = "demo-vote-state:";
let localVoteState = createEmptyVoteState();
let simpleModeEnabled = false;

function createFallbackSnapshot(roomId) {
  return {
    roomId,
    participantCount: 1,
    state: {
      roomId,
      version: 1,
      query: defaultQuery,
      activeScenario: "baseline",
      revealedChallengeIds: [],
      audienceByChallenge: {
        "challenge-1": { selectedPresetIds: [], votesByPresetId: {}, lecturerOverridePresetIds: [], customText: "" },
        "challenge-2": { selectedPresetIds: [], votesByPresetId: {}, lecturerOverridePresetIds: [], customText: "" },
        "challenge-3": { selectedPresetIds: [], votesByPresetId: {}, lecturerOverridePresetIds: [], customText: "" },
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

function getRoomAccess() {
  return activeSnapshot
    ? activeSnapshot.access
    : { presenterClaimed: false, canManageQuery: false, canManageContext: false, canManageScenario: false };
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

function sanitizePresenterToken(rawToken) {
  const normalized = String(rawToken || "").trim();
  return normalized ? normalized.slice(0, 256) : "";
}

function getPresenterStorageKey(roomId) {
  return presenterStoragePrefix + roomId;
}

function createEmptyVoteState() {
  return Object.fromEntries(challengeSequence.map((scenario) => [scenario, []]));
}

function readStoredSimpleMode() {
  try {
    return window.localStorage.getItem(simpleModeStorageKey) === "1";
  } catch {
    return false;
  }
}

function persistSimpleMode(enabled) {
  try {
    if (enabled) {
      window.localStorage.setItem(simpleModeStorageKey, "1");
    } else {
      window.localStorage.removeItem(simpleModeStorageKey);
    }
  } catch {}
}

function getVoteStorageKey(roomId) {
  return voteStoragePrefix + roomId;
}

function readLocalVoteState(roomId) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getVoteStorageKey(roomId)) || "{}");
    const nextState = createEmptyVoteState();

    for (const scenario of challengeSequence) {
      const allowedPresetIds = new Set(scenarios[scenario].presets.map((preset) => preset.id));
      nextState[scenario] = Array.isArray(parsed[scenario])
        ? parsed[scenario].filter((presetId) => typeof presetId === "string" && allowedPresetIds.has(presetId))
        : [];
    }

    return nextState;
  } catch {
    return createEmptyVoteState();
  }
}

function persistLocalVoteState(roomId) {
  try {
    window.localStorage.setItem(getVoteStorageKey(roomId), JSON.stringify(localVoteState));
  } catch {}
}

function readStoredPresenterToken(roomId) {
  try {
    return sanitizePresenterToken(window.localStorage.getItem(getPresenterStorageKey(roomId)));
  } catch {
    return "";
  }
}

function persistPresenterToken(roomId, presenterToken) {
  try {
    if (presenterToken) {
      window.localStorage.setItem(getPresenterStorageKey(roomId), presenterToken);
    } else {
      window.localStorage.removeItem(getPresenterStorageKey(roomId));
    }
  } catch {}
}

function syncLocalVotesWithSnapshot(snapshot) {
  if (!isResetSnapshot(snapshot) || challengeSequence.every((scenario) => (localVoteState[scenario] || []).length === 0)) {
    return;
  }

  localVoteState = createEmptyVoteState();
  persistLocalVoteState(activeRoomId);
}

function isResetSnapshot(snapshot) {
  const state = snapshot.state;

  return (
    state.query === defaultQuery &&
    state.activeScenario === "baseline" &&
    state.revealedChallengeIds.length === 0 &&
    state.season === "" &&
    state.shopState === "" &&
    state.backend === "rules" &&
    challengeSequence.every((scenario) => {
      const audienceState = state.audienceByChallenge[scenario];
      return (
        audienceState.selectedPresetIds.length === 0 &&
        Object.keys(audienceState.votesByPresetId).length === 0 &&
        audienceState.lecturerOverridePresetIds.length === 0 &&
        audienceState.customText === ""
      );
    })
  );
}

function createPresenterToken() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return "lecturer-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
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

function clearChangeStrip() {
  clearChildren(changeStripItemsElement);
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

function getNextScenario(scenario) {
  if (scenario === "baseline") {
    return "challenge-1";
  }

  const scenarioIndex = challengeSequence.indexOf(scenario);
  return challengeSequence[scenarioIndex + 1] || scenario;
}

function getNextScenarioForMode(scenario) {
  return getNextScenario(scenario);
}

function isSimpleModeActive() {
  return simpleModeEnabled && getRoomAccess().canManageScenario;
}

function getVisibleScenarioIds(access, state) {
  if (access.canManageScenario) {
    return new Set(["baseline", ...challengeSequence]);
  }

  return new Set(["baseline", ...(state.revealedChallengeIds || []), state.activeScenario]);
}

function buildAccumulatedAudienceParts(scenario, valueSelector) {
  const parts = [];
  const seen = new Set();

  for (const scenarioId of getScenarioTrail(scenario)) {
    const audienceState = getAudienceState(scenarioId);
    const selectedPresets = scenarios[scenarioId].presets.filter((preset) => audienceState.selectedPresetIds.includes(preset.id));

    for (const part of [...selectedPresets.map((preset) => valueSelector(preset, audienceState)), audienceState.customText.trim()]) {
      const partKey = typeof part === "string" ? part : part.label + ":" + part.groupLabel;
      if (!part || seen.has(partKey)) {
        continue;
      }

      seen.add(partKey);
      parts.push(part);
    }
  }

  return parts;
}

function buildAudienceSummaryItems(scenario) {
  return buildAccumulatedAudienceParts(scenario, (preset, audienceState) => ({
    label: preset.label,
    groupLabel: preset.voteGroupLabel,
    votes: audienceState.votesByPresetId[preset.id] || 0,
    isOverride: audienceState.lecturerOverridePresetIds.includes(preset.id),
  }));
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

  if (simpleModeEnabled) {
    url.searchParams.set("simple", "1");
  } else {
    url.searchParams.delete("simple");
  }

  if (contextDrawerOpen) {
    url.searchParams.set("context", "open");
  } else {
    url.searchParams.delete("context");
  }

  for (const legacyParam of ["q", "scenario", "audience", "season", "shopState", "backend", "presenter"]) {
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

function formatVoteCount(votes) {
  return votes + " " + (votes === 1 ? "vote" : "votes");
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

  for (const summaryItem of summaryItems) {
    const chip = document.createElement("li");
    chip.className = "audience-summary-chip";
    if (typeof summaryItem === "string") {
      chip.textContent = summaryItem;
    } else {
      const voteText = typeof summaryItem.votes === "number" ? " · " + formatVoteCount(summaryItem.votes) : "";
      const overrideText = summaryItem.isOverride ? " · lecturer override" : "";
      chip.textContent = summaryItem.groupLabel + ": " + summaryItem.label + voteText + overrideText;
    }
    audienceSummaryChipsElement.appendChild(chip);
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

function renderChangeStrip(search) {
  clearChangeStrip();

  const topResult = search.results[0]?.name || "no top result";
  const audienceInput = search.audienceInput || "";
  const changeItems =
    search.scenario === "baseline"
      ? ["Same query", "Baseline only: request wording", "Current lead: " + topResult]
      : [
          "Same query",
          audienceInput ? "Added: " + audienceInput : "No added requirement yet",
          "Current lead: " + topResult,
        ];

  for (const itemText of changeItems) {
    const item = document.createElement("li");
    item.className = "audience-summary-chip";
    item.textContent = itemText;
    changeStripItemsElement.appendChild(item);
  }

  changeStripElement.hidden = false;
}

function renderTeachingGuide(scenario) {
  const copy = scenarios[scenario];
  teachingOutcomeElement.textContent = copy.teachingOutcome;
  teachingFocusElement.textContent = copy.teachingFocus;
  teachingQuestionElement.textContent = copy.teachingQuestion;
  teachingNoticeElement.textContent = copy.teachingNotice;
}

function renderLecturerControls() {
  const access = getRoomAccess();
  const state = getRoomState();
  const simpleModeActive = isSimpleModeActive();
  const nextScenario = getNextScenarioForMode(state.activeScenario);
  const hasNextScenario = nextScenario !== state.activeScenario;

  teachingFocusPanelElement.hidden = !access.canManageScenario;
  scenarioNextButton.hidden = !access.canManageScenario;
  scenarioNextButton.disabled = !hasNextScenario;
  scenarioNextButton.setAttribute("aria-disabled", String(!hasNextScenario));
  scenarioNextButton.classList.toggle("opacity-60", !hasNextScenario);
  scenarioNextButton.textContent = hasNextScenario
    ? "Next: " + scenarios[nextScenario].title.replace(/^Challenge ([0-9]+):.*/, "Challenge $1")
    : simpleModeActive
      ? "Simple flow ready"
      : "All challenges revealed";

  const controlsClaimedByOtherDevice = access.presenterClaimed && !access.canManageScenario;
  roomLecturerControlsPanel.hidden = controlsClaimedByOtherDevice;

  roomClaimLecturerButton.disabled = access.canManageScenario;
  roomClaimLecturerButton.setAttribute("aria-disabled", String(access.canManageScenario));
  roomClaimLecturerButton.classList.toggle("opacity-60", access.canManageScenario);
  roomClaimLecturerButton.textContent = access.canManageScenario ? "Lecturer controls active" : "Claim lecturer controls";

  roomSimpleModeButton.disabled = !access.canManageScenario;
  roomSimpleModeButton.setAttribute("aria-disabled", String(!access.canManageScenario));
  roomSimpleModeButton.setAttribute("aria-pressed", String(simpleModeActive));
  roomSimpleModeButton.classList.toggle("opacity-60", !access.canManageScenario);
  roomSimpleModeButton.classList.toggle("audience-preset-active", simpleModeActive);

  roomResetButton.disabled = !access.canManageScenario;
  roomResetButton.setAttribute("aria-disabled", String(!access.canManageScenario));
  roomResetButton.classList.toggle("opacity-60", !access.canManageScenario);

  queryInput.readOnly = !access.canManageQuery;
  queryInput.setAttribute("aria-readonly", String(!access.canManageQuery));
  queryInput.classList.toggle("cursor-not-allowed", !access.canManageQuery);
  queryInput.classList.toggle("bg-app-canvas", !access.canManageQuery);
  queryInput.title = access.canManageQuery
    ? ""
    : access.presenterClaimed
      ? "Only the lecturer can change the shared search query for this room."
      : "Claim lecturer controls on this device to change the shared search query.";

  roomLecturerStatusElement.textContent = access.canManageScenario
    ? simpleModeActive
      ? "This device is in focus mode: context stays hidden while all challenges remain available."
      : "This device controls the shared search query, world context, and challenge changes for the room."
    : access.presenterClaimed
      ? "The shared search query, world context, and challenge changes are locked to the lecturer device for this room."
      : "The shared search query, world context, and challenge changes stay unlocked only after the lecturer claims control on this device.";

  renderContextPanel();
}

function sendCommand(command) {
  return fetch("/api/session?room=" + encodeURIComponent(activeRoomId), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(activePresenterToken ? { "x-demo-presenter-token": activePresenterToken } : {}),
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
    .catch((error) => {
      const message = error instanceof Error ? error.message.trim() : "";

      if (message && !message.toLowerCase().includes("fetch")) {
        setStatus(message);
        renderLecturerControls();
        return null;
      }

      setConnectionStatus("Connection issue. Retrying...");
      return null;
    });
}

function renderToggleGroup(options, selectedId, container, onSelect, interaction = null) {
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "audience-preset";
    button.textContent = option.label;
    const isActive = selectedId === option.id;
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("audience-preset-active", isActive);
    const canInteract = !interaction || interaction.canInteract;
    button.setAttribute("aria-disabled", String(!canInteract));
    button.classList.toggle("opacity-60", !canInteract);
    button.addEventListener("click", () => {
      if (!canInteract) {
        setStatus(interaction.lockedMessage);
        return;
      }

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
  const access = getRoomAccess();
  const lockedMessage = access.presenterClaimed
    ? "Only the lecturer can change the shared world context."
    : "Claim lecturer controls to change the shared world context.";
  const interaction = {
    canInteract: access.canManageContext,
    lockedMessage,
  };

  clearSeasonControls();
  clearShopStateControls();

  renderToggleGroup(
    seasonOptions,
    state.season,
    seasonControlsElement,
    (nextSeason) => {
      sendCommand({ type: "set-season", season: nextSeason || "" });
    },
    interaction,
  );

  renderToggleGroup(
    shopStateOptions,
    state.shopState,
    shopStateControlsElement,
    (nextShopState) => {
      sendCommand({ type: "set-shop-state", shopState: nextShopState || "" });
    },
    interaction,
  );
}

function renderAudiencePresets(scenario) {
  clearAudiencePresets();

  if (scenario === "baseline") {
    return;
  }

  const audienceState = getAudienceState(scenario);
  const access = getRoomAccess();
  const localPresetIds = new Set(localVoteState[scenario] || []);
  const groupedPresets = [];
  const groupIndexById = new Map();

  for (const preset of getVisiblePresets(scenario)) {
    if (!groupIndexById.has(preset.voteGroupId)) {
      groupIndexById.set(preset.voteGroupId, groupedPresets.length);
      groupedPresets.push({
        id: preset.voteGroupId,
        label: preset.voteGroupLabel,
        presets: [],
      });
    }

    groupedPresets[groupIndexById.get(preset.voteGroupId)].presets.push(preset);
  }

  for (const group of groupedPresets) {
    const groupElement = document.createElement("section");
    groupElement.className = "grid gap-2";

    const heading = document.createElement("p");
    heading.className = "text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-text-soft";
    heading.textContent = group.label;
    groupElement.appendChild(heading);

    const optionList = document.createElement("div");
    optionList.className = "flex flex-wrap gap-2";

    for (const preset of group.presets) {
      const voteCount = audienceState.votesByPresetId[preset.id] || 0;
      const hasLocalVote = localPresetIds.has(preset.id);
      const isSelected = audienceState.selectedPresetIds.includes(preset.id);
      const isOverride = audienceState.lecturerOverridePresetIds.includes(preset.id);

      const voteButton = document.createElement("button");
      voteButton.type = "button";
      voteButton.className = "audience-preset";
      voteButton.textContent = preset.label + " · " + formatVoteCount(voteCount) + (isOverride ? " · Lecturer choice" : "");
      voteButton.setAttribute("aria-pressed", String(access.canManageScenario ? isOverride : hasLocalVote));
      voteButton.classList.toggle("audience-preset-active", hasLocalVote || isSelected || isOverride);
      voteButton.addEventListener("click", () => {
        if (access.canManageScenario) {
          sendCommand({ type: "toggle-preset-override", scenario, presetId: preset.id });
          return;
        }

        handlePresetVote(scenario, preset);
      });
      optionList.appendChild(voteButton);
    }

    groupElement.appendChild(optionList);
    audiencePresetsElement.appendChild(groupElement);
  }
}

function getVisiblePresets(scenario) {
  const presets = scenarios[scenario].presets;

  if (!isSimpleModeActive() || scenario !== "challenge-1") {
    return presets;
  }

  const simplePresetIds = new Set(["creamy", "oozy", "cow", "goat"]);
  return presets.filter((preset) => simplePresetIds.has(preset.id));
}

function handlePresetVote(scenario, preset) {
  const currentPresetIds = new Set(localVoteState[scenario] || []);
  const voteCommands = [];

  if (currentPresetIds.has(preset.id)) {
    currentPresetIds.delete(preset.id);
    voteCommands.push({ type: "cast-preset-vote", scenario, presetId: preset.id, voteDelta: -1 });
  } else {
    for (const option of scenarios[scenario].presets) {
      if (option.voteGroupId === preset.voteGroupId && currentPresetIds.has(option.id)) {
        currentPresetIds.delete(option.id);
        voteCommands.push({ type: "cast-preset-vote", scenario, presetId: option.id, voteDelta: -1 });
      }
    }

    currentPresetIds.add(preset.id);
    voteCommands.push({ type: "cast-preset-vote", scenario, presetId: preset.id, voteDelta: 1 });
  }

  localVoteState = {
    ...localVoteState,
    [scenario]: [...currentPresetIds],
  };
  persistLocalVoteState(activeRoomId);
  renderAudiencePresets(scenario);

  for (const command of voteCommands) {
    sendCommand(command);
  }
}

function renderResults(results, scenario) {
  clearResults();

  for (const result of results) {
    const item = document.createElement("li");
    item.className =
      "scroll-mt-80 rounded-[1.35rem] border border-app-line bg-app-canvas px-4 py-4 sm:px-5 lg:scroll-mt-[24rem]";

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
  const access = getRoomAccess();
  const state = getRoomState();
  const visibleScenarioIds = getVisibleScenarioIds(access, state);

  scenarioTitleElement.textContent = copy.title;
  scenarioDescriptionElement.textContent = copy.description;
  insightsLabelElement.textContent = copy.insightLabel;
  audienceControls.classList.toggle("hidden", nextScenario === "baseline");
  audienceCustomField.hidden = isSimpleModeActive();
  audiencePromptElement.textContent = copy.audiencePrompt;
  audienceSummaryLabelElement.textContent = copy.audienceSummaryLabel;
  audienceLabel.textContent = copy.audienceLabel;
  audienceCustomInput.placeholder = copy.audiencePlaceholder;
  renderTeachingGuide(nextScenario);

  for (const button of scenarioButtons) {
    const isActive = button.dataset.scenario === nextScenario;
    const scenarioId = button.dataset.scenario || "baseline";
    const isVisible = visibleScenarioIds.has(scenarioId);
    button.hidden = !isVisible;
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("scenario-guide-item-active", isActive);
    button.setAttribute("aria-disabled", String(!access.canManageScenario));
    button.classList.toggle("opacity-60", !access.canManageScenario);
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
  renderLecturerControls();
}

function renderContextPanel() {
  const contextHidden = isSimpleModeActive();
  contextDrawerToggle.hidden = contextHidden;
  contextDrawerPanel.hidden = contextHidden || !contextDrawerOpen;
  contextDrawerToggle.setAttribute("aria-expanded", String(!contextHidden && contextDrawerOpen));
  contextDrawerIcon.textContent = !contextHidden && contextDrawerOpen ? "◀" : "▶";
}

function renderRoomPanel() {
  roomPanelBody.hidden = !roomPanelOpen;
  roomPanelToggle.setAttribute("aria-expanded", String(roomPanelOpen));
  roomPanelIcon.textContent = roomPanelOpen ? "−" : "+";
}

function syncViewportDefaults() {
  if (compactViewportQuery.matches && roomPanelOpen) {
    roomPanelOpen = false;
    renderRoomPanel();
  }
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
    clearChangeStrip();
    clearInsights();
    setStatus("Type at least " + minimumQueryLength + " characters.");
    return;
  }

  if (!search) {
    clearResults();
    clearChangeStrip();
    clearInsights();
    setStatus("Search unavailable.");
    return;
  }

  if (!search.results.length) {
    clearResults();
    clearChangeStrip();
    clearInsights();
    setStatus("No cheeses matched that combination.");
    return;
  }

  renderChangeStrip(search);
  renderResults(search.results, search.scenario);
  renderInsights(search.insights || [], search.promptLabel);
  setStatus(search.results.length + (search.results.length === 1 ? " result" : " results"));
}

function applySnapshot(snapshot) {
  if (activeSnapshot && snapshot.state.version < activeSnapshot.state.version) {
    return;
  }

  activeSnapshot = snapshot;
  syncLocalVotesWithSnapshot(snapshot);
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

  if (pendingQueryDraft === null) {
    queryInput.value = snapshot.state.query;
  } else {
    queryInput.value = pendingQueryDraft;
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
  if (activePresenterToken) {
    liveUrl.searchParams.set("presenter", activePresenterToken);
  }
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
      ...(activePresenterToken ? { "x-demo-presenter-token": activePresenterToken } : {}),
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
  activePresenterToken = readStoredPresenterToken(roomId) || "";
  localVoteState = readLocalVoteState(roomId);
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

async function claimLecturerControls() {
  if (!activePresenterToken) {
    activePresenterToken = createPresenterToken();
  }

  persistPresenterToken(activeRoomId, activePresenterToken);
  updateUrlState();

  const snapshot = await sendCommand({ type: "claim-presenter" });
  if (!snapshot) {
    return;
  }

  closeLiveSync();
  openLiveSync();
  setStatus("Lecturer controls claimed for this room.");
}

async function resetRoom() {
  window.clearTimeout(querySyncHandle);
  window.clearTimeout(audienceSyncHandle);

  const snapshot = await sendCommand({ type: "reset-room" });
  if (!snapshot) {
    return;
  }

  pendingQueryDraft = null;
  pendingAudienceDraft = null;
  activePresenterToken = "";
  persistPresenterToken(activeRoomId, "");
  localVoteState = createEmptyVoteState();
  persistLocalVoteState(activeRoomId);
  closeLiveSync();
  openLiveSync();
  applySnapshot(snapshot);
  setStatus("Room reset. Lecturer controls are unclaimed.");
}

function flashCopyButton(message) {
  const originalLabel = roomCopyLinkButton.textContent;
  roomCopyLinkButton.textContent = message;
  window.setTimeout(() => {
    roomCopyLinkButton.textContent = originalLabel;
  }, 1200);
}

queryInput.addEventListener("input", () => {
  if (!getRoomAccess().canManageQuery) {
    queryInput.value = getRoomState().query;
    setStatus("Only the lecturer can change the shared search query.");
    return;
  }

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
  if (isSimpleModeActive()) {
    return;
  }

  contextDrawerOpen = !contextDrawerOpen;
  renderContextPanel();
  updateUrlState();
});

roomPanelToggle.addEventListener("click", () => {
  roomPanelOpen = !roomPanelOpen;
  renderRoomPanel();
});

if (typeof compactViewportQuery.addEventListener === "function") {
  compactViewportQuery.addEventListener("change", syncViewportDefaults);
} else if (typeof compactViewportQuery.addListener === "function") {
  compactViewportQuery.addListener(syncViewportDefaults);
}

for (const button of scenarioButtons) {
  button.addEventListener("click", () => {
    if (!getRoomAccess().canManageScenario) {
      setStatus("Only the lecturer can change challenges.");
      return;
    }

    sendCommand({ type: "set-scenario", scenario: button.dataset.scenario || "baseline" });
  });
}

scenarioNextButton.addEventListener("click", () => {
  if (!getRoomAccess().canManageScenario) {
    setStatus("Only the lecturer can reveal the next challenge.");
    return;
  }

  sendCommand({ type: "advance-scenario" });
});

roomClaimLecturerButton.addEventListener("click", () => {
  void claimLecturerControls();
});

roomSimpleModeButton.addEventListener("click", () => {
  if (!getRoomAccess().canManageScenario) {
    setStatus("Claim lecturer controls to use focus mode.");
    return;
  }

  simpleModeEnabled = !simpleModeEnabled;
  persistSimpleMode(simpleModeEnabled);
  updateUrlState();

  applySnapshot(activeSnapshot || createFallbackSnapshot(activeRoomId));
  setStatus(simpleModeEnabled ? "Focus mode on." : "Focus mode off.");
});

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
  if (activePresenterToken) {
    shareUrl.searchParams.set("presenter", activePresenterToken);
  }
  if (contextDrawerOpen) {
    shareUrl.searchParams.set("context", "open");
  } else {
    shareUrl.searchParams.delete("context");
  }
  if (simpleModeEnabled) {
    shareUrl.searchParams.set("simple", "1");
  } else {
    shareUrl.searchParams.delete("simple");
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

roomCopyAudienceLinkButton.addEventListener("click", async () => {
  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set("room", activeRoomId);
  shareUrl.searchParams.delete("presenter");
  shareUrl.searchParams.delete("simple");
  if (contextDrawerOpen) {
    shareUrl.searchParams.set("context", "open");
  } else {
    shareUrl.searchParams.delete("context");
  }

  const originalLabel = roomCopyAudienceLinkButton.textContent;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl.toString());
      roomCopyAudienceLinkButton.textContent = "Copied";
      window.setTimeout(() => {
        roomCopyAudienceLinkButton.textContent = originalLabel;
      }, 1200);
      return;
    }
  } catch {}

  roomCopyAudienceLinkButton.textContent = "Copy manually";
  window.setTimeout(() => {
    roomCopyAudienceLinkButton.textContent = originalLabel;
  }, 1200);
});

roomResetButton.addEventListener("click", () => {
  if (!getRoomAccess().canManageScenario) {
    setStatus("Only the lecturer can reset the room.");
    return;
  }

  if (window.confirm("Reset the shared room for everyone connected to it?")) {
    void resetRoom();
  }
});

const initialUrl = new URL(window.location.href);
const initialRoomId = sanitizeRoomId(initialUrl.searchParams.get("room"));
const initialPresenterToken = sanitizePresenterToken(initialUrl.searchParams.get("presenter"));
simpleModeEnabled = initialUrl.searchParams.get("simple") === "1" || readStoredSimpleMode();
if (initialPresenterToken) {
  persistPresenterToken(initialRoomId, initialPresenterToken);
  activePresenterToken = initialPresenterToken;
}
contextDrawerOpen = initialUrl.searchParams.get("context") === "open";
renderRoomPanel();
renderContextPanel();
renderLecturerControls();
setRoomParticipantCount(1);
syncViewportDefaults();
void joinRoom(initialRoomId);
`;
}

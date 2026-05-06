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

type ClientSnapshot = any;
type ClientScenarioId = keyof typeof scenarioCopy;
type ClientChallengeId = (typeof challengeSequence)[number];
type LocalVoteState = Record<ClientChallengeId, string[]>;
type PendingAudienceDraft = { scenario: ClientChallengeId; value: string };

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error("Missing required element: " + id);
  }

  return element as T;
}

const queryInput = requireElement<HTMLInputElement>("customer-query");
const audienceControls = requireElement("audience-controls");
const audiencePromptElement = requireElement("audience-prompt");
const audiencePresetsElement = requireElement("audience-presets");
const audienceCustomInput = requireElement<HTMLInputElement>("audience-custom-input");
const audienceCustomField = requireElement("audience-custom-field");
const audienceLabel = requireElement("audience-label");
const audienceSummaryLabelElement = requireElement("audience-summary-label");
const audienceSummaryEmptyElement = requireElement("audience-summary-empty");
const audienceSummaryChipsElement = requireElement("audience-summary-chips");
const audienceResetButton = requireElement<HTMLButtonElement>("audience-reset-button");
const contextDrawerToggle = requireElement<HTMLButtonElement>("context-drawer-toggle");
const contextDrawerIcon = requireElement("context-drawer-icon");
const contextDrawerPanel = requireElement("context-drawer-panel");
const seasonControlsElement = requireElement("season-controls");
const shopStateControlsElement = requireElement("shop-state-controls");
const contextSummaryEmptyElement = requireElement("context-summary-empty");
const contextSummaryChipsElement = requireElement("context-summary-chips");
const backendControlsElement = requireElement("backend-controls");
const statusElement = requireElement("search-status");
const teachingFocusPanelElement = requireElement("teaching-focus-panel");
const teachingOutcomeElement = requireElement("teaching-outcome");
const teachingFocusElement = requireElement("teaching-focus-copy");
const teachingQuestionElement = requireElement("teaching-question");
const teachingNoticeElement = requireElement("teaching-notice");
const teachingPauseElement = requireElement("teaching-pause");
const teachingTimeboxElement = requireElement("teaching-timebox");
const teachingStopHereElement = requireElement("teaching-stop-here");
const resultsElement = requireElement("search-results");
const changeStripElement = requireElement("change-strip");
const changeStripItemsElement = requireElement("change-strip-items");
const scenarioTitleElement = requireElement("scenario-title");
const scenarioDescriptionElement = requireElement("scenario-description");
const insightsLabelElement = requireElement("insights-label");
const scenarioInsightsElement = requireElement("scenario-insights");
const requirementsLearnedElement = requireElement("requirements-learned");
const scenarioButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-scenario]"));
const scenarioNextButton = requireElement<HTMLButtonElement>("scenario-next-button");
const roomIdInput = requireElement<HTMLInputElement>("room-id-input");
const roomPanelToggle = requireElement<HTMLButtonElement>("room-panel-toggle");
const roomPanelIcon = requireElement("room-panel-icon");
const roomPanelBody = requireElement("room-panel-body");
const roomPanelSummaryElement = requireElement("room-panel-summary");
const roomLecturerControlsPanel = requireElement("room-lecturer-controls-panel");
const roomLecturerStatusElement = requireElement("room-lecturer-status");
const roomReadyStatusElement = requireElement("room-ready-status");
const roomClaimLecturerButton = requireElement<HTMLButtonElement>("room-claim-lecturer-button");
const roomReleaseLecturerButton = requireElement<HTMLButtonElement>("room-release-lecturer-button");
const roomSimpleModeButton = requireElement<HTMLButtonElement>("room-simple-mode-button");
const roomCopyAudienceLinkButton = requireElement<HTMLButtonElement>("room-copy-audience-link-button");
const roomJoinButton = requireElement<HTMLButtonElement>("room-join-button");
const roomLecturerActionButtons = requireElement("room-lecturer-action-buttons");
const roomCopyLinkButton = requireElement<HTMLButtonElement>("room-copy-link-button");
const roomResetButton = requireElement<HTMLButtonElement>("room-reset-button");
const roomConnectionStatusElement = requireElement("room-connection-status");
const roomParticipantCountElement = requireElement("room-participant-count");
const minimumQueryLength = MINIMUM_QUERY_LENGTH;
const defaultQuery = DEFAULT_QUERY;
const defaultRoomId = DEFAULT_ROOM_ID;

const scenarios = scenarioCopy;

const expandedResultIds = new Set<string>();
const compactViewportQuery = window.matchMedia("(max-width: 639px)");
let activeRoomId = defaultRoomId;
let activeScenario: ClientScenarioId = "baseline";
let activeSnapshot: ClientSnapshot | null = null;
let contextDrawerOpen = false;
let roomPanelOpen = !compactViewportQuery.matches;
let activePresenterToken = "";
let liveSocket: WebSocket | null = null;
let reconnectHandle: number | undefined;
let pollHandle: number | undefined;
let querySyncHandle: number | undefined;
let audienceSyncHandle: number | undefined;
let pendingQueryDraft: string | null = null;
let pendingAudienceDraft: PendingAudienceDraft | null = null;
const presenterStoragePrefix = "demo-presenter-token:";
const voteStoragePrefix = "demo-vote-state:";
let localVoteState: LocalVoteState = createEmptyVoteState();

function createFallbackSnapshot(roomId: string): ClientSnapshot {
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
      focusMode: false,
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

function getAudienceState(scenario: ClientChallengeId) {
  return getRoomState().audienceByChallenge[scenario];
}

function getRoomAccess() {
  return activeSnapshot
    ? activeSnapshot.access
    : { presenterClaimed: false, canManageQuery: false, canManageContext: false, canManageScenario: false };
}

function sanitizeRoomId(rawRoomId: unknown): string {
  const normalized = String(rawRoomId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length >= 3 ? normalized.slice(0, 32) : defaultRoomId;
}

function sanitizePresenterToken(rawToken: unknown): string {
  const normalized = String(rawToken || "").trim();
  return normalized ? normalized.slice(0, 256) : "";
}

function getPresenterStorageKey(roomId: string): string {
  return presenterStoragePrefix + roomId;
}

function createEmptyVoteState(): LocalVoteState {
  return Object.fromEntries(challengeSequence.map((scenario) => [scenario, []])) as unknown as LocalVoteState;
}

function getVoteStorageKey(roomId: string): string {
  return voteStoragePrefix + roomId;
}

function readLocalVoteState(roomId: string): LocalVoteState {
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

function persistLocalVoteState(roomId: string): void {
  try {
    window.localStorage.setItem(getVoteStorageKey(roomId), JSON.stringify(localVoteState));
  } catch {}
}

function readStoredPresenterToken(roomId: string): string {
  try {
    return sanitizePresenterToken(window.localStorage.getItem(getPresenterStorageKey(roomId)));
  } catch {
    return "";
  }
}

function persistPresenterToken(roomId: string, presenterToken: string): void {
  try {
    if (presenterToken) {
      window.localStorage.setItem(getPresenterStorageKey(roomId), presenterToken);
    } else {
      window.localStorage.removeItem(getPresenterStorageKey(roomId));
    }
  } catch {}
}

function syncLocalVotesWithSnapshot(snapshot: ClientSnapshot, previousSnapshot: ClientSnapshot | null = null): void {
  if (previousSnapshot && snapshot.state.version <= previousSnapshot.state.version) {
    return;
  }

  let nextVoteState = localVoteState;

  if (isResetSnapshot(snapshot)) {
    nextVoteState = createEmptyVoteState();
  } else {
    for (const scenario of challengeSequence) {
      const localPresetIds = localVoteState[scenario] || [];
      if (localPresetIds.length === 0) {
        continue;
      }

      const audienceState = snapshot.state.audienceByChallenge[scenario];
      const challengeHasSharedVotes =
        Object.keys(audienceState.votesByPresetId).length > 0 || audienceState.lecturerOverridePresetIds.length > 0;

      if (challengeHasSharedVotes) {
        continue;
      }

      nextVoteState = {
        ...nextVoteState,
        [scenario]: [],
      };
    }
  }

  if (nextVoteState !== localVoteState) {
    localVoteState = nextVoteState;
    persistLocalVoteState(activeRoomId);
  }
}

function isResetSnapshot(snapshot: ClientSnapshot): boolean {
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

function setConnectionStatus(message: string): void {
  roomConnectionStatusElement.textContent = message;
}

function setRoomParticipantCount(participantCount: number): void {
  roomParticipantCountElement.textContent = participantCount + " participant" + (participantCount === 1 ? "" : "s");
}

function setStatus(message: string): void {
  statusElement.textContent = message;
}

function clearChildren(container: HTMLElement): void {
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

function clearRequirementsLearned() {
  clearChildren(requirementsLearnedElement);
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

function getScenarioTrail(scenario: ClientScenarioId): ClientChallengeId[] {
  const scenarioIndex = challengeSequence.indexOf(scenario as ClientChallengeId);
  return scenarioIndex >= 0 ? challengeSequence.slice(0, scenarioIndex + 1) : [];
}

function getNextScenario(scenario: ClientScenarioId): ClientScenarioId {
  if (scenario === "baseline") {
    return "challenge-1";
  }

  const scenarioIndex = challengeSequence.indexOf(scenario);
  return challengeSequence[scenarioIndex + 1] || scenario;
}

function getNextScenarioForMode(scenario: ClientScenarioId): ClientScenarioId {
  return getNextScenario(scenario);
}

function isSimpleModeActive() {
  return Boolean(getRoomState().focusMode);
}

function getVisibleScenarioIds(access: any, state: any): Set<ClientScenarioId> {
  if (access.canManageScenario) {
    return new Set(["baseline", ...challengeSequence]);
  }

  return new Set(["baseline", ...(state.revealedChallengeIds || []), state.activeScenario]);
}

function buildAccumulatedAudienceParts(scenario: ClientScenarioId, valueSelector: (preset: any, audienceState: any) => any): any[] {
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

function buildAudienceSummaryItems(scenario: ClientScenarioId): any[] {
  return buildAccumulatedAudienceParts(scenario, (preset, audienceState) => ({
    label: preset.label,
    groupLabel: preset.voteGroupLabel,
    votes: audienceState.votesByPresetId[preset.id] || 0,
    isOverride: audienceState.lecturerOverridePresetIds.includes(preset.id),
  }));
}

function buildSingleChallengeSummaryItems(scenario: ClientChallengeId): string[] {
  const audienceState = getAudienceState(scenario);
  const selectedPresets = scenarios[scenario].presets.filter((preset) => audienceState.selectedPresetIds.includes(preset.id));
  const items = selectedPresets.map((preset) => preset.label);
  const customText = audienceState.customText.trim();

  return customText ? [...items, customText] : items;
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

  if (isSimpleModeActive()) {
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

function renderInsights(insights: string[], promptLabel: string | null | undefined): void {
  clearInsights();
  insightsLabelElement.textContent = promptLabel || scenarios[activeScenario].insightLabel;

  for (const insight of insights) {
    const item = document.createElement("li");
    item.className = "rounded-[1.1rem] border border-app-line bg-white px-4 py-3";
    item.textContent = insight;
    scenarioInsightsElement.appendChild(item);
  }
}

function renderRequirementsLearned() {
  clearRequirementsLearned();

  const state = getRoomState();
  const contextItems = buildContextSummaryItems();
  const learnedItems = [
    ["Original request", state.query],
    ["Clarified preferences", buildSingleChallengeSummaryItems("challenge-1").join(", ") || "Not captured yet"],
    ["Operational constraints", [...buildSingleChallengeSummaryItems("challenge-2"), ...contextItems].join(", ") || "Not captured yet"],
    ["Evaluation checks", buildSingleChallengeSummaryItems("challenge-3").join(", ") || "Not captured yet"],
  ];

  for (const [labelText, valueText] of learnedItems) {
    const item = document.createElement("li");
    item.className = "rounded-[1.1rem] border border-app-line bg-white px-4 py-3";

    const label = document.createElement("span");
    label.className = "block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-secondary";
    label.textContent = labelText;

    const value = document.createElement("span");
    value.className = "mt-1 block";
    value.textContent = valueText;

    item.append(label, value);
    requirementsLearnedElement.appendChild(item);
  }
}

function formatVoteCount(votes: number): string {
  return votes + " " + (votes === 1 ? "vote" : "votes");
}

function renderAudienceSummary(scenario: ClientScenarioId): void {
  clearAudienceSummary();
  const access = getRoomAccess();
  audienceResetButton.hidden = scenario === "baseline" || !access.canManageScenario;

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
      chip.textContent = "Room chose: " + summaryItem.groupLabel + ": " + summaryItem.label + voteText + overrideText;
    }
    audienceSummaryChipsElement.appendChild(chip);
  }
}

async function resetCurrentChallengeVotes() {
  if (!getRoomAccess().canManageScenario) {
    setStatus("Only the lecturer can clear challenge votes.");
    return;
  }

  if (activeScenario === "baseline") {
    setStatus("No challenge votes to clear in baseline.");
    return;
  }

  const snapshot = await sendCommand({ type: "reset-challenge", scenario: activeScenario });
  if (!snapshot) {
    return;
  }

  localVoteState = {
    ...localVoteState,
    [activeScenario]: [],
  };
  persistLocalVoteState(activeRoomId);
  applySnapshot(snapshot);
  setStatus("Challenge votes cleared.");
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

function renderChangeStrip(search: any): void {
  clearChangeStrip();

  const topResult = search.results[0]?.name || "no top result";
  const audienceInput = search.audienceInput || "";
  const changeItems =
    search.scenario === "baseline"
      ? ["Before: vague request only", "After: no extra requirements yet", "Current lead: " + topResult]
      : [
          "Before: vague request only",
          audienceInput ? "After: " + audienceInput : "After: no explicit requirement yet",
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

function renderTeachingGuide(scenario: ClientScenarioId): void {
  const copy = scenarios[scenario];
  teachingOutcomeElement.textContent = copy.teachingOutcome;
  teachingFocusElement.textContent = copy.teachingFocus;
  teachingQuestionElement.textContent = copy.teachingQuestion;
  teachingNoticeElement.textContent = copy.teachingNotice;
  teachingPauseElement.textContent = copy.teachingPause;
  teachingTimeboxElement.textContent = copy.teachingTimebox;
  teachingStopHereElement.textContent = copy.teachingStopHere;
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
  roomPanelSummaryElement.hidden = !access.canManageScenario;
  roomLecturerControlsPanel.hidden = controlsClaimedByOtherDevice;
  roomLecturerActionButtons.hidden = controlsClaimedByOtherDevice;

  roomClaimLecturerButton.disabled = access.canManageScenario;
  roomClaimLecturerButton.setAttribute("aria-disabled", String(access.canManageScenario));
  roomClaimLecturerButton.classList.toggle("opacity-60", access.canManageScenario);
  roomClaimLecturerButton.textContent = access.canManageScenario ? "Lecturer controls active" : "Claim lecturer controls";

  roomReleaseLecturerButton.hidden = !access.canManageScenario;
  roomReleaseLecturerButton.disabled = !access.canManageScenario;
  roomReleaseLecturerButton.setAttribute("aria-disabled", String(!access.canManageScenario));

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

  roomReadyStatusElement.textContent = access.canManageScenario
    ? state.activeScenario === "baseline" && state.query === defaultQuery
      ? "Ready check: baseline loaded, lecturer controls active, focus mode " + (simpleModeActive ? "on." : "off.")
      : "Ready check: reset room before the next run if you want the default baseline."
    : access.presenterClaimed
      ? "Ready check: waiting for the lecturer device."
      : "Ready check: claim lecturer controls before starting.";

  renderContextPanel();
}

function sendCommand(command: any): Promise<ClientSnapshot | null> {
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

function renderToggleGroup(
  options: readonly any[],
  selectedId: string,
  container: HTMLElement,
  onSelect: (selectedId: string) => void,
  interaction: { canInteract: boolean; lockedMessage: string } | null = null,
): void {
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

function renderAudiencePresets(scenario: ClientScenarioId): void {
  clearAudiencePresets();

  if (scenario === "baseline") {
    return;
  }

  const audienceState = getAudienceState(scenario);
  const access = getRoomAccess();
  const localPresetIds = new Set(localVoteState[scenario] || []);
  const groupedPresets: { id: string; label: string; presets: any[] }[] = [];
  const groupIndexById = new Map<string, number>();

  for (const preset of getVisiblePresets(scenario)) {
    if (!groupIndexById.has(preset.voteGroupId)) {
      groupIndexById.set(preset.voteGroupId, groupedPresets.length);
      groupedPresets.push({
        id: preset.voteGroupId,
        label: preset.voteGroupLabel,
        presets: [],
      });
    }

    const groupIndex = groupIndexById.get(preset.voteGroupId);
    if (groupIndex !== undefined) {
      groupedPresets[groupIndex]?.presets.push(preset);
    }
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
      voteButton.textContent =
        preset.label +
        (preset.recommended ? " · Suggested path" : "") +
        " · " +
        formatVoteCount(voteCount) +
        (isOverride ? " · Lecturer choice" : "");
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

function getVisiblePresets(scenario: ClientScenarioId): readonly any[] {
  return scenarios[scenario].presets;
}

function handlePresetVote(scenario: ClientChallengeId, preset: any): void {
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

function renderResults(results: any[], scenario: ClientScenarioId): void {
  clearResults();

  for (const result of results) {
    const item = document.createElement("li");
    item.className = "scroll-mt-80 rounded-[1.35rem] border border-app-line bg-app-canvas px-4 py-4 sm:px-5 lg:scroll-mt-[24rem]";

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

    if (scenario === "challenge-3" && result.tradeoff) {
      const tradeoffPanel = document.createElement("section");
      tradeoffPanel.className = "rounded-[1rem] border border-app-line bg-white px-3 py-3 text-sm leading-6 text-app-text";

      const tradeoffTitle = document.createElement("p");
      tradeoffTitle.className = "text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-secondary";
      tradeoffTitle.textContent = "Trade-off";

      const gain = document.createElement("p");
      gain.className = "mt-2";
      gain.textContent = "Gains: " + result.tradeoff.gain;

      const givesUp = document.createElement("p");
      givesUp.className = "mt-1 text-app-text-soft";
      givesUp.textContent = "Gives up: " + result.tradeoff.givesUp;

      tradeoffPanel.append(tradeoffTitle, gain, givesUp);
      details.appendChild(tradeoffPanel);
    }

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

function applyScenario(nextScenario: ClientScenarioId): void {
  activeScenario = nextScenario;
  const copy = scenarios[nextScenario];
  const access = getRoomAccess();
  const state = getRoomState();
  const visibleScenarioIds = getVisibleScenarioIds(access, state);

  scenarioTitleElement.textContent = copy.title;
  scenarioDescriptionElement.textContent = copy.description;
  insightsLabelElement.textContent = copy.insightLabel;
  audienceControls.classList.toggle("hidden", nextScenario === "baseline");
  audienceCustomField.hidden = nextScenario === "baseline";
  audiencePromptElement.textContent = copy.audiencePrompt;
  audienceSummaryLabelElement.textContent = copy.audienceSummaryLabel;
  audienceLabel.textContent = copy.audienceLabel;
  audienceCustomInput.placeholder = copy.audiencePlaceholder;
  renderTeachingGuide(nextScenario);

  for (const button of scenarioButtons) {
    const isActive = button.dataset.scenario === nextScenario;
    const scenarioId = button.dataset.scenario || "baseline";
    const isVisible = visibleScenarioIds.has(scenarioId as ClientScenarioId);
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
  renderRequirementsLearned();
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

function renderRoomJoinControl() {
  roomJoinButton.hidden = sanitizeRoomId(roomIdInput.value) === activeRoomId;
}

function syncViewportDefaults() {
  if (compactViewportQuery.matches && roomPanelOpen) {
    roomPanelOpen = false;
    renderRoomPanel();
  }
}

function renderSearchSnapshot(snapshot: ClientSnapshot): void {
  const state = snapshot.state;
  const search = snapshot.search;
  const query = state.query.trim();

  if (!query) {
    clearResults();
    clearChangeStrip();
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

function applySnapshot(snapshot: ClientSnapshot): void {
  if (activeSnapshot && snapshot.state.version < activeSnapshot.state.version) {
    return;
  }

  const previousSnapshot = activeSnapshot;
  activeSnapshot = snapshot;
  syncLocalVotesWithSnapshot(snapshot, previousSnapshot);
  setRoomParticipantCount(snapshot.participantCount || 1);

  if (pendingQueryDraft !== null && snapshot.state.query === pendingQueryDraft) {
    pendingQueryDraft = null;
  }

  if (pendingAudienceDraft && snapshot.state.audienceByChallenge[pendingAudienceDraft.scenario].customText === pendingAudienceDraft.value) {
    pendingAudienceDraft = null;
  }

  if (pendingQueryDraft === null) {
    queryInput.value = snapshot.state.query;
  } else {
    queryInput.value = pendingQueryDraft;
  }

  roomIdInput.value = snapshot.roomId;
  renderRoomJoinControl();
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
  pollHandle = undefined;
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
  reconnectHandle = undefined;

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

async function fetchSessionSnapshot(roomId: string): Promise<ClientSnapshot> {
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

async function joinRoom(nextRoomId: string): Promise<void> {
  const roomId = sanitizeRoomId(nextRoomId);
  closeLiveSync();
  activePresenterToken = readStoredPresenterToken(roomId) || "";
  localVoteState = readLocalVoteState(roomId);
  activeRoomId = roomId;
  roomIdInput.value = roomId;
  renderRoomJoinControl();
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

async function releaseLecturerControls() {
  if (!getRoomAccess().canManageScenario) {
    setStatus("Only the lecturer can release this room.");
    return;
  }

  const snapshot = await sendCommand({ type: "release-presenter" });
  if (!snapshot) {
    return;
  }

  activePresenterToken = "";
  persistPresenterToken(activeRoomId, "");
  closeLiveSync();
  openLiveSync();
  applySnapshot(snapshot);
  setStatus("Lecturer controls released.");
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
  localVoteState = createEmptyVoteState();
  persistLocalVoteState(activeRoomId);
  closeLiveSync();
  openLiveSync();
  applySnapshot(snapshot);
  setStatus("Room reset. Lecturer controls remain active.");
}

function flashCopyButton(message: string): void {
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

roomReleaseLecturerButton.addEventListener("click", () => {
  void releaseLecturerControls();
});

roomSimpleModeButton.addEventListener("click", () => {
  if (!getRoomAccess().canManageScenario) {
    setStatus("Claim lecturer controls to use focus mode.");
    return;
  }

  const nextFocusMode = !isSimpleModeActive();
  sendCommand({ type: "set-focus-mode", focusMode: nextFocusMode }).then((snapshot) => {
    if (snapshot) {
      setStatus(nextFocusMode ? "Focus mode on." : "Focus mode off.");
    }
  });
});

audienceResetButton.addEventListener("click", () => {
  void resetCurrentChallengeVotes();
});

roomJoinButton.addEventListener("click", () => {
  void joinRoom(roomIdInput.value);
});

roomIdInput.addEventListener("input", () => {
  renderRoomJoinControl();
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
  if (isSimpleModeActive()) {
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

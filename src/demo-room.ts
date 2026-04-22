import type { ShopState, SimulationSeason } from "./cheese/catalog";
import { MINIMUM_QUERY_LENGTH, searchDemoCatalog, type DemoSearchResponse } from "./cheese/demo";
import {
  DEFAULT_QUERY,
  DEFAULT_ROOM_ID,
  challengeSequence,
  isDemoChallengeId,
  isDemoScenarioId,
  isSearchBackend,
  isShopState,
  isSimulationSeason,
  scenarioCopy,
  sanitizeRoomId,
  seasonOptions,
  shopStateOptions,
  type DemoChallengeId,
  type DemoScenarioId,
  type SearchBackend,
} from "./demo-config";

export interface DemoAudienceState {
  selectedPresetIds: string[];
  customText: string;
}

export interface DemoRoomState {
  roomId: string;
  version: number;
  query: string;
  activeScenario: DemoScenarioId;
  audienceByChallenge: Record<DemoChallengeId, DemoAudienceState>;
  season: SimulationSeason | "";
  shopState: ShopState | "";
  backend: SearchBackend;
  updatedAt: string;
}

export interface DemoRoomRecord {
  state: DemoRoomState;
  presenterToken: string | null;
}

export interface DemoRoomAccess {
  presenterClaimed: boolean;
  canManageQuery: boolean;
  canManageScenario: boolean;
}

export type DemoRoomCommand =
  | { type: "claim-presenter" }
  | { type: "set-query"; query: string }
  | { type: "set-scenario"; scenario: DemoScenarioId }
  | { type: "toggle-preset"; scenario: DemoChallengeId; presetId: string }
  | { type: "set-custom-text"; scenario: DemoChallengeId; customText: string }
  | { type: "set-season"; season: SimulationSeason | "" }
  | { type: "set-shop-state"; shopState: ShopState | "" }
  | { type: "set-backend"; backend: SearchBackend }
  | { type: "reset-room" };

export interface DemoRoomSnapshot {
  roomId: string;
  participantCount: number;
  state: DemoRoomState;
  search: DemoSearchResponse | null;
  access: DemoRoomAccess;
}

export interface ApplyRoomCommandResult {
  ok: boolean;
  record: DemoRoomRecord;
  error?: string;
}

const emptyAudienceState = (): DemoAudienceState => ({
  selectedPresetIds: [],
  customText: "",
});

export function createDefaultRoomState(roomId = DEFAULT_ROOM_ID): DemoRoomState {
  return {
    roomId: sanitizeRoomId(roomId),
    version: 1,
    query: DEFAULT_QUERY,
    activeScenario: "baseline",
    audienceByChallenge: {
      "challenge-1": emptyAudienceState(),
      "challenge-2": emptyAudienceState(),
      "challenge-3": emptyAudienceState(),
    },
    season: "",
    shopState: "",
    backend: "rules",
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultRoomRecord(roomId = DEFAULT_ROOM_ID): DemoRoomRecord {
  return {
    state: createDefaultRoomState(roomId),
    presenterToken: null,
  };
}

export function normalizeRoomState(candidate: unknown, roomId = DEFAULT_ROOM_ID): DemoRoomState {
  if (!candidate || typeof candidate !== "object") {
    return createDefaultRoomState(roomId);
  }

  const raw = candidate as Partial<DemoRoomState>;
  const nextState = createDefaultRoomState(roomId);

  if (typeof raw.query === "string") {
    nextState.query = raw.query;
  }

  if (typeof raw.roomId === "string" && raw.roomId) {
    nextState.roomId = sanitizeRoomId(raw.roomId);
  }

  if (isDemoScenarioId(raw.activeScenario)) {
    nextState.activeScenario = raw.activeScenario;
  }

  if (raw.audienceByChallenge && typeof raw.audienceByChallenge === "object") {
    for (const challengeId of challengeSequence) {
      const rawAudience = raw.audienceByChallenge[challengeId];
      if (!rawAudience || typeof rawAudience !== "object") {
        continue;
      }

      const allowedPresetIds = new Set(scenarioCopy[challengeId].presets.map((preset) => preset.id));
      nextState.audienceByChallenge[challengeId] = {
        selectedPresetIds: Array.isArray(rawAudience.selectedPresetIds)
          ? rawAudience.selectedPresetIds.filter(
              (presetId): presetId is string => typeof presetId === "string" && allowedPresetIds.has(presetId),
            )
          : [],
        customText: typeof rawAudience.customText === "string" ? rawAudience.customText : "",
      };
    }
  }

  if (isSimulationSeason(raw.season)) {
    nextState.season = raw.season;
  }

  if (isShopState(raw.shopState)) {
    nextState.shopState = raw.shopState;
  }

  if (isSearchBackend(raw.backend)) {
    nextState.backend = raw.backend;
  }

  if (typeof raw.version === "number" && Number.isFinite(raw.version) && raw.version >= 1) {
    nextState.version = raw.version;
  }

  if (typeof raw.updatedAt === "string" && raw.updatedAt) {
    nextState.updatedAt = raw.updatedAt;
  }

  return nextState;
}

export function normalizeRoomRecord(candidate: unknown, roomId = DEFAULT_ROOM_ID): DemoRoomRecord {
  if (!candidate || typeof candidate !== "object") {
    return createDefaultRoomRecord(roomId);
  }

  const raw = candidate as Partial<DemoRoomRecord> & Partial<DemoRoomState>;

  if ("state" in raw && raw.state && typeof raw.state === "object") {
    return {
      state: normalizeRoomState(raw.state, roomId),
      presenterToken: typeof raw.presenterToken === "string" && raw.presenterToken ? raw.presenterToken : null,
    };
  }

  return {
    state: normalizeRoomState(candidate, roomId),
    presenterToken: null,
  };
}

export function applyRoomCommand(record: DemoRoomRecord, command: DemoRoomCommand, presenterToken: string | null): ApplyRoomCommandResult {
  if (command.type === "claim-presenter") {
    if (!presenterToken) {
      return {
        ok: false,
        error: "Presenter token is required to claim lecturer controls.",
        record,
      };
    }

    if (record.presenterToken && record.presenterToken !== presenterToken) {
      return {
        ok: false,
        error: "Lecturer controls are already claimed for this room.",
        record,
      };
    }

    return {
      ok: true,
      record: {
        ...record,
        presenterToken,
      },
    };
  }

  if (requiresPresenterControl(command) && (!record.presenterToken || record.presenterToken !== presenterToken)) {
    return {
      ok: false,
      error: presenterControlError(command, Boolean(record.presenterToken)),
      record,
    };
  }

  const nextState = applyRoomStateCommand(record.state, command);

  return {
    ok: true,
    record: {
      ...record,
      state: nextState,
    },
  };
}

function applyRoomStateCommand(state: DemoRoomState, command: Exclude<DemoRoomCommand, { type: "claim-presenter" }>): DemoRoomState {
  if (command.type === "reset-room") {
    return bumpVersion(createDefaultRoomState(state.roomId));
  }

  if (command.type === "set-query") {
    return bumpVersion({
      ...state,
      query: command.query,
    });
  }

  if (command.type === "set-scenario") {
    return bumpVersion({
      ...state,
      activeScenario: command.scenario,
    });
  }

  if (command.type === "toggle-preset") {
    const audienceState = state.audienceByChallenge[command.scenario];
    const allowedPresetIds = new Set(scenarioCopy[command.scenario].presets.map((preset) => preset.id));

    if (!allowedPresetIds.has(command.presetId)) {
      return state;
    }

    const selectedPresetIds = audienceState.selectedPresetIds.includes(command.presetId)
      ? audienceState.selectedPresetIds.filter((presetId) => presetId !== command.presetId)
      : [...audienceState.selectedPresetIds, command.presetId];

    return bumpVersion({
      ...state,
      audienceByChallenge: {
        ...state.audienceByChallenge,
        [command.scenario]: {
          ...audienceState,
          selectedPresetIds,
        },
      },
    });
  }

  if (command.type === "set-custom-text") {
    return bumpVersion({
      ...state,
      audienceByChallenge: {
        ...state.audienceByChallenge,
        [command.scenario]: {
          ...state.audienceByChallenge[command.scenario],
          customText: command.customText,
        },
      },
    });
  }

  if (command.type === "set-season") {
    return bumpVersion({
      ...state,
      season: command.season,
    });
  }

  if (command.type === "set-shop-state") {
    return bumpVersion({
      ...state,
      shopState: command.shopState,
    });
  }

  return bumpVersion({
    ...state,
    backend: command.backend,
  });
}

export function readRoomCommand(payload: unknown): DemoRoomCommand | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;

  if (raw.type === "claim-presenter") {
    return { type: "claim-presenter" };
  }

  if (raw.type === "set-query" && typeof raw.query === "string") {
    return { type: "set-query", query: raw.query };
  }

  const scenario = asString(raw.scenario);
  if (raw.type === "set-scenario" && isDemoScenarioId(scenario)) {
    return { type: "set-scenario", scenario };
  }

  const challengeScenario = asString(raw.scenario);
  if (raw.type === "toggle-preset" && isDemoChallengeId(challengeScenario) && typeof raw.presetId === "string") {
    return { type: "toggle-preset", scenario: challengeScenario, presetId: raw.presetId };
  }

  if (raw.type === "set-custom-text" && isDemoChallengeId(challengeScenario) && typeof raw.customText === "string") {
    return { type: "set-custom-text", scenario: challengeScenario, customText: raw.customText };
  }

  if (raw.type === "set-season") {
    const season = asString(raw.season);
    if (season === "" || isSimulationSeason(season)) {
      return { type: "set-season", season };
    }
  }

  if (raw.type === "set-shop-state") {
    const shopState = asString(raw.shopState);
    if (shopState === "" || isShopState(shopState)) {
      return { type: "set-shop-state", shopState };
    }
  }

  const backend = asString(raw.backend);
  if (raw.type === "set-backend" && isSearchBackend(backend)) {
    return { type: "set-backend", backend };
  }

  if (raw.type === "reset-room") {
    return { type: "reset-room" };
  }

  return null;
}

export function buildRoomSnapshot(
  record: DemoRoomRecord,
  participantCount: number,
  presenterToken: string | null = null,
): DemoRoomSnapshot {
  const state = record.state;
  const query = state.query.trim();
  const audienceInput = buildAudienceInput(state, state.activeScenario);
  const search =
    query.length >= MINIMUM_QUERY_LENGTH
      ? searchDemoCatalog({
          query,
          scenario: state.activeScenario,
          audienceInput,
          season: state.season,
          shopState: state.shopState,
          backend: state.backend,
        })
      : null;

  return {
    roomId: state.roomId,
    participantCount,
    state,
    search,
    access: {
      presenterClaimed: Boolean(record.presenterToken),
      canManageQuery: Boolean(record.presenterToken && presenterToken === record.presenterToken),
      canManageScenario: Boolean(record.presenterToken && presenterToken === record.presenterToken),
    },
  };
}

export function buildAudienceInput(state: DemoRoomState, scenario: DemoScenarioId): string {
  return buildAccumulatedAudienceParts(state, scenario, (preset) => preset.value).join(". ");
}

export function buildAudienceSummaryItems(state: DemoRoomState, scenario: DemoScenarioId): string[] {
  return buildAccumulatedAudienceParts(state, scenario, (preset) => preset.label);
}

export function buildContextSummaryItems(state: DemoRoomState): string[] {
  const items: string[] = [];
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

function buildAccumulatedAudienceParts(
  state: DemoRoomState,
  scenario: DemoScenarioId,
  valueSelector: (preset: (typeof scenarioCopy)[DemoChallengeId]["presets"][number]) => string,
): string[] {
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const scenarioId of getScenarioTrail(scenario)) {
    const audienceState = state.audienceByChallenge[scenarioId];
    const selectedPresets = scenarioCopy[scenarioId].presets.filter((preset) => audienceState.selectedPresetIds.includes(preset.id));

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

function getScenarioTrail(scenario: DemoScenarioId): readonly DemoChallengeId[] {
  const scenarioIndex = challengeSequence.indexOf(scenario as DemoChallengeId);
  return scenarioIndex >= 0 ? challengeSequence.slice(0, scenarioIndex + 1) : [];
}

function bumpVersion(state: DemoRoomState): DemoRoomState {
  return {
    ...state,
    version: state.version + 1,
    updatedAt: new Date().toISOString(),
  };
}

function requiresPresenterControl(command: Exclude<DemoRoomCommand, { type: "claim-presenter" }>): boolean {
  return command.type === "set-query" || command.type === "set-scenario" || command.type === "reset-room";
}

function presenterControlError(command: Exclude<DemoRoomCommand, { type: "claim-presenter" }>, presenterClaimed: boolean): string {
  if (command.type === "set-query") {
    return presenterClaimed
      ? "Only the lecturer can change the shared search query for this room."
      : "Lecturer controls must be claimed before the shared search query can change.";
  }

  if (command.type === "reset-room") {
    return presenterClaimed ? "Only the lecturer can reset this room." : "Lecturer controls must be claimed before this room can reset.";
  }

  return presenterClaimed
    ? "Only the lecturer can change the active challenge for this room."
    : "Lecturer controls must be claimed before the active challenge can change.";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

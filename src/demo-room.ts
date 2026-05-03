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
  votesByPresetId: Record<string, number>;
  lecturerOverridePresetIds: string[];
  customText: string;
}

export interface DemoRoomState {
  roomId: string;
  version: number;
  query: string;
  activeScenario: DemoScenarioId;
  revealedChallengeIds: DemoChallengeId[];
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
  canManageContext: boolean;
  canManageScenario: boolean;
}

export type DemoRoomCommand =
  | { type: "claim-presenter" }
  | { type: "set-query"; query: string }
  | { type: "set-scenario"; scenario: DemoScenarioId }
  | { type: "advance-scenario" }
  | { type: "toggle-preset"; scenario: DemoChallengeId; presetId: string }
  | { type: "cast-preset-vote"; scenario: DemoChallengeId; presetId: string; voteDelta: 1 | -1 }
  | { type: "toggle-preset-override"; scenario: DemoChallengeId; presetId: string }
  | { type: "reset-challenge"; scenario: DemoChallengeId }
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
  votesByPresetId: {},
  lecturerOverridePresetIds: [],
  customText: "",
});

export function createDefaultRoomState(roomId = DEFAULT_ROOM_ID): DemoRoomState {
  return {
    roomId: sanitizeRoomId(roomId),
    version: 1,
    query: DEFAULT_QUERY,
    activeScenario: "baseline",
    revealedChallengeIds: [],
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

  if (Array.isArray(raw.revealedChallengeIds)) {
    nextState.revealedChallengeIds = raw.revealedChallengeIds.filter(isDemoChallengeId);
  }
  nextState.revealedChallengeIds = revealThroughScenario(nextState.revealedChallengeIds, nextState.activeScenario);

  if (raw.audienceByChallenge && typeof raw.audienceByChallenge === "object") {
    for (const challengeId of challengeSequence) {
      const rawAudience = raw.audienceByChallenge[challengeId];
      if (!rawAudience || typeof rawAudience !== "object") {
        continue;
      }

      const allowedPresetIds = new Set(scenarioCopy[challengeId].presets.map((preset) => preset.id));
      const normalizedVotesByPresetId = normalizeVotesByPresetId(rawAudience.votesByPresetId, allowedPresetIds);
      const lecturerOverridePresetIds = Array.isArray(rawAudience.lecturerOverridePresetIds)
        ? rawAudience.lecturerOverridePresetIds.filter(
            (presetId): presetId is string => typeof presetId === "string" && allowedPresetIds.has(presetId),
          )
        : [];
      const legacySelectedPresetIds = Array.isArray(rawAudience.selectedPresetIds)
        ? rawAudience.selectedPresetIds.filter(
            (presetId): presetId is string => typeof presetId === "string" && allowedPresetIds.has(presetId),
          )
        : [];
      const votesByPresetId =
        Object.keys(normalizedVotesByPresetId).length > 0
          ? normalizedVotesByPresetId
          : Object.fromEntries(legacySelectedPresetIds.map((presetId) => [presetId, 1]));
      const normalizedAudienceState = {
        votesByPresetId,
        lecturerOverridePresetIds,
        selectedPresetIds: [],
        customText: typeof rawAudience.customText === "string" ? rawAudience.customText : "",
      };
      nextState.audienceByChallenge[challengeId] = {
        ...normalizedAudienceState,
        selectedPresetIds: resolveSelectedPresetIds(challengeId, normalizedAudienceState),
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

  if (command.type === "reset-room") {
    return {
      ok: true,
      record: {
        state: createResetRoomState(record.state),
        presenterToken: record.presenterToken,
      },
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

function applyRoomStateCommand(
  state: DemoRoomState,
  command: Exclude<DemoRoomCommand, { type: "claim-presenter" } | { type: "reset-room" }>,
): DemoRoomState {
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
      revealedChallengeIds: revealThroughScenario(state.revealedChallengeIds, command.scenario),
    });
  }

  if (command.type === "advance-scenario") {
    const nextScenario = getNextScenario(state.activeScenario);

    if (nextScenario === state.activeScenario) {
      return state;
    }

    return bumpVersion({
      ...state,
      activeScenario: nextScenario,
      revealedChallengeIds: revealThroughScenario(state.revealedChallengeIds, nextScenario),
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

    const votesByPresetId = Object.fromEntries(selectedPresetIds.map((presetId) => [presetId, 1]));
    const nextAudienceState = {
      ...audienceState,
      selectedPresetIds,
      votesByPresetId,
      lecturerOverridePresetIds: [],
    };

    return bumpVersion({
      ...state,
      audienceByChallenge: {
        ...state.audienceByChallenge,
        [command.scenario]: nextAudienceState,
      },
    });
  }

  if (command.type === "cast-preset-vote") {
    const audienceState = state.audienceByChallenge[command.scenario];
    const allowedPresetIds = new Set(scenarioCopy[command.scenario].presets.map((preset) => preset.id));

    if (!allowedPresetIds.has(command.presetId)) {
      return state;
    }

    const currentVotes = audienceState.votesByPresetId[command.presetId] ?? 0;
    const nextVotes = Math.max(0, currentVotes + command.voteDelta);
    const votesByPresetId = {
      ...audienceState.votesByPresetId,
      [command.presetId]: nextVotes,
    };
    if (nextVotes === 0) {
      delete votesByPresetId[command.presetId];
    }

    const nextAudienceState = {
      ...audienceState,
      votesByPresetId,
    };

    return bumpVersion({
      ...state,
      audienceByChallenge: {
        ...state.audienceByChallenge,
        [command.scenario]: {
          ...nextAudienceState,
          selectedPresetIds: resolveSelectedPresetIds(command.scenario, nextAudienceState),
        },
      },
    });
  }

  if (command.type === "toggle-preset-override") {
    const audienceState = state.audienceByChallenge[command.scenario];
    const presets = scenarioCopy[command.scenario].presets;
    const preset = presets.find((candidate) => candidate.id === command.presetId);

    if (!preset) {
      return state;
    }

    const overrideSet = new Set(audienceState.lecturerOverridePresetIds);
    if (overrideSet.has(command.presetId)) {
      overrideSet.delete(command.presetId);
    } else {
      for (const option of presets) {
        if (option.voteGroupId === preset.voteGroupId) {
          overrideSet.delete(option.id);
        }
      }
      overrideSet.add(command.presetId);
    }

    const nextAudienceState = {
      ...audienceState,
      lecturerOverridePresetIds: [...overrideSet],
    };

    return bumpVersion({
      ...state,
      audienceByChallenge: {
        ...state.audienceByChallenge,
        [command.scenario]: {
          ...nextAudienceState,
          selectedPresetIds: resolveSelectedPresetIds(command.scenario, nextAudienceState),
        },
      },
    });
  }

  if (command.type === "reset-challenge") {
    return bumpVersion({
      ...state,
      audienceByChallenge: {
        ...state.audienceByChallenge,
        [command.scenario]: emptyAudienceState(),
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

function createResetRoomState(state: DemoRoomState): DemoRoomState {
  return {
    ...createDefaultRoomState(state.roomId),
    version: state.version + 1,
    updatedAt: new Date().toISOString(),
  };
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

  if (raw.type === "advance-scenario") {
    return { type: "advance-scenario" };
  }

  const challengeScenario = asString(raw.scenario);
  if (raw.type === "toggle-preset" && isDemoChallengeId(challengeScenario) && typeof raw.presetId === "string") {
    return { type: "toggle-preset", scenario: challengeScenario, presetId: raw.presetId };
  }

  if (raw.type === "cast-preset-vote" && isDemoChallengeId(challengeScenario) && typeof raw.presetId === "string") {
    const voteDelta = raw.voteDelta === -1 ? -1 : raw.voteDelta === 1 ? 1 : null;
    if (voteDelta) {
      return { type: "cast-preset-vote", scenario: challengeScenario, presetId: raw.presetId, voteDelta };
    }
  }

  if (raw.type === "toggle-preset-override" && isDemoChallengeId(challengeScenario) && typeof raw.presetId === "string") {
    return { type: "toggle-preset-override", scenario: challengeScenario, presetId: raw.presetId };
  }

  if (raw.type === "reset-challenge" && isDemoChallengeId(challengeScenario)) {
    return { type: "reset-challenge", scenario: challengeScenario };
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
      canManageContext: Boolean(record.presenterToken && presenterToken === record.presenterToken),
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

function getNextScenario(scenario: DemoScenarioId): DemoScenarioId {
  if (scenario === "baseline") {
    return "challenge-1";
  }

  const scenarioIndex = challengeSequence.indexOf(scenario);
  return challengeSequence[scenarioIndex + 1] ?? scenario;
}

function revealThroughScenario(revealedChallengeIds: DemoChallengeId[], scenario: DemoScenarioId): DemoChallengeId[] {
  if (scenario === "baseline") {
    return revealedChallengeIds;
  }

  const scenarioIndex = challengeSequence.indexOf(scenario);
  if (scenarioIndex < 0) {
    return revealedChallengeIds;
  }

  return [...new Set([...revealedChallengeIds, ...challengeSequence.slice(0, scenarioIndex + 1)])];
}

function normalizeVotesByPresetId(candidate: unknown, allowedPresetIds: Set<string>): Record<string, number> {
  if (!candidate || typeof candidate !== "object") {
    return {};
  }

  const votesByPresetId: Record<string, number> = {};
  for (const [presetId, rawCount] of Object.entries(candidate)) {
    if (!allowedPresetIds.has(presetId) || typeof rawCount !== "number" || !Number.isFinite(rawCount) || rawCount <= 0) {
      continue;
    }

    votesByPresetId[presetId] = Math.floor(rawCount);
  }

  return votesByPresetId;
}

function resolveSelectedPresetIds(
  scenario: DemoChallengeId,
  audienceState: Pick<DemoAudienceState, "votesByPresetId" | "lecturerOverridePresetIds">,
): string[] {
  const selectedPresetIds: string[] = [];
  const presetsByGroup = new Map<string, (typeof scenarioCopy)[DemoChallengeId]["presets"][number][]>();

  for (const preset of scenarioCopy[scenario].presets) {
    const group = presetsByGroup.get(preset.voteGroupId) ?? [];
    group.push(preset);
    presetsByGroup.set(preset.voteGroupId, group);
  }

  for (const presets of presetsByGroup.values()) {
    const overrideIds = presets.map((preset) => preset.id).filter((presetId) => audienceState.lecturerOverridePresetIds.includes(presetId));
    if (overrideIds.length > 0) {
      selectedPresetIds.push(...overrideIds);
      continue;
    }

    const maxVotes = Math.max(...presets.map((preset) => audienceState.votesByPresetId[preset.id] ?? 0));
    if (maxVotes <= 0) {
      continue;
    }

    selectedPresetIds.push(
      ...presets.filter((preset) => (audienceState.votesByPresetId[preset.id] ?? 0) === maxVotes).map((preset) => preset.id),
    );
  }

  return selectedPresetIds;
}

function bumpVersion(state: DemoRoomState): DemoRoomState {
  return {
    ...state,
    version: state.version + 1,
    updatedAt: new Date().toISOString(),
  };
}

function requiresPresenterControl(command: Exclude<DemoRoomCommand, { type: "claim-presenter" }>): boolean {
  return (
    command.type === "set-query" ||
    command.type === "set-scenario" ||
    command.type === "advance-scenario" ||
    command.type === "toggle-preset-override" ||
    command.type === "reset-challenge" ||
    command.type === "set-season" ||
    command.type === "set-shop-state" ||
    command.type === "reset-room"
  );
}

function presenterControlError(command: Exclude<DemoRoomCommand, { type: "claim-presenter" }>, presenterClaimed: boolean): string {
  if (command.type === "set-query") {
    return presenterClaimed
      ? "Only the lecturer can change the shared search query for this room."
      : "Lecturer controls must be claimed before the shared search query can change.";
  }

  if (command.type === "set-season" || command.type === "set-shop-state") {
    return presenterClaimed
      ? "Only the lecturer can change the shared world context for this room."
      : "Lecturer controls must be claimed before the shared world context can change.";
  }

  if (command.type === "reset-room") {
    return presenterClaimed ? "Only the lecturer can reset this room." : "Lecturer controls must be claimed before this room can reset.";
  }

  if (command.type === "advance-scenario") {
    return presenterClaimed
      ? "Only the lecturer can reveal the next challenge for this room."
      : "Lecturer controls must be claimed before revealing the next challenge.";
  }

  if (command.type === "toggle-preset-override") {
    return presenterClaimed
      ? "Only the lecturer can override the audience vote for this room."
      : "Lecturer controls must be claimed before overriding the audience vote.";
  }

  if (command.type === "reset-challenge") {
    return presenterClaimed
      ? "Only the lecturer can clear challenge votes for this room."
      : "Lecturer controls must be claimed before clearing challenge votes.";
  }

  return presenterClaimed
    ? "Only the lecturer can change the active challenge for this room."
    : "Lecturer controls must be claimed before the active challenge can change.";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

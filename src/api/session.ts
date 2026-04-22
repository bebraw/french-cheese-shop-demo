import {
  applyRoomCommand,
  buildRoomSnapshot,
  createDefaultRoomRecord,
  normalizeRoomRecord,
  readRoomCommand,
  type DemoRoomSnapshot,
  type DemoRoomRecord,
} from "../demo-room";
import { isDemoScenarioId, isSearchBackend, isShopState, isSimulationSeason, sanitizeRoomId } from "../demo-config";
import { jsonResponse } from "../views/shared";

const invalidCommandMessage = "Session command is invalid.";
const presenterHeaderName = "x-demo-presenter-token";

interface DurableObjectStubLike {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespaceLike {
  get(id: unknown): DurableObjectStubLike;
  idFromName(name: string): unknown;
}

export interface SessionEnv {
  DEMO_ROOMS?: DurableObjectNamespaceLike;
}

const inMemoryRooms = new Map<string, DemoRoomRecord>();

export async function createSessionResponse(request: Request, env?: SessionEnv): Promise<Response> {
  const url = new URL(request.url);
  const roomId = sanitizeRoomId(url.searchParams.get("room"));

  if (env?.DEMO_ROOMS) {
    return forwardRoomRequest(env.DEMO_ROOMS, roomId, request, "/internal/session");
  }

  if (request.method === "GET") {
    return jsonResponse(readInMemorySnapshot(roomId, request));
  }

  if (request.method === "POST") {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: invalidCommandMessage }, { status: 400 });
    }

    const command = readRoomCommand(payload);
    if (!command) {
      return jsonResponse({ ok: false, error: invalidCommandMessage }, { status: 400 });
    }

    const result = applyRoomCommand(readInMemoryRecord(roomId, request), command, readPresenterToken(request));
    if (!result.ok) {
      return jsonResponse({ ok: false, error: result.error }, { status: 403 });
    }

    inMemoryRooms.set(roomId, result.record);
    return jsonResponse({ ok: true, snapshot: buildRoomSnapshot(result.record, 1, readPresenterToken(request)) });
  }

  return jsonResponse({ ok: false, error: "Method not allowed." }, { status: 405 });
}

export async function createSessionLiveResponse(request: Request, env?: SessionEnv): Promise<Response> {
  const url = new URL(request.url);
  const roomId = sanitizeRoomId(url.searchParams.get("room"));

  if (!env?.DEMO_ROOMS) {
    return jsonResponse({ ok: false, error: "Live sync is unavailable in this runtime." }, { status: 501 });
  }

  return forwardRoomRequest(env.DEMO_ROOMS, roomId, request, "/internal/session/live");
}

function readInMemorySnapshot(roomId: string, request: Request): DemoRoomSnapshot {
  return buildRoomSnapshot(readInMemoryRecord(roomId, request), 1, readPresenterToken(request));
}

function readInMemoryRecord(roomId: string, request: Request): DemoRoomRecord {
  const currentRecord = inMemoryRooms.get(roomId);
  if (currentRecord) {
    return currentRecord;
  }

  const seededRecord = seedRoomRecord(roomId, request);
  inMemoryRooms.set(roomId, seededRecord);
  return seededRecord;
}

function seedRoomRecord(roomId: string, request: Request): DemoRoomRecord {
  const url = new URL(request.url);
  const seededRecord = createDefaultRoomRecord(roomId);
  const seededState = seededRecord.state;
  const query = url.searchParams.get("q");
  const scenario = url.searchParams.get("scenario");
  const audience = url.searchParams.get("audience");
  const season = url.searchParams.get("season");
  const shopState = url.searchParams.get("shopState");
  const backend = url.searchParams.get("backend");

  if (typeof query === "string" && query.trim()) {
    seededState.query = query;
  }

  if (isDemoScenarioId(scenario)) {
    seededState.activeScenario = scenario;
  }

  if (typeof audience === "string" && audience.trim() && seededState.activeScenario !== "baseline") {
    seededState.audienceByChallenge[seededState.activeScenario].customText = audience;
  }

  if (isSimulationSeason(season)) {
    seededState.season = season;
  }

  if (isShopState(shopState)) {
    seededState.shopState = shopState;
  }

  if (isSearchBackend(backend)) {
    seededState.backend = backend;
  }

  return normalizeRoomRecord(seededRecord, roomId);
}

async function forwardRoomRequest(
  namespace: DurableObjectNamespaceLike,
  roomId: string,
  request: Request,
  pathname: string,
): Promise<Response> {
  const roomIdRef = namespace.idFromName(roomId);
  const stub = namespace.get(roomIdRef);
  const originalUrl = new URL(request.url);
  const targetUrl = new URL(`https://demo-room${pathname}`);
  targetUrl.searchParams.set("room", roomId);

  for (const [key, value] of originalUrl.searchParams) {
    if (key === "room") {
      continue;
    }

    targetUrl.searchParams.append(key, value);
  }

  const forwardedRequest = new Request(targetUrl.toString(), request);
  return await stub.fetch(forwardedRequest);
}

function readPresenterToken(request: Request): string | null {
  const url = new URL(request.url);
  const token = request.headers.get(presenterHeaderName)?.trim() ?? url.searchParams.get("presenter")?.trim() ?? "";
  return token ? token : null;
}

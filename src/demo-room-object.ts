import { jsonResponse } from "./views/shared";
import { applyRoomCommand, buildRoomSnapshot, normalizeRoomState, readRoomCommand, type DemoRoomState } from "./demo-room";
import { sanitizeRoomId } from "./demo-config";

declare const WebSocketPair: {
  new (): { 0: WebSocket; 1: WebSocket };
};

type ServerWebSocket = WebSocket & {
  accept(): void;
};

export class DemoRoomObject {
  private readonly storage: {
    get(key: string): Promise<unknown>;
    put(key: string, value: unknown): Promise<void>;
  };
  private readonly sockets = new Set<ServerWebSocket>();
  private roomId = "";
  private statePromise: Promise<DemoRoomState> | null = null;

  constructor(durableState: { storage: DemoRoomObject["storage"] }) {
    this.storage = durableState.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomId = sanitizeRoomId(url.searchParams.get("room"));

    if (url.pathname.endsWith("/live")) {
      return await this.handleLiveConnection(request, roomId);
    }

    if (request.method === "GET") {
      const state = await this.loadState(roomId);
      return jsonResponse(buildRoomSnapshot(state, this.sockets.size));
    }

    if (request.method === "POST") {
      let payload: unknown;

      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: "Session command is invalid." }, { status: 400 });
      }

      const command = readRoomCommand(payload);
      if (!command) {
        return jsonResponse({ ok: false, error: "Session command is invalid." }, { status: 400 });
      }

      const nextState = applyRoomCommand(await this.loadState(roomId), command);
      await this.persistState(nextState);
      await this.broadcastSnapshot();

      return jsonResponse({ ok: true, snapshot: buildRoomSnapshot(nextState, this.sockets.size) });
    }

    return jsonResponse({ ok: false, error: "Method not allowed." }, { status: 405 });
  }

  private async handleLiveConnection(request: Request, roomId: string): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return jsonResponse({ ok: false, error: "Expected a WebSocket upgrade request." }, { status: 426 });
    }

    await this.loadState(roomId);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1] as ServerWebSocket;

    server.accept();
    this.sockets.add(server);

    server.addEventListener("close", () => {
      this.sockets.delete(server);
      void this.broadcastSnapshot();
    });
    server.addEventListener("error", () => {
      this.sockets.delete(server);
    });
    server.addEventListener("message", (event) => {
      if (String(event.data) === "ping") {
        server.send(JSON.stringify({ type: "pong" }));
      }
    });

    this.sendSnapshot(server);
    void this.broadcastSnapshot();

    return createWebSocketResponse(client);
  }

  private async loadState(roomId: string): Promise<DemoRoomState> {
    this.roomId = roomId;

    if (!this.statePromise) {
      this.statePromise = this.storage.get("room-state").then((storedState) => {
        const normalizedState = normalizeRoomState(storedState, roomId);
        void this.storage.put("room-state", normalizedState);
        return normalizedState;
      });
    }

    return await this.statePromise;
  }

  private async persistState(nextState: DemoRoomState): Promise<void> {
    this.statePromise = Promise.resolve(nextState);
    await this.storage.put("room-state", nextState);
  }

  private sendSnapshot(socket: ServerWebSocket): void {
    void this.loadState(this.roomId || sanitizeRoomId(null))
      .then((state) => {
        if (!this.sockets.has(socket)) {
          return;
        }

        socket.send(JSON.stringify({ type: "snapshot", snapshot: buildRoomSnapshot(state, this.sockets.size) }));
      })
      .catch(() => {
        this.sockets.delete(socket);
      });
  }

  private async broadcastSnapshot(): Promise<void> {
    const state = await this.loadState(this.roomId || sanitizeRoomId(null));
    const message = JSON.stringify({ type: "snapshot", snapshot: buildRoomSnapshot(state, this.sockets.size) });

    for (const socket of [...this.sockets]) {
      try {
        socket.send(message);
      } catch {
        this.sockets.delete(socket);
      }
    }
  }
}

function createWebSocketResponse(client: WebSocket): Response {
  try {
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  } catch {
    return new Response(null, { status: 200 });
  }
}

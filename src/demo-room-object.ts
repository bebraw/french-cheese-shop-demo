import { jsonResponse } from "./views/shared";
import { applyRoomCommand, buildRoomSnapshot, normalizeRoomRecord, readRoomCommand, type DemoRoomRecord } from "./demo-room";
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
  private readonly sockets = new Map<ServerWebSocket, string | null>();
  private roomId = "";
  private recordPromise: Promise<DemoRoomRecord> | null = null;

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
      const record = await this.loadRecord(roomId);
      return jsonResponse(buildRoomSnapshot(record, this.sockets.size, readPresenterToken(request)));
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

      const result = applyRoomCommand(await this.loadRecord(roomId), command, readPresenterToken(request));
      if (!result.ok) {
        return jsonResponse({ ok: false, error: result.error }, { status: 403 });
      }

      await this.persistRecord(result.record);
      await this.broadcastSnapshot();

      return jsonResponse({ ok: true, snapshot: buildRoomSnapshot(result.record, this.sockets.size, readPresenterToken(request)) });
    }

    return jsonResponse({ ok: false, error: "Method not allowed." }, { status: 405 });
  }

  private async handleLiveConnection(request: Request, roomId: string): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return jsonResponse({ ok: false, error: "Expected a WebSocket upgrade request." }, { status: 426 });
    }

    await this.loadRecord(roomId);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1] as ServerWebSocket;
    const presenterToken = readPresenterToken(request);

    server.accept();
    this.sockets.set(server, presenterToken);

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

  private async loadRecord(roomId: string): Promise<DemoRoomRecord> {
    this.roomId = roomId;

    if (!this.recordPromise) {
      this.recordPromise = this.storage.get("room-record").then((storedRecord) => {
        const normalizedRecord = normalizeRoomRecord(storedRecord, roomId);
        void this.storage.put("room-record", normalizedRecord);
        return normalizedRecord;
      });
    }

    return await this.recordPromise;
  }

  private async persistRecord(nextRecord: DemoRoomRecord): Promise<void> {
    this.recordPromise = Promise.resolve(nextRecord);
    await this.storage.put("room-record", nextRecord);
  }

  private sendSnapshot(socket: ServerWebSocket): void {
    const presenterToken = this.sockets.get(socket) ?? null;

    void this.loadRecord(this.roomId || sanitizeRoomId(null))
      .then((record) => {
        if (!this.sockets.has(socket)) {
          return;
        }

        socket.send(
          JSON.stringify({
            type: "snapshot",
            snapshot: buildRoomSnapshot(record, this.sockets.size, presenterToken),
          }),
        );
      })
      .catch(() => {
        this.sockets.delete(socket);
      });
  }

  private async broadcastSnapshot(): Promise<void> {
    const record = await this.loadRecord(this.roomId || sanitizeRoomId(null));

    for (const [socket, presenterToken] of this.sockets.entries()) {
      try {
        socket.send(
          JSON.stringify({
            type: "snapshot",
            snapshot: buildRoomSnapshot(record, this.sockets.size, presenterToken),
          }),
        );
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

function readPresenterToken(request: Request): string | null {
  const url = new URL(request.url);
  const token = request.headers.get("x-demo-presenter-token")?.trim() ?? url.searchParams.get("presenter")?.trim() ?? "";
  return token ? token : null;
}

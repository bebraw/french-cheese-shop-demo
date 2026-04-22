import { beforeEach, describe, expect, it } from "vitest";
import { DemoRoomObject } from "./demo-room-object";

class FakeSocket {
  accepted = false;
  sent: string[] = [];
  private readonly listeners = new Map<string, Array<(event: { data?: string }) => void>>();

  accept(): void {
    this.accepted = true;
  }

  send(message: string): void {
    this.sent.push(message);
  }

  addEventListener(type: string, listener: (event: { data?: string }) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type: string, event: { data?: string } = {}): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  close(): void {
    this.emit("close");
  }
}

class FakeWebSocketPair {
  static lastServer: FakeSocket | null = null;

  0: FakeSocket;
  1: FakeSocket;

  constructor() {
    this[0] = new FakeSocket();
    this[1] = new FakeSocket();
    FakeWebSocketPair.lastServer = this[1];
  }
}

function createStorage() {
  const values = new Map<string, unknown>();
  return {
    storage: {
      async get(key: string): Promise<unknown> {
        return values.get(key);
      },
      async put(key: string, value: unknown): Promise<void> {
        values.set(key, value);
      },
    },
  };
}

describe("DemoRoomObject", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).WebSocketPair = FakeWebSocketPair as unknown;
    FakeWebSocketPair.lastServer = null;
  });

  it("returns a default snapshot for GET requests", async () => {
    const room = new DemoRoomObject(createStorage());
    const response = await room.fetch(new Request("http://example.com/internal/session?room=object-default"));
    const payload = await response.json();

    expect(payload.roomId).toBe("object-default");
    expect(payload.search.results[0]?.name).toBe("Brie de Meaux");
    expect(payload.access).toEqual({
      presenterClaimed: false,
      canManageQuery: false,
      canManageContext: false,
      canManageScenario: false,
    });
  });

  it("applies commands and returns the updated snapshot", async () => {
    const room = new DemoRoomObject(createStorage());

    const claimResponse = await room.fetch(
      new Request("http://example.com/internal/session?room=object-update", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo-presenter-token": "lecturer-token",
        },
        body: JSON.stringify({ type: "claim-presenter" }),
      }),
    );
    expect(claimResponse.status).toBe(200);

    const response = await room.fetch(
      new Request("http://example.com/internal/session?room=object-update", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo-presenter-token": "lecturer-token",
        },
        body: JSON.stringify({ type: "set-scenario", scenario: "challenge-3" }),
      }),
    );
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.snapshot.state.activeScenario).toBe("challenge-3");
  });

  it("rejects challenge changes from non-lecturer clients", async () => {
    const room = new DemoRoomObject(createStorage());

    const response = await room.fetch(
      new Request("http://example.com/internal/session?room=object-protected", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "set-scenario", scenario: "challenge-2" }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("Lecturer controls must be claimed"),
    });
  });

  it("rejects query changes from non-lecturer clients", async () => {
    const room = new DemoRoomObject(createStorage());

    const response = await room.fetch(
      new Request("http://example.com/internal/session?room=object-protected-query", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "set-query", query: "Custom" }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("shared search query"),
    });
  });

  it("rejects world context changes from non-lecturer clients", async () => {
    const room = new DemoRoomObject(createStorage());

    const response = await room.fetch(
      new Request("http://example.com/internal/session?room=object-protected-context", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "set-season", season: "winter" }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("shared world context"),
    });
  });

  it("accepts a live websocket connection and broadcasts snapshots", async () => {
    const room = new DemoRoomObject(createStorage());
    await room.fetch(
      new Request("http://example.com/internal/session?room=object-live", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo-presenter-token": "lecturer-token",
        },
        body: JSON.stringify({ type: "claim-presenter" }),
      }),
    );
    const liveResponse = await room.fetch(
      new Request("http://example.com/internal/session/live?room=object-live&presenter=lecturer-token", {
        headers: {
          upgrade: "websocket",
        },
      }),
    );

    expect([101, 200]).toContain(liveResponse.status);
    expect(FakeWebSocketPair.lastServer?.accepted).toBe(true);

    FakeWebSocketPair.lastServer?.emit("message", { data: "ping" });
    expect(FakeWebSocketPair.lastServer?.sent.some((message) => message.includes('"pong"'))).toBe(true);

    await room.fetch(
      new Request("http://example.com/internal/session?room=object-live", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "set-backend", backend: "llm" }),
      }),
    );

    expect(FakeWebSocketPair.lastServer?.sent.some((message) => message.includes('"backend":"llm"'))).toBe(true);
    expect(FakeWebSocketPair.lastServer?.sent.some((message) => message.includes('"canManageScenario":true'))).toBe(true);

    FakeWebSocketPair.lastServer?.close();
  });

  it("rejects invalid live upgrade and invalid commands", async () => {
    const room = new DemoRoomObject(createStorage());

    const invalidLiveResponse = await room.fetch(new Request("http://example.com/internal/session/live?room=object-invalid-live"));
    expect(invalidLiveResponse.status).toBe(426);

    const invalidCommandResponse = await room.fetch(
      new Request("http://example.com/internal/session?room=object-invalid-command", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "unknown" }),
      }),
    );
    expect(invalidCommandResponse.status).toBe(400);
  });
});

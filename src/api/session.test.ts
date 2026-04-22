import { describe, expect, it } from "vitest";
import { createSessionLiveResponse, createSessionResponse } from "./session";

describe("createSessionResponse", () => {
  it("returns a default room snapshot for a new room", async () => {
    const response = await createSessionResponse(new Request("http://example.com/api/session?room=session-default"));
    const payload = await response.json();

    expect(payload.roomId).toBe("session-default");
    expect(payload.state.query).toBe("I want something like Brie, but stronger.");
    expect(payload.search.results[0]?.name).toBe("Brie de Meaux");
  });

  it("seeds a new in-memory room from legacy query parameters", async () => {
    const response = await createSessionResponse(
      new Request(
        "http://example.com/api/session?room=session-seeded&q=like%20Brie%20but%20stronger&scenario=challenge-2&audience=with%20cider&season=winter&backend=llm",
      ),
    );
    const payload = await response.json();

    expect(payload.state.activeScenario).toBe("challenge-2");
    expect(payload.state.audienceByChallenge["challenge-2"].customText).toBe("with cider");
    expect(payload.state.season).toBe("winter");
    expect(payload.state.backend).toBe("llm");
  });

  it("rejects invalid commands", async () => {
    const response = await createSessionResponse(
      new Request("http://example.com/api/session?room=session-invalid", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "bogus" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("applies commands in the in-memory fallback room", async () => {
    await createSessionResponse(
      new Request("http://example.com/api/session?room=session-update", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo-presenter-token": "lecturer-token",
        },
        body: JSON.stringify({ type: "claim-presenter" }),
      }),
    );

    await createSessionResponse(
      new Request("http://example.com/api/session?room=session-update", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo-presenter-token": "lecturer-token",
        },
        body: JSON.stringify({ type: "set-scenario", scenario: "challenge-2" }),
      }),
    );

    const updateResponse = await createSessionResponse(
      new Request("http://example.com/api/session?room=session-update", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "toggle-preset", scenario: "challenge-2", presetId: "cider" }),
      }),
    );
    const payload = await updateResponse.json();

    expect(payload.ok).toBe(true);
    expect(payload.snapshot.search.insights).toContain("Context data: cider.");
  });

  it("forwards session requests to the configured durable object namespace", async () => {
    const forwarded: string[] = [];
    const env = {
      DEMO_ROOMS: {
        idFromName(name: string) {
          return name;
        },
        get(id: unknown) {
          return {
            async fetch(request: Request) {
              forwarded.push(String(id), request.url, request.method);
              return Response.json({ ok: true, roomId: "forwarded-room" });
            },
          };
        },
      },
    };

    const response = await createSessionResponse(new Request("http://example.com/api/session?room=forwarded-room"), env);
    const payload = await response.json();

    expect(payload.roomId).toBe("forwarded-room");
    expect(forwarded[0]).toBe("forwarded-room");
    expect(forwarded[1]).toContain("/internal/session?room=forwarded-room");
    expect(forwarded[2]).toBe("GET");
  });

  it("forwards live sync requests when a durable object binding exists", async () => {
    let forwardedUrl = "";
    const env = {
      DEMO_ROOMS: {
        idFromName(name: string) {
          return name;
        },
        get() {
          return {
            async fetch(request: Request) {
              forwardedUrl = request.url;
              return new Response(null, { status: 200 });
            },
          };
        },
      },
    };

    await createSessionLiveResponse(
      new Request("http://example.com/api/session/live?room=live-room", {
        headers: {
          upgrade: "websocket",
        },
      }),
      env,
    );

    expect(forwardedUrl).toContain("/internal/session/live?room=live-room");
  });

  it("returns a 501 response for live sync without a durable object binding", async () => {
    const response = await createSessionLiveResponse(
      new Request("http://example.com/api/session/live?room=no-live", {
        headers: {
          upgrade: "websocket",
        },
      }),
    );

    expect(response.status).toBe(501);
  });

  it("rejects challenge changes from non-lecturer clients", async () => {
    const response = await createSessionResponse(
      new Request("http://example.com/api/session?room=session-protected", {
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
    });
  });
});

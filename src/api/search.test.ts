import { describe, expect, it } from "vitest";
import { createSearchResponse } from "./search";

describe("createSearchResponse", () => {
  it("rejects too-short queries", async () => {
    const response = await createSearchResponse(new Request("http://example.com/api/search?q=a"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      minimumQueryLength: 2,
    });
  });

  it("returns baseline demo results for a valid query", async () => {
    const response = await createSearchResponse(
      new Request("http://example.com/api/search?q=like%20Brie%20but%20stronger&scenario=baseline"),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.scenario).toBe("baseline");
    expect(payload.results[0]?.name).toBe("Brie de Meaux");
  });

  it("accepts audience input for challenge scenarios", async () => {
    const response = await createSearchResponse(
      new Request("http://example.com/api/search?q=like%20Brie%20but%20stronger&scenario=challenge-2&audience=wants%20it%20with%20cider"),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.scenario).toBe("challenge-2");
    expect(payload.insights).toContain("Context data: cider.");
  });

  it("falls back to baseline when the scenario parameter is unknown", async () => {
    const response = await createSearchResponse(new Request("http://example.com/api/search?q=brie&scenario=unknown"));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.scenario).toBe("baseline");
  });
});

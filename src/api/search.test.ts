import { describe, expect, it } from "vitest";
import { createSearchResponse } from "./search";

const authorizedSampleEnv = {
  SUPERVISOR_SEARCH_USE_SAMPLE_DATA: "true",
};

describe("createSearchResponse", () => {
  it("rejects too-short queries", async () => {
    const response = await createSearchResponse(new Request("http://example.com/api/search?q=a"), authorizedSampleEnv);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      minimumQueryLength: 2,
    });
  });

  it("returns search results for a valid query", async () => {
    const response = await createSearchResponse(new Request("http://example.com/api/search?q=cybersecurity"), authorizedSampleEnv);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      source: "sample",
    });
  });

  it("returns a service error when search bindings are missing", async () => {
    const response = await createSearchResponse(new Request("http://example.com/api/search?q=cybersecurity"), {});

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Supervisor search bindings are not configured.",
    });
  });
});

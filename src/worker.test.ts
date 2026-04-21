import { beforeEach, describe, expect, it } from "vitest";
import worker, { handleRequest } from "./worker";
import { ensureGeneratedStylesheet } from "./test-support";

ensureGeneratedStylesheet();

beforeEach(() => {
  ensureGeneratedStylesheet();
});

describe("worker", () => {
  it("renders the cheese demo home page", async () => {
    const response = await handleRequest(new Request("http://example.com/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-security-policy")).toContain("script-src 'self'");

    const body = await response.text();
    expect(body).toContain("French Cheese Shop");
    expect(body).toContain("Challenge 1");
    expect(body).toContain("Search Backend");
    expect(body).toContain("Type the customer request");
  });

  it("returns a JSON health response", async () => {
    const response = await handleRequest(new Request("http://example.com/api/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      name: "french-cheese-shop-demo-worker",
      routes: ["/", "/api/search", "/api/health"],
    });
  });

  it("returns baseline cheese matches for the search API", async () => {
    const response = await handleRequest(
      new Request("http://example.com/api/search?q=I%20want%20something%20like%20Brie%20but%20stronger"),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.scenario).toBe("baseline");
    expect(payload.results[0]?.name).toBe("Brie de Meaux");
  });

  it("changes ranking when challenge data is supplied", async () => {
    const response = await handleRequest(
      new Request(
        "http://example.com/api/search?q=I%20want%20something%20like%20Brie%20but%20stronger&scenario=challenge-2&audience=prefers%20washed%20rind%2C%20serving%20with%20cider%2C%20and%20it%20must%20be%20in%20stock",
      ),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.scenario).toBe("challenge-2");
    expect(payload.results[0]?.name).toBe("Livarot");
  });

  it("applies simulation context to challenge data", async () => {
    const response = await handleRequest(
      new Request(
        "http://example.com/api/search?q=I%20want%20something%20like%20Brie%20but%20stronger&scenario=challenge-2&audience=with%20cider&season=winter&shopState=holiday-rush",
      ),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.insights).toContain("Simulation context: winter season and holiday-rush demand.");
    expect(payload.results.some((result: { reason: string }) => result.reason.includes("sold out"))).toBe(true);
  });

  it("supports the optional llm backend mode", async () => {
    const response = await handleRequest(
      new Request(
        "http://example.com/api/search?q=I%20want%20something%20like%20Brie%20but%20stronger&scenario=challenge-2&audience=with%20cider&backend=llm",
      ),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.backend).toBe("llm");
    expect(payload.insights).toContain("Backend mode: local LLM-style contrast.");
  });

  it("returns a not found page for unknown routes", async () => {
    const response = await handleRequest(new Request("http://example.com/missing"));

    expect(response.status).toBe(404);

    const body = await response.text();
    expect(body).toContain("Not Found");
    expect(body).toContain("/missing");
  });

  it("exposes the same behavior through the worker fetch entrypoint", async () => {
    const response = await worker.fetch(new Request("http://example.com/api/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it("serves generated styles", async () => {
    const response = await handleRequest(new Request("http://example.com/styles.css"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    await expect(response.text()).resolves.toContain("--color-app-canvas:#fbf5ec");
  });

  it("serves the external app script with security headers", async () => {
    const response = await handleRequest(new Request("http://example.com/app.js"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/javascript");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await response.text();
    expect(body).toContain('"/api/search?q=" +');
    expect(body).toContain("applyScenario");
  });
});

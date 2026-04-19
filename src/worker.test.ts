import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimitState } from "./rate-limit";
import worker, { handleRequest } from "./worker";
import { ensureGeneratedStylesheet } from "./test-support";

ensureGeneratedStylesheet();

beforeEach(() => {
  resetRateLimitState();
});

const testEnv = {
  SUPERVISOR_SEARCH_BASIC_AUTH_USERNAME: "student",
  SUPERVISOR_SEARCH_BASIC_AUTH_PASSWORD: "secret",
  SUPERVISOR_SEARCH_USE_SAMPLE_DATA: "true",
};

function createAuthorizationHeader(username = "student", password = "secret"): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

describe("worker", () => {
  it("requires authentication for the home page", async () => {
    const response = await handleRequest(new Request("http://example.com/"), testEnv);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
  });

  it("renders the supervisor search home page for authorized requests", async () => {
    const response = await handleRequest(
      new Request("http://example.com/", {
        headers: {
          authorization: createAuthorizationHeader(),
        },
      }),
      testEnv,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-security-policy")).toContain("script-src 'self'");

    const body = await response.text();
    expect(body).toContain("Find an MSc Supervisor");
    expect(body).toContain("Type a topic, method, or research area");
  });

  it("returns a JSON health response", async () => {
    const response = await handleRequest(new Request("http://example.com/api/health"), testEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      name: "supervisor-search-worker",
      routes: ["/", "/api/search", "/api/health"],
    });
  });

  it("returns ranked supervisor matches for the search API", async () => {
    const response = await handleRequest(
      new Request("http://example.com/api/search?q=distributed%20systems", {
        headers: {
          authorization: createAuthorizationHeader(),
        },
      }),
      testEnv,
    );

    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.results[0]).toMatchObject({
      name: "Tuomas Koski",
    });
  });

  it("throttles repeated search requests from the same client", async () => {
    const throttledEnv = {
      ...testEnv,
      SUPERVISOR_SEARCH_RATE_LIMIT_MAX_REQUESTS: "1",
      SUPERVISOR_SEARCH_RATE_LIMIT_WINDOW_MS: "60000",
    };
    const headers = {
      authorization: createAuthorizationHeader(),
      "cf-connecting-ip": "203.0.113.10",
    };

    const firstResponse = await handleRequest(
      new Request("http://example.com/api/search?q=distributed%20systems", { headers }),
      throttledEnv,
    );
    expect(firstResponse.status).toBe(200);

    const secondResponse = await handleRequest(
      new Request("http://example.com/api/search?q=distributed%20systems", { headers }),
      throttledEnv,
    );

    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("retry-after")).toBeTruthy();
    await expect(secondResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "Too many search requests. Try again soon.",
    });
  });

  it("returns a not found page for unknown routes", async () => {
    const response = await handleRequest(
      new Request("http://example.com/missing", {
        headers: {
          authorization: createAuthorizationHeader(),
        },
      }),
      testEnv,
    );

    expect(response.status).toBe(404);

    const body = await response.text();
    expect(body).toContain("Not Found");
    expect(body).toContain("/missing");
  });

  it("exposes the same behavior through the worker fetch entrypoint", async () => {
    const response = await worker.fetch(new Request("http://example.com/api/health"), testEnv);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it("serves generated styles", async () => {
    const response = await handleRequest(new Request("http://example.com/styles.css"), testEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    await expect(response.text()).resolves.toContain("--color-app-canvas:#fff");
  });

  it("serves the external app script with security headers", async () => {
    const response = await handleRequest(new Request("http://example.com/app.js"), testEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/javascript");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await response.text();
    expect(body).toContain('fetch("/api/search?q=" + encodeURIComponent(query)');
    expect(body).toContain("window.history.replaceState");
  });
});

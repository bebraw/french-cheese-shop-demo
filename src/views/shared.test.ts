import { describe, expect, it } from "vitest";
import { escapeHtml, htmlResponse, javascriptResponse, textResponse } from "./shared";

describe("shared responses", () => {
  it("creates text responses with default security headers", async () => {
    const response = textResponse("bonjour");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    await expect(response.text()).resolves.toBe("bonjour");
  });

  it("allows response init headers to extend the plain text helper", () => {
    const response = textResponse("note", {
      status: 201,
      headers: {
        "x-demo-mode": "true",
      },
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("x-demo-mode")).toBe("true");
  });

  it("escapes unsafe html characters", () => {
    expect(escapeHtml(`<tag attr="x">'&`)).toBe("&lt;tag attr=&quot;x&quot;&gt;&#39;&amp;");
  });

  it("keeps the html and javascript response helpers locked to same-origin delivery", () => {
    const html = htmlResponse("<p>hi</p>");
    const script = javascriptResponse("console.log('hi')");

    expect(html.headers.get("content-security-policy")).toContain("script-src 'self'");
    expect(script.headers.get("content-type")).toContain("application/javascript");
  });
});

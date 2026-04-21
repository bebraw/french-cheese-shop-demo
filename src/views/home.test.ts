import { describe, expect, it } from "vitest";
import { renderHomePage } from "./home";

describe("renderHomePage", () => {
  it("renders the cheese demo surface and stylesheet wiring", () => {
    const html = renderHomePage();

    expect(html).toContain("French Cheese Shop");
    expect(html).toContain("Type the customer request");
    expect(html).toContain('role="tablist"');
    expect(html).toContain('rel="stylesheet" href="/styles.css"');
    expect(html).toContain('<script src="/app.js" defer></script>');
  });
});

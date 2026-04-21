import { describe, expect, it } from "vitest";
import { renderHomePage } from "./home";

describe("renderHomePage", () => {
  it("renders the cheese demo surface and stylesheet wiring", () => {
    const html = renderHomePage();

    expect(html).toContain("French Cheese Shop");
    expect(html).toContain('value="I want something like Brie, but stronger."');
    expect(html).toContain('aria-label="Choose demo challenge"');
    expect(html).toContain("Hidden requirements");
    expect(html).toContain("Missing data");
    expect(html).toContain("Audience answer");
    expect(html).toContain("Other audience note");
    expect(html).toContain('rel="stylesheet" href="/styles.css"');
    expect(html).toContain('<script src="/app.js" defer></script>');
  });
});

import { describe, expect, it } from "vitest";
import { renderHomePage } from "./home";

describe("renderHomePage", () => {
  it("renders the cheese demo surface and stylesheet wiring", () => {
    const html = renderHomePage();

    expect(html).toContain("French Cheese Shop");
    expect(html).toContain('value="I want something like Brie, but stronger."');
    expect(html).toContain('aria-label="Choose demo challenge"');
    expect(html).toContain("Hidden needs");
    expect(html).toContain("Missing data");
    expect(html).toContain("Add facts and constraints.");
    expect(html).toContain("Make the results prove something concrete.");
    expect(html).toContain("Context");
    expect(html).toContain("World Context");
    expect(html).toContain("Optional simulation state shared by baseline and every challenge.");
    expect(html).toContain("Season options");
    expect(html).toContain("Shop state options");
    expect(html).toContain("Search Backend");
    expect(html).toContain("Context in play");
    expect(html).toContain("Search backend options");
    expect(html).toContain("LLM backend");
    expect(html).toContain("Audience answer");
    expect(html).toContain("Other audience note");
    expect(html).toContain('rel="stylesheet" href="/styles.css"');
    expect(html).toContain('<script src="/app.js" defer></script>');
  });
});

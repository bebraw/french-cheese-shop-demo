import { describe, expect, it } from "vitest";
import { renderHomePage } from "./home";

describe("renderHomePage", () => {
  it("renders the cheese demo surface and stylesheet wiring", () => {
    const html = renderHomePage();

    expect(html).toContain("French Cheese Shop");
    expect(html).toContain('value="I want something like Brie, but stronger."');
    expect(html).toContain("Shared Room");
    expect(html).toContain('id="room-panel-toggle"');
    expect(html).toContain('aria-controls="room-panel-body"');
    expect(html).toContain('value="demo-room"');
    expect(html).toContain("Lecturer Controls");
    expect(html).toContain("Claim lecturer controls");
    expect(html).toContain("Copy audience link");
    expect(html).toContain("Join room");
    expect(html).toContain("Copy lecturer link");
    expect(html).toContain("Reset room");
    expect(html).toContain('aria-label="Choose demo challenge"');
    expect(html).toContain("Hidden meaning");
    expect(html).toContain("Domain context");
    expect(html).toContain("Add catalog facts, stock, and shop context.");
    expect(html).toContain("Make usefulness and trust visible.");
    expect(html).toContain("Teaching Focus");
    expect(html).toContain("Interpret vague requests");
    expect(html).toContain("What does “like Brie” and “stronger” actually mean for this customer?");
    expect(html).toContain(
      "The ranking looks reasonable, but the system is still guessing about preferences, constraints, and success criteria.",
    );
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

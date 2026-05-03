import { describe, expect, it } from "vitest";
import { searchDemoCatalog } from "./demo";

describe("searchDemoCatalog", () => {
  it("keeps the vague request close to brie in baseline mode", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "baseline",
    });

    expect(response.results[0]?.name).toBe("Brie de Meaux");
    expect(response.insights[0]).toBe("Only surface wording affects ranking.");
  });

  it("keeps challenge 1 on baseline ranking until a hidden need is explicit", () => {
    const baselineResponse = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "baseline",
    });
    const challengeResponse = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-1",
    });

    expect(challengeResponse.results.map((result) => result.name)).toEqual(baselineResponse.results.map((result) => result.name));
    expect(challengeResponse.results.map((result) => result.score)).toEqual(baselineResponse.results.map((result) => result.score));
    expect(challengeResponse.teachingFocus).toBe("Challenge 1 makes hidden requirements explicit.");
    expect(challengeResponse.insights[0]).toBe("Baseline ranking remains until a hidden need is selected.");
  });

  it("promotes a stronger creamy washed-rind option when hidden requirements are explicit", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-1",
      audienceInput: "Keep it creamy, cow's milk, and make it much stronger.",
    });

    expect(response.results[0]?.name).toBe("Epoisses de Bourgogne");
    expect(response.insights).toContain("Explicit milk types: cow.");
    expect(response.insights).toContain("Explicit textures: creamy.");
  });

  it("uses extra catalog and context data in challenge 2", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-2",
      audienceInput: "The customer usually orders washed rind cheese, wants it with cider, and it must be in stock.",
    });

    expect(response.results[0]?.name).toBe("Livarot");
    expect(response.insights).toContain("Context data: cider.");
  });

  it("offers an llm-style backend contrast mode", () => {
    const rulesResponse = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-2",
      audienceInput: "prefers washed rind. with cider. it must be in stock",
    });
    const llmResponse = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-2",
      audienceInput: "prefers washed rind. with cider. it must be in stock",
      backend: "llm",
    });

    expect(rulesResponse.results[0]?.name).toBe("Livarot");
    expect(llmResponse.backend).toBe("llm");
    expect(llmResponse.backendLabel).toBe("LLM-style ranking");
    expect(llmResponse.insights).toContain("Ranking mode: local LLM-style contrast.");
    expect(llmResponse.results[0]?.name).not.toBe(rulesResponse.results[0]?.name);
  });

  it("does not return the same cheese for a next-step stronger request", () => {
    const rulesResponse = searchDemoCatalog({
      query: "I want something like Livarot, but stronger.",
      scenario: "baseline",
    });
    const llmResponse = searchDemoCatalog({
      query: "I want something like Livarot, but stronger.",
      scenario: "baseline",
      backend: "llm",
    });

    expect(rulesResponse.results[0]?.name).not.toBe("Livarot");
    expect(llmResponse.results[0]?.name).not.toBe("Livarot");
  });

  it("lets season change the shortlist in challenge 2", () => {
    const summerResponse = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-2",
      audienceInput: "with cider",
      season: "summer",
    });
    const winterResponse = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-2",
      audienceInput: "with cider",
      season: "winter",
    });

    expect(summerResponse.results[0]?.name).toBe("Camembert de Normandie");
    expect(winterResponse.results[0]?.name).toBe("Livarot");
    expect(summerResponse.insights).toContain("Simulation context: summer season.");
    expect(winterResponse.insights).toContain("Simulation context: winter season.");
    expect(
      summerResponse.insights.some((insight) => insight.startsWith("Seasonal leaders:") && insight.includes("Camembert de Normandie")),
    ).toBe(true);
    expect(winterResponse.insights.some((insight) => insight.startsWith("Seasonal leaders:") && insight.includes("Livarot"))).toBe(true);
  });

  it("changes visible stock when shop demand is added on top of the season", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-2",
      audienceInput: "with cider",
      season: "winter",
      shopState: "holiday-rush",
    });

    expect(response.insights).toContain("Simulation context: winter season and holiday-rush demand.");
    expect(response.results.some((result) => result.reason.includes("sold out"))).toBe(true);
  });

  it("returns evaluation checks in challenge 3", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-3",
      audienceInput: "It must be in stock, show why it fits, and mark a backup choice.",
    });

    expect(response.results[0]?.presentationTag).toBe("Top pick");
    expect(response.results[0]?.explanation).toContain("same ranking signals already in play");
    expect(response.results[0]?.checks).toHaveLength(5);
    expect(response.results[1]?.presentationTag).toBe("Backup choice");
    expect(response.insights).toContain(`Backup choice is marked on ${response.results[1]?.name}.`);
    expect(response.insights).toContain("Expanded cards explain the current ranking instead of changing it.");
    expect(response.insights.at(-1)).toContain("current checks");
  });

  it("does not reorder challenge 3 results when explanation display is enabled", () => {
    const baseResponse = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-3",
    });
    const explainedResponse = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-3",
      audienceInput: "show why it fits",
    });

    expect(explainedResponse.results[0]?.name).toBe(baseResponse.results[0]?.name);
    expect(explainedResponse.results[0]?.explanation).toContain("same ranking signals already in play");
  });

  it("makes shortlist requests visible in challenge 3 results", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-3",
      audienceInput: "keep it to two finalists",
    });

    expect(response.results).toHaveLength(2);
    expect(response.insights).toContain("Showing two finalists instead of the full shortlist.");
  });

  it("uses budget and serving context cues even without a strength target", () => {
    const response = searchDemoCatalog({
      query: "Need a budget cheese for salad",
      scenario: "challenge-2",
      audienceInput: "Goat cheese, under EUR 12, for salad.",
    });

    expect(response.results[0]?.name).toBe("Crottin de Chavignol");
    expect(response.insights[0]).toBe("Ranking can use product facts and context.");
  });

  it("can route sheep and blue constraints to a distinct result", () => {
    const response = searchDemoCatalog({
      query: "Need a strong cheese for salad",
      scenario: "challenge-2",
      audienceInput: "Sheep's milk, blue, for salad.",
    });

    expect(response.results[0]?.name).toBe("Roquefort");
    expect(response.insights).toContain("Explicit milk types: sheep.");
    expect(response.insights).toContain("Explicit styles: blue.");
    expect(response.insights).toContain("Serving context: salad.");
  });

  it("can make mixed milk and beer constraints visible", () => {
    const response = searchDemoCatalog({
      query: "Need a firm cheese for a picnic",
      scenario: "challenge-2",
      audienceInput: "Mixed milk, pressed, with beer.",
    });

    expect(response.results[0]?.name).toBe("Tomme mixte des Pyrenees");
    expect(response.results[0]?.meta).toContain("mixed milk");
    expect(response.insights).toContain("Explicit milk types: mixed.");
    expect(response.insights).toContain("Context data: beer.");
  });
});

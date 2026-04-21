import { describe, expect, it } from "vitest";
import { searchDemoCatalog } from "./demo";

describe("searchDemoCatalog", () => {
  it("keeps the vague request close to brie in baseline mode", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "baseline",
    });

    expect(response.results[0]?.name).toBe("Brie de Meaux");
    expect(response.insights[0]).toContain("name matches");
  });

  it("promotes a stronger creamy washed-rind option when hidden requirements are explicit", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-1",
      audienceInput: "Keep it creamy, cow's milk, and make it much stronger.",
    });

    expect(response.results[0]?.name).toBe("Epoisses de Bourgogne");
    expect(response.insights).toContain("Texture cues made explicit: creamy.");
  });

  it("uses extra catalog and context data in challenge 2", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-2",
      audienceInput: "The customer usually orders washed rind cheese, wants it with cider, and it must be in stock.",
    });

    expect(response.results[0]?.name).toBe("Livarot");
    expect(response.insights).toContain("Pairing or context data in play: cider.");
  });

  it("returns evaluation checks in challenge 3", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-3",
      audienceInput: "It must be in stock, explain why it fits, and give me a backup option.",
    });

    expect(response.results[0]?.checks).toHaveLength(4);
    expect(response.insights.at(-1)).toContain("evaluation checklist");
  });

  it("uses budget and serving context cues even without a strength target", () => {
    const response = searchDemoCatalog({
      query: "Need a budget cheese for salad",
      scenario: "challenge-2",
      audienceInput: "Goat cheese, under EUR 12, for salad.",
    });

    expect(response.results[0]?.name).toBe("Crottin de Chavignol");
    expect(response.insights[0]).toContain("structured catalog facts");
  });
});

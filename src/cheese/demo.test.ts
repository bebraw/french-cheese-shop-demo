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

  it("changes visible stock when simulation context is added", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-2",
      audienceInput: "with cider",
      season: "winter",
      shopState: "holiday-rush",
    });

    expect(response.insights).toContain("Simulation context: winter stock and holiday-rush demand.");
    expect(response.results.some((result) => result.reason.includes("sold out"))).toBe(true);
  });

  it("returns evaluation checks in challenge 3", () => {
    const response = searchDemoCatalog({
      query: "I want something like Brie but stronger",
      scenario: "challenge-3",
      audienceInput: "It must be in stock, show why it fits, and mark a backup choice.",
    });

    expect(response.results[0]?.presentationTag).toBe("Top pick");
    expect(response.results[0]?.explanation).toContain("Close to the requested strength");
    expect(response.results[0]?.checks).toHaveLength(5);
    expect(response.results[1]?.presentationTag).toBe("Backup choice");
    expect(response.insights).toContain(`Backup choice is marked on ${response.results[1]?.name}.`);
    expect(response.insights.at(-1)).toContain("current checks");
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
});

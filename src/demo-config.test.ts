import { describe, expect, it } from "vitest";
import {
  getScenarioTrail,
  isDemoChallengeId,
  isDemoScenarioId,
  isSearchBackend,
  isShopState,
  isSimulationSeason,
  sanitizeRoomId,
} from "./demo-config";

describe("demo config", () => {
  it("sanitizes room ids into a stable lowercase slug", () => {
    expect(sanitizeRoomId("  Team Brie / Demo  ")).toBe("team-brie-demo");
    expect(sanitizeRoomId("ab")).toBe("demo-room");
  });

  it("recognizes supported scenarios and challenge ids", () => {
    expect(isDemoScenarioId("baseline")).toBe(true);
    expect(isDemoScenarioId("challenge-3")).toBe(true);
    expect(isDemoScenarioId("unknown")).toBe(false);
    expect(isDemoChallengeId("challenge-2")).toBe(true);
    expect(isDemoChallengeId("baseline")).toBe(false);
  });

  it("recognizes supported backend and context options", () => {
    expect(isSearchBackend("rules")).toBe(true);
    expect(isSearchBackend("llm")).toBe(true);
    expect(isSearchBackend("other")).toBe(false);
    expect(isSimulationSeason("winter")).toBe(true);
    expect(isSimulationSeason("monsoon")).toBe(false);
    expect(isShopState("holiday-rush")).toBe(true);
    expect(isShopState("rush")).toBe(false);
  });

  it("builds the challenge trail up to the active scenario", () => {
    expect(getScenarioTrail("baseline")).toEqual([]);
    expect(getScenarioTrail("challenge-1")).toEqual(["challenge-1"]);
    expect(getScenarioTrail("challenge-3")).toEqual(["challenge-1", "challenge-2", "challenge-3"]);
  });
});

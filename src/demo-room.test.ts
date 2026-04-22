import { describe, expect, it } from "vitest";
import {
  applyRoomCommand,
  buildAudienceInput,
  buildAudienceSummaryItems,
  buildContextSummaryItems,
  buildRoomSnapshot,
  createDefaultRoomState,
  normalizeRoomState,
  readRoomCommand,
} from "./demo-room";

describe("demo room state", () => {
  it("carries earlier challenge signals into later audience input", () => {
    let state = createDefaultRoomState("carry-forward-room");

    state = applyRoomCommand(state, { type: "set-scenario", scenario: "challenge-1" });
    state = applyRoomCommand(state, { type: "toggle-preset", scenario: "challenge-1", presetId: "creamy" });
    state = applyRoomCommand(state, { type: "toggle-preset", scenario: "challenge-1", presetId: "cow" });
    state = applyRoomCommand(state, { type: "set-scenario", scenario: "challenge-2" });
    state = applyRoomCommand(state, { type: "toggle-preset", scenario: "challenge-2", presetId: "cider" });

    expect(buildAudienceInput(state, "challenge-2")).toBe("keep it creamy. cow's milk. with cider");
    expect(buildAudienceSummaryItems(state, "challenge-2")).toEqual(["Keep it creamy", "Cow's milk", "With cider"]);
  });

  it("builds a derived search snapshot from the shared room state", () => {
    let state = createDefaultRoomState("snapshot-room");
    state = applyRoomCommand(state, { type: "set-query", query: "I want something like Brie but stronger" });
    state = applyRoomCommand(state, { type: "set-scenario", scenario: "challenge-2" });
    state = applyRoomCommand(state, { type: "toggle-preset", scenario: "challenge-2", presetId: "cider" });
    state = applyRoomCommand(state, { type: "toggle-preset", scenario: "challenge-2", presetId: "washed-rind" });
    state = applyRoomCommand(state, { type: "toggle-preset", scenario: "challenge-2", presetId: "stock" });

    const snapshot = buildRoomSnapshot(state, 3);

    expect(snapshot.participantCount).toBe(3);
    expect(snapshot.search?.scenario).toBe("challenge-2");
    expect(snapshot.search?.results[0]?.name).toBe("Livarot");
  });

  it("normalizes partial persisted state and rejects unsupported presets", () => {
    const state = normalizeRoomState({
      query: "Brie",
      activeScenario: "challenge-1",
      audienceByChallenge: {
        "challenge-1": {
          selectedPresetIds: ["creamy", "invalid"],
          customText: "extra note",
        },
      },
      season: "winter",
      shopState: "holiday-rush",
      backend: "llm",
      version: 9,
      updatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(state.audienceByChallenge["challenge-1"].selectedPresetIds).toEqual(["creamy"]);
    expect(buildContextSummaryItems(state)).toEqual(["Winter holiday", "Holiday rush"]);
  });

  it("reads valid room commands and ignores malformed ones", () => {
    expect(readRoomCommand({ type: "set-query", query: "Brie" })).toEqual({ type: "set-query", query: "Brie" });
    expect(readRoomCommand({ type: "set-season", season: "winter" })).toEqual({ type: "set-season", season: "winter" });
    expect(readRoomCommand({ type: "set-shop-state", shopState: "" })).toEqual({ type: "set-shop-state", shopState: "" });
    expect(readRoomCommand({ type: "set-backend", backend: "llm" })).toEqual({ type: "set-backend", backend: "llm" });
    expect(readRoomCommand({ type: "reset-room" })).toEqual({ type: "reset-room" });
    expect(readRoomCommand({ type: "toggle-preset", scenario: "baseline", presetId: "creamy" })).toBeNull();
  });

  it("resets the room to the default shared state", () => {
    let state = createDefaultRoomState("reset-room");
    state = applyRoomCommand(state, { type: "set-query", query: "Custom" });
    state = applyRoomCommand(state, { type: "set-scenario", scenario: "challenge-2" });
    state = applyRoomCommand(state, { type: "toggle-preset", scenario: "challenge-2", presetId: "cider" });
    state = applyRoomCommand(state, { type: "reset-room" });

    expect(state.query).toBe("I want something like Brie, but stronger.");
    expect(state.activeScenario).toBe("baseline");
    expect(state.audienceByChallenge["challenge-2"].selectedPresetIds).toEqual([]);
  });
});

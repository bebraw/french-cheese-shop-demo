import { describe, expect, it } from "vitest";
import {
  applyRoomCommand,
  buildAudienceInput,
  buildAudienceSummaryItems,
  buildContextSummaryItems,
  buildRoomSnapshot,
  createDefaultRoomRecord,
  normalizeRoomState,
  normalizeRoomRecord,
  readRoomCommand,
} from "./demo-room";

function applyOk(
  record: ReturnType<typeof createDefaultRoomRecord>,
  command: Parameters<typeof applyRoomCommand>[1],
  presenterToken: string | null = null,
) {
  const result = applyRoomCommand(record, command, presenterToken);
  expect(result.ok).toBe(true);
  return result.record;
}

describe("demo room state", () => {
  it("carries earlier challenge signals into later audience input", () => {
    let record = createDefaultRoomRecord("carry-forward-room");

    record = applyOk(record, { type: "claim-presenter" }, "lecturer-token");
    record = applyOk(record, { type: "set-scenario", scenario: "challenge-1" }, "lecturer-token");
    record = applyOk(record, { type: "toggle-preset", scenario: "challenge-1", presetId: "creamy" });
    record = applyOk(record, { type: "toggle-preset", scenario: "challenge-1", presetId: "cow" });
    record = applyOk(record, { type: "set-scenario", scenario: "challenge-2" }, "lecturer-token");
    record = applyOk(record, { type: "toggle-preset", scenario: "challenge-2", presetId: "cider" });

    const state = record.state;
    expect(buildAudienceInput(state, "challenge-2")).toBe("keep it creamy. cow's milk. with cider");
    expect(buildAudienceSummaryItems(state, "challenge-2")).toEqual(["Keep it creamy", "Cow's milk", "With cider"]);
  });

  it("builds a derived search snapshot from the shared room state", () => {
    let record = createDefaultRoomRecord("snapshot-room");
    record = applyOk(record, { type: "claim-presenter" }, "lecturer-token");
    record = applyOk(record, { type: "set-query", query: "I want something like Brie but stronger" }, "lecturer-token");
    record = applyOk(record, { type: "set-scenario", scenario: "challenge-2" }, "lecturer-token");
    record = applyOk(record, { type: "toggle-preset", scenario: "challenge-2", presetId: "cider" });
    record = applyOk(record, { type: "toggle-preset", scenario: "challenge-2", presetId: "washed-rind" });
    record = applyOk(record, { type: "toggle-preset", scenario: "challenge-2", presetId: "stock" });

    const snapshot = buildRoomSnapshot(record, 3, "lecturer-token");

    expect(snapshot.participantCount).toBe(3);
    expect(snapshot.search?.scenario).toBe("challenge-2");
    expect(snapshot.search?.results[0]?.name).toBe("Livarot");
    expect(snapshot.access.canManageQuery).toBe(true);
    expect(snapshot.access.canManageContext).toBe(true);
    expect(snapshot.access.canManageScenario).toBe(true);
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

  it("normalizes room records stored before presenter access existed", () => {
    const record = normalizeRoomRecord({
      state: {
        roomId: "legacy-room",
        version: 4,
        query: "Brie",
        activeScenario: "baseline",
        audienceByChallenge: {
          "challenge-1": { selectedPresetIds: [], customText: "" },
          "challenge-2": { selectedPresetIds: [], customText: "" },
          "challenge-3": { selectedPresetIds: [], customText: "" },
        },
        season: "",
        shopState: "",
        backend: "rules",
        updatedAt: "2026-04-22T00:00:00.000Z",
      },
      presenterToken: "lecturer-token",
    });

    expect(record.presenterToken).toBe("lecturer-token");
    expect(record.state.roomId).toBe("legacy-room");
  });

  it("reads valid room commands and ignores malformed ones", () => {
    expect(readRoomCommand({ type: "set-query", query: "Brie" })).toEqual({ type: "set-query", query: "Brie" });
    expect(readRoomCommand({ type: "set-season", season: "winter" })).toEqual({ type: "set-season", season: "winter" });
    expect(readRoomCommand({ type: "set-shop-state", shopState: "" })).toEqual({ type: "set-shop-state", shopState: "" });
    expect(readRoomCommand({ type: "set-backend", backend: "llm" })).toEqual({ type: "set-backend", backend: "llm" });
    expect(readRoomCommand({ type: "claim-presenter" })).toEqual({ type: "claim-presenter" });
    expect(readRoomCommand({ type: "reset-room" })).toEqual({ type: "reset-room" });
    expect(readRoomCommand({ type: "toggle-preset", scenario: "baseline", presetId: "creamy" })).toBeNull();
  });

  it("resets the room to the default shared state", () => {
    let record = createDefaultRoomRecord("reset-room");
    record = applyOk(record, { type: "claim-presenter" }, "lecturer-token");
    record = applyOk(record, { type: "set-query", query: "Custom" }, "lecturer-token");
    record = applyOk(record, { type: "set-scenario", scenario: "challenge-2" }, "lecturer-token");
    record = applyOk(record, { type: "toggle-preset", scenario: "challenge-2", presetId: "cider" });
    record = applyOk(record, { type: "reset-room" }, "lecturer-token");

    const state = record.state;
    expect(state.query).toBe("I want something like Brie, but stronger.");
    expect(state.activeScenario).toBe("baseline");
    expect(state.audienceByChallenge["challenge-2"].selectedPresetIds).toEqual([]);
  });

  it("protects challenge changes until the lecturer claims control", () => {
    const record = createDefaultRoomRecord("protected-room");
    const unauthorizedResult = applyRoomCommand(record, { type: "set-scenario", scenario: "challenge-2" }, null);

    expect(unauthorizedResult.ok).toBe(false);
    expect(unauthorizedResult.error).toContain("Lecturer controls must be claimed");

    const claimedRecord = applyOk(record, { type: "claim-presenter" }, "lecturer-token");
    const wrongPresenterResult = applyRoomCommand(claimedRecord, { type: "set-scenario", scenario: "challenge-2" }, "audience-token");

    expect(wrongPresenterResult.ok).toBe(false);
    expect(wrongPresenterResult.error).toContain("Only the lecturer");
  });

  it("protects shared query changes until the lecturer claims control", () => {
    const record = createDefaultRoomRecord("protected-query-room");
    const unauthorizedResult = applyRoomCommand(record, { type: "set-query", query: "Custom" }, null);

    expect(unauthorizedResult.ok).toBe(false);
    expect(unauthorizedResult.error).toContain("shared search query");

    const claimedRecord = applyOk(record, { type: "claim-presenter" }, "lecturer-token");
    const wrongPresenterResult = applyRoomCommand(claimedRecord, { type: "set-query", query: "Custom" }, "audience-token");

    expect(wrongPresenterResult.ok).toBe(false);
    expect(wrongPresenterResult.error).toContain("Only the lecturer");
  });

  it("protects shared world context changes until the lecturer claims control", () => {
    const record = createDefaultRoomRecord("protected-context-room");
    const unauthorizedResult = applyRoomCommand(record, { type: "set-season", season: "winter" }, null);

    expect(unauthorizedResult.ok).toBe(false);
    expect(unauthorizedResult.error).toContain("shared world context");

    const claimedRecord = applyOk(record, { type: "claim-presenter" }, "lecturer-token");
    const wrongPresenterResult = applyRoomCommand(claimedRecord, { type: "set-shop-state", shopState: "holiday-rush" }, "audience-token");

    expect(wrongPresenterResult.ok).toBe(false);
    expect(wrongPresenterResult.error).toContain("Only the lecturer");
  });
});

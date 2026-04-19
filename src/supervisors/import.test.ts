import { describe, expect, it } from "vitest";
import { parseSupervisorSnapshot, planSupervisorImport } from "./import";
import { buildSupervisorRecord } from "./parser";

describe("planSupervisorImport", () => {
  it("plans upserts and deletions for a full-snapshot refresh", () => {
    const importedAt = "2026-04-19T12:00:00.000Z";
    const aino = buildSupervisorRecord({
      name: "Aino Saarinen",
      topicArea: "Machine learning systems",
      activeThesisCount: 2,
      rawSource: "aino",
      importedAt,
    });
    const tuomas = buildSupervisorRecord({
      name: "Tuomas Koski",
      topicArea: "Distributed systems",
      activeThesisCount: 3,
      rawSource: "tuomas",
      importedAt,
    });

    const plan = planSupervisorImport(
      [aino, tuomas],
      [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ],
      [aino.supervisorId, "removed-supervisor"],
    );

    expect(plan.vectors).toHaveLength(2);
    expect(plan.idsToDelete).toEqual(["removed-supervisor"]);
    expect(plan.vectorNdjson).toContain(aino.supervisorId);
    expect(plan.vectorNdjson).toContain(tuomas.supervisorId);
  });

  it("throws when supervisor and embedding counts diverge", () => {
    const importedAt = "2026-04-19T12:00:00.000Z";
    const aino = buildSupervisorRecord({
      name: "Aino Saarinen",
      topicArea: "Machine learning systems",
      activeThesisCount: 2,
      rawSource: "aino",
      importedAt,
    });

    expect(() => planSupervisorImport([aino], [], [])).toThrow("Supervisor count and embedding count must match.");
  });
});

describe("parseSupervisorSnapshot", () => {
  it("delegates to the parser for snapshot extraction", () => {
    const supervisors = parseSupervisorSnapshot(
      `
        <article>
          <h2>Leena Heikkila</h2>
          <p>Topic area: Accessibility and HCI</p>
          <p>Current theses: 4</p>
        </article>
      `,
      "2026-04-19T12:00:00.000Z",
    );

    expect(supervisors[0]).toMatchObject({
      name: "Leena Heikkila",
      activeThesisCount: 4,
    });
  });
});

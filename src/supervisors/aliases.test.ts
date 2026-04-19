import { describe, expect, it } from "vitest";
import { expandSearchAliases } from "./aliases.ts";

describe("expandSearchAliases", () => {
  it("expands established accessibility aliases", () => {
    expect(expandSearchAliases("a11y")).toBe("a11y accessibility");
    expect(expandSearchAliases("aria")).toBe("aria accessible rich internet applications");
  });

  it("expands established ML and speech aliases", () => {
    expect(expandSearchAliases("rl")).toBe("rl reinforcement learning");
    expect(expandSearchAliases("rlhf")).toBe("rlhf reinforcement learning from human feedback");
    expect(expandSearchAliases("asr ocr")).toBe("asr ocr automatic speech recognition speech to text optical character recognition");
  });

  it("deduplicates expansions when multiple aliases overlap", () => {
    expect(expandSearchAliases("ui ux ui")).toBe("ui ux ui user interface user experience");
  });
});

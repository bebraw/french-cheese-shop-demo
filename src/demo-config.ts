import type { ShopState, SimulationSeason } from "./cheese/catalog";

export const DEFAULT_QUERY = "I want something like Brie, but stronger.";
export const DEFAULT_ROOM_ID = "demo-room";
export const MINIMUM_ROOM_ID_LENGTH = 3;
export const MAXIMUM_ROOM_ID_LENGTH = 32;

export const challengeSequence = ["challenge-1", "challenge-2", "challenge-3"] as const;

export type DemoChallengeId = (typeof challengeSequence)[number];
export type DemoScenarioId = "baseline" | DemoChallengeId;
export type SearchBackend = "rules" | "llm";

export interface DemoPresetOption {
  id: string;
  label: string;
  value: string;
}

export interface DemoScenarioCopy {
  title: string;
  description: string;
  insightLabel: string;
  audienceLabel: string;
  audiencePlaceholder: string;
  audiencePrompt: string;
  audienceSummaryLabel: string;
  audienceSummaryEmptyText: string;
  presets: readonly DemoPresetOption[];
}

export const seasonOptions = [
  { id: "spring", label: "Spring menu" },
  { id: "summer", label: "Summer picnic" },
  { id: "autumn", label: "Autumn board" },
  { id: "winter", label: "Winter holiday" },
] as const satisfies readonly { id: SimulationSeason; label: string }[];

export const shopStateOptions = [
  { id: "normal", label: "Normal service" },
  { id: "holiday-rush", label: "Holiday rush" },
] as const satisfies readonly { id: ShopState; label: string }[];

export const backendOptions = [
  { id: "rules", label: "Deterministic rules" },
  { id: "llm", label: "LLM backend" },
] as const satisfies readonly { id: SearchBackend; label: string }[];

export const scenarioCopy: Record<DemoScenarioId, DemoScenarioCopy> = {
  baseline: {
    title: "Baseline",
    description: "Start with the request wording alone.",
    insightLabel: "Signals in play",
    audienceLabel: "",
    audiencePlaceholder: "",
    audiencePrompt: "",
    audienceSummaryLabel: "",
    audienceSummaryEmptyText: "",
    presets: [],
  },
  "challenge-1": {
    title: "Challenge 1: Hidden Needs",
    description: "Clarify what the customer really means.",
    insightLabel: "Explicit requirements",
    audienceLabel: "Other hidden need",
    audiencePlaceholder: "Add another hidden preference.",
    audiencePrompt: "What hidden need became explicit?",
    audienceSummaryLabel: "Clarified needs",
    audienceSummaryEmptyText: "Select the newly clarified needs.",
    presets: [
      { id: "creamy", label: "Keep it creamy", value: "keep it creamy" },
      { id: "cow", label: "Cow's milk", value: "cow's milk" },
      { id: "stronger", label: "Much stronger", value: "much stronger" },
      { id: "oozy", label: "Oozy center", value: "oozy center" },
    ],
  },
  "challenge-2": {
    title: "Challenge 2: Data Requirements",
    description: "Add facts and constraints the first pass did not know.",
    insightLabel: "Extra data in play",
    audienceLabel: "Other fact or constraint",
    audiencePlaceholder: "Add another fact or constraint.",
    audiencePrompt: "What new fact or constraint do we know?",
    audienceSummaryLabel: "Known facts",
    audienceSummaryEmptyText: "Select the extra facts that should influence ranking.",
    presets: [
      { id: "cider", label: "With cider", value: "with cider" },
      { id: "washed-rind", label: "Washed rind", value: "prefers washed rind" },
      { id: "stock", label: "In stock", value: "it must be in stock" },
      { id: "budget", label: "Budget", value: "under EUR 12" },
      { id: "salad", label: "For salad", value: "for salad" },
    ],
  },
  "challenge-3": {
    title: "Challenge 3: Evaluation",
    description: "Choose what the results should visibly prove to the audience.",
    insightLabel: "Evaluation checks",
    audienceLabel: "Other evaluation criterion",
    audiencePlaceholder: "Add another success criterion.",
    audiencePrompt: "What should the results visibly show?",
    audienceSummaryLabel: "Evaluation criteria",
    audienceSummaryEmptyText: "Select the checks the final answer must satisfy.",
    presets: [
      { id: "explain", label: "Show why it fits", value: "show why it fits" },
      { id: "backup", label: "Mark a backup", value: "mark a backup choice" },
      { id: "shortlist", label: "Two finalists", value: "keep it to two finalists" },
    ],
  },
};

export function isDemoScenarioId(value: string | null | undefined): value is DemoScenarioId {
  return value === "baseline" || challengeSequence.includes(value as DemoChallengeId);
}

export function isDemoChallengeId(value: string | null | undefined): value is DemoChallengeId {
  return challengeSequence.includes(value as DemoChallengeId);
}

export function isSearchBackend(value: string | null | undefined): value is SearchBackend {
  return value === "rules" || value === "llm";
}

export function isSimulationSeason(value: string | null | undefined): value is SimulationSeason {
  return seasonOptions.some((option) => option.id === value);
}

export function isShopState(value: string | null | undefined): value is ShopState {
  return shopStateOptions.some((option) => option.id === value);
}

export function getScenarioTrail(scenario: DemoScenarioId): readonly DemoChallengeId[] {
  const scenarioIndex = challengeSequence.indexOf(scenario as DemoChallengeId);
  return scenarioIndex >= 0 ? challengeSequence.slice(0, scenarioIndex + 1) : [];
}

export function sanitizeRoomId(rawRoomId: string | null | undefined): string {
  const normalized = (rawRoomId ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length >= MINIMUM_ROOM_ID_LENGTH) {
    return normalized.slice(0, MAXIMUM_ROOM_ID_LENGTH);
  }

  return DEFAULT_ROOM_ID;
}

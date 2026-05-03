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
  voteGroupId: string;
  voteGroupLabel: string;
  recommended?: boolean;
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
  teachingOutcome: string;
  teachingFocus: string;
  teachingQuestion: string;
  teachingNotice: string;
  teachingPause: string;
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
  { id: "llm", label: "LLM-style ranking" },
] as const satisfies readonly { id: SearchBackend; label: string }[];

export const scenarioCopy: Record<DemoScenarioId, DemoScenarioCopy> = {
  baseline: {
    title: "Baseline",
    description: "Start with the request wording alone and surface the ambiguity before adding help.",
    insightLabel: "Signals in play",
    audienceLabel: "",
    audiencePlaceholder: "",
    audiencePrompt: "",
    audienceSummaryLabel: "",
    audienceSummaryEmptyText: "",
    teachingOutcome: "Interpret vague requests",
    teachingFocus: "Baseline shows how a plausible answer can still rest on hidden guesses.",
    teachingQuestion: "What does “like Brie” and “stronger” actually mean for this customer?",
    teachingNotice: "The ranking looks reasonable, but the system is still guessing about preferences, constraints, and success criteria.",
    teachingPause: "Before moving on: what assumption did the system just make?",
    presets: [],
  },
  "challenge-1": {
    title: "Challenge 1: Hidden Needs",
    description: "Clarify what the customer really means.",
    insightLabel: "Explicit requirements",
    audienceLabel: "Other hidden need",
    audiencePlaceholder: "Add another hidden preference.",
    audiencePrompt: "Now: choose the hidden need that should become explicit.",
    audienceSummaryLabel: "Clarified needs",
    audienceSummaryEmptyText: "No hidden need selected yet. Results still use the baseline ranking.",
    teachingOutcome: "Interpret vague requests",
    teachingFocus: "Challenge 1 turns hidden meaning into explicit requirements.",
    teachingQuestion: "Which preference or constraint did the first pass have to guess?",
    teachingNotice: "The query stays the same, but the ranking changes because meaning became explicit.",
    teachingPause: "Before moving on: which hidden need changed the answer most?",
    presets: [
      { id: "creamy", label: "Keep it creamy", value: "keep it creamy", voteGroupId: "texture", voteGroupLabel: "Texture", recommended: true },
      { id: "oozy", label: "Oozy center", value: "oozy center", voteGroupId: "texture", voteGroupLabel: "Texture" },
      { id: "cow", label: "Cow's milk", value: "cow's milk", voteGroupId: "milk", voteGroupLabel: "Milk" },
      { id: "goat", label: "Goat's milk", value: "goat's milk", voteGroupId: "milk", voteGroupLabel: "Milk" },
      { id: "sheep", label: "Sheep's milk", value: "sheep's milk", voteGroupId: "milk", voteGroupLabel: "Milk" },
      { id: "mixed", label: "Mixed milk ok", value: "mixed milk is acceptable", voteGroupId: "milk", voteGroupLabel: "Milk" },
      { id: "stronger", label: "Much stronger", value: "much stronger", voteGroupId: "strength", voteGroupLabel: "Strength" },
    ],
  },
  "challenge-2": {
    title: "Challenge 2: Data Requirements",
    description: "Add facts and constraints the first pass did not know.",
    insightLabel: "Extra data in play",
    audienceLabel: "Other fact or constraint",
    audiencePlaceholder: "Add another fact or constraint.",
    audiencePrompt: "Now: choose the data or operating constraint the system should use.",
    audienceSummaryLabel: "Known facts",
    audienceSummaryEmptyText: "Vote on the facts that should influence ranking.",
    teachingOutcome: "Specify domain and operational context",
    teachingFocus: "Challenge 2 adds the domain and shop context behind the prompt.",
    teachingQuestion: "Which fact, constraint, or use context must the system know before ranking?",
    teachingNotice: "Better recommendations depend on catalog data and operating context, not only better wording.",
    teachingPause: "Before moving on: which missing fact would make the result unsafe or unusable?",
    presets: [
      { id: "cider", label: "Pairing: cider", value: "with cider", voteGroupId: "pairing", voteGroupLabel: "Pairing data" },
      { id: "burgundy", label: "Pairing: Burgundy", value: "with burgundy", voteGroupId: "pairing", voteGroupLabel: "Pairing data" },
      { id: "beer", label: "Pairing: beer", value: "with beer", voteGroupId: "pairing", voteGroupLabel: "Pairing data" },
      {
        id: "washed-rind",
        label: "Catalog style: washed rind",
        value: "prefers washed rind",
        voteGroupId: "style",
        voteGroupLabel: "Catalog data",
      },
      {
        id: "stock",
        label: "Availability: in stock",
        value: "it must be in stock",
        voteGroupId: "availability",
        voteGroupLabel: "Availability constraint",
        recommended: true,
      },
      { id: "budget", label: "Price cap: under EUR 12", value: "under EUR 12", voteGroupId: "budget", voteGroupLabel: "Price constraint" },
      { id: "salad", label: "Use case: salad", value: "for salad", voteGroupId: "serving", voteGroupLabel: "Use context" },
    ],
  },
  "challenge-3": {
    title: "Challenge 3: Evaluation",
    description: "Choose what the results should visibly prove to the audience.",
    insightLabel: "Evaluation checks",
    audienceLabel: "Other evaluation criterion",
    audiencePlaceholder: "Add another success criterion.",
    audiencePrompt: "Now: choose what the results should visibly prove.",
    audienceSummaryLabel: "Evaluation criteria",
    audienceSummaryEmptyText: "Vote on the checks the final answer must satisfy.",
    teachingOutcome: "Evaluate ambiguity",
    teachingFocus: "Challenge 3 turns success criteria into inspectable checks.",
    teachingQuestion: "What should a good answer visibly prove before we trust it?",
    teachingNotice: "The goal is not one magical answer, but evidence that the recommendation is useful, trusted, and good enough.",
    teachingPause: "Close here: what evidence would make this recommendation ready to use?",
    presets: [
      {
        id: "explain",
        label: "Show why it fits",
        value: "show why it fits",
        voteGroupId: "explanation",
        voteGroupLabel: "Explanation",
        recommended: true,
      },
      { id: "tradeoffs", label: "Show trade-offs", value: "show trade-offs", voteGroupId: "tradeoffs", voteGroupLabel: "Trade-offs" },
      { id: "shortlist", label: "Two finalists", value: "keep it to two finalists", voteGroupId: "scope", voteGroupLabel: "Scope" },
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

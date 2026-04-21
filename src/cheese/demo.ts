import { cheeseCatalog, type CheeseRecord } from "./catalog";

export const MINIMUM_QUERY_LENGTH = 2;

export type DemoScenarioId = "baseline" | "challenge-1" | "challenge-2" | "challenge-3";

export interface DemoSearchParams {
  query: string;
  scenario: DemoScenarioId;
  audienceInput?: string;
}

export interface DemoResultCheck {
  label: string;
  passed: boolean;
  note: string;
}

export interface DemoSearchResult {
  cheeseId: string;
  name: string;
  meta: string;
  blurb: string;
  score: number;
  reason: string;
  matchedSignals: string[];
  checks: DemoResultCheck[];
}

export interface DemoSearchResponse {
  ok: true;
  query: string;
  scenario: DemoScenarioId;
  teachingFocus: string;
  promptLabel: string;
  audienceInput: string;
  insights: string[];
  results: DemoSearchResult[];
}

interface ParsedIntent {
  referenceCheese: CheeseRecord | null;
  targetIntensity: number | null;
  desiredMilkTypes: Set<CheeseRecord["milkType"]>;
  desiredStyles: Set<CheeseRecord["style"]>;
  desiredTextures: Set<string>;
  desiredPairings: Set<string>;
  desiredContexts: Set<string>;
  maxPrice: number | null;
  requireInStock: boolean;
  wantsShortlist: boolean;
  wantsBackup: boolean;
  wantsExplanation: boolean;
  queryTokens: Set<string>;
  audienceTokens: Set<string>;
}

const scenarioCopy: Record<DemoScenarioId, { teachingFocus: string; promptLabel: string; introInsight: string }> = {
  baseline: {
    teachingFocus: "Baseline search uses only the request wording.",
    promptLabel: "Signals in play",
    introInsight: "Only surface wording affects ranking.",
  },
  "challenge-1": {
    teachingFocus: "Challenge 1 makes hidden requirements explicit.",
    promptLabel: "Explicit requirements",
    introInsight: "Audience notes become ranking signals.",
  },
  "challenge-2": {
    teachingFocus: "Challenge 2 adds product and context data.",
    promptLabel: "Extra data in play",
    introInsight: "Ranking can use product facts and context.",
  },
  "challenge-3": {
    teachingFocus: "Challenge 3 turns success criteria into checks.",
    promptLabel: "Evaluation checks",
    introInsight: "Results are tested against explicit checks.",
  },
};

export function searchDemoCatalog({ query, scenario, audienceInput = "" }: DemoSearchParams): DemoSearchResponse {
  const normalizedAudienceInput = audienceInput.trim();
  const intent = parseIntent(query, normalizedAudienceInput, scenario);
  const scored = cheeseCatalog
    .map((cheese) => scoreCheese(cheese, intent, scenario))
    .sort((left, right) => right.score - left.score || left.cheese.name.localeCompare(right.cheese.name));

  const visibleResults = scored.slice(0, scenario === "challenge-3" ? 4 : 5).map(({ cheese, score, matchedSignals, checks }) => ({
    cheeseId: cheese.cheeseId,
    name: cheese.name,
    meta: formatMeta(cheese),
    blurb: cheese.blurb,
    score,
    reason: formatReason(cheese, matchedSignals, scenario),
    matchedSignals,
    checks,
  }));

  return {
    ok: true,
    query,
    scenario,
    teachingFocus: scenarioCopy[scenario].teachingFocus,
    promptLabel: scenarioCopy[scenario].promptLabel,
    audienceInput: normalizedAudienceInput,
    insights: buildInsights(intent, scenario, visibleResults),
    results: visibleResults,
  };
}

function scoreCheese(cheese: CheeseRecord, intent: ParsedIntent, scenario: DemoScenarioId) {
  const referenceMention = scoreReferenceMention(cheese, intent.referenceCheese);
  const referenceSimilarity = scoreReferenceSimilarity(cheese, intent.referenceCheese);
  const lexicalSimilarity = scoreLexicalSimilarity(cheese, intent.queryTokens);
  const targetIntensity = scoreTargetIntensity(cheese, intent.targetIntensity);
  const attributeFit = scoreAttributeFit(cheese, intent);
  const contextFit = scoreContextFit(cheese, intent);
  const evaluationFit = scoreEvaluationFit(cheese, intent);

  let score = 0;
  if (scenario === "baseline") {
    score = lexicalSimilarity * 0.55 + referenceMention * 0.25 + targetIntensity * 0.2;
  } else if (scenario === "challenge-1") {
    score = lexicalSimilarity * 0.1 + referenceSimilarity * 0.2 + targetIntensity * 0.35 + attributeFit * 0.35;
  } else if (scenario === "challenge-2") {
    score = lexicalSimilarity * 0.1 + referenceSimilarity * 0.2 + targetIntensity * 0.2 + attributeFit * 0.2 + contextFit * 0.3;
  } else {
    score =
      lexicalSimilarity * 0.1 +
      referenceSimilarity * 0.15 +
      targetIntensity * 0.15 +
      attributeFit * 0.15 +
      contextFit * 0.2 +
      evaluationFit * 0.25;
  }

  return {
    cheese,
    score: roundScore(score),
    matchedSignals: buildMatchedSignals(cheese, intent, scenario),
    checks: buildChecks(cheese, intent, scenario),
  };
}

function scoreReferenceMention(cheese: CheeseRecord, referenceCheese: CheeseRecord | null): number {
  if (!referenceCheese) {
    return 0;
  }

  return cheese.cheeseId === referenceCheese.cheeseId ? 1 : 0;
}

function parseIntent(query: string, audienceInput: string, scenario: DemoScenarioId): ParsedIntent {
  const normalizedQuery = normalizeText(query);
  const normalizedAudience = scenario === "baseline" ? "" : normalizeText(audienceInput);
  const combinedText = [normalizedQuery, normalizedAudience].filter(Boolean).join(" ");
  const queryTokens = tokenize(normalizedQuery);
  const audienceTokens = tokenize(normalizedAudience);
  const combinedTokens = new Set([...queryTokens, ...audienceTokens]);
  const referenceCheese = findReferenceCheese(combinedText);
  const targetIntensity = inferTargetIntensity(combinedText, referenceCheese);

  return {
    referenceCheese,
    targetIntensity,
    desiredMilkTypes: collectMilkTypes(combinedTokens),
    desiredStyles: collectStyles(combinedText, combinedTokens),
    desiredTextures: collectFromMap(combinedText, textureKeywords),
    desiredPairings: collectFromMap(combinedText, pairingKeywords),
    desiredContexts: collectFromMap(combinedText, contextKeywords),
    maxPrice: parseBudget(combinedText),
    requireInStock: combinedText.includes("in stock") || combinedText.includes("available") || combinedText.includes("sold out"),
    wantsShortlist: combinedText.includes("shortlist") || combinedText.includes("options") || combinedText.includes("few choices"),
    wantsBackup: combinedText.includes("backup") || combinedText.includes("second option") || combinedText.includes("alternative"),
    wantsExplanation: combinedText.includes("explain") || combinedText.includes("why") || combinedText.includes("because"),
    queryTokens,
    audienceTokens,
  };
}

function findReferenceCheese(text: string): CheeseRecord | null {
  const normalized = normalizeText(text);

  for (const cheese of cheeseCatalog) {
    for (const alias of [cheese.name, ...cheese.aliases]) {
      if (normalized.includes(normalizeText(alias))) {
        return cheese;
      }
    }
  }

  return null;
}

function inferTargetIntensity(text: string, referenceCheese: CheeseRecord | null): number | null {
  const normalized = normalizeText(text);
  const referenceIntensity = referenceCheese?.intensity ?? 3;

  if (normalized.includes("much stronger") || normalized.includes("far stronger")) {
    return clampIntensity(referenceIntensity + 3);
  }

  if (normalized.includes("stronger") || normalized.includes("bolder") || normalized.includes("more pungent")) {
    return clampIntensity(referenceIntensity + 2);
  }

  if (normalized.includes("milder") || normalized.includes("gentler") || normalized.includes("less pungent")) {
    return clampIntensity(referenceIntensity - 1);
  }

  if (normalized.includes("strong") || normalized.includes("pungent")) {
    return 5;
  }

  if (normalized.includes("medium")) {
    return 3;
  }

  if (normalized.includes("mild")) {
    return 2;
  }

  return referenceCheese ? referenceIntensity : null;
}

function collectMilkTypes(tokens: Set<string>): Set<CheeseRecord["milkType"]> {
  const milkTypes = new Set<CheeseRecord["milkType"]>();

  if (tokens.has("cow")) {
    milkTypes.add("cow");
  }
  if (tokens.has("goat")) {
    milkTypes.add("goat");
  }
  if (tokens.has("sheep")) {
    milkTypes.add("sheep");
  }

  return milkTypes;
}

function collectStyles(text: string, tokens: Set<string>): Set<CheeseRecord["style"]> {
  const styles = new Set<CheeseRecord["style"]>();

  if (text.includes("washed rind")) {
    styles.add("washed rind");
  }
  if (text.includes("bloomy rind")) {
    styles.add("bloomy rind");
  }
  if (tokens.has("blue")) {
    styles.add("blue");
  }
  if (tokens.has("pressed")) {
    styles.add("pressed");
  }
  if (tokens.has("goat")) {
    styles.add("fresh goat");
  }

  return styles;
}

const textureKeywords = new Map<string, string>([
  ["creamy", "creamy"],
  ["oozy", "oozy"],
  ["soft", "soft"],
  ["buttery", "buttery"],
  ["firm", "firm"],
  ["dense", "dense"],
  ["chalky", "chalky"],
]);

const pairingKeywords = new Map<string, string>([
  ["cider", "cider"],
  ["wine", "burgundy"],
  ["burgundy", "burgundy"],
  ["beer", "beer"],
  ["baguette", "baguette"],
  ["pear", "pear"],
  ["apple", "apple"],
]);

const contextKeywords = new Map<string, string>([
  ["board", "cheese board"],
  ["cheese board", "cheese board"],
  ["salad", "salad"],
  ["dessert", "dessert"],
  ["picnic", "picnic"],
  ["aperitif", "aperitif"],
  ["starter", "starter"],
]);

function collectFromMap(text: string, map: Map<string, string>): Set<string> {
  const values = new Set<string>();

  for (const [keyword, value] of map) {
    if (text.includes(keyword)) {
      values.add(value);
    }
  }

  return values;
}

function parseBudget(text: string): number | null {
  const underMatch = /under\s+e?u?r?\s*([0-9]{1,2})/.exec(text);
  if (underMatch) {
    return Number(underMatch[1]);
  }

  if (text.includes("budget") || text.includes("affordable")) {
    return 15;
  }

  return null;
}

function scoreReferenceSimilarity(cheese: CheeseRecord, referenceCheese: CheeseRecord | null): number {
  if (!referenceCheese) {
    return 0;
  }

  if (cheese.cheeseId === referenceCheese.cheeseId) {
    return 1;
  }

  const sharedTextures = cheese.textures.filter((texture) => referenceCheese.textures.includes(texture)).length;
  const textureScore = sharedTextures / Math.max(cheese.textures.length, referenceCheese.textures.length);
  const milkScore = cheese.milkType === referenceCheese.milkType ? 1 : 0;
  const styleScore = cheese.style === referenceCheese.style ? 1 : 0;
  const intensityScore = 1 - Math.min(Math.abs(cheese.intensity - referenceCheese.intensity), 4) / 4;

  return textureScore * 0.3 + milkScore * 0.35 + styleScore * 0.2 + intensityScore * 0.15;
}

function scoreLexicalSimilarity(cheese: CheeseRecord, queryTokens: Set<string>): number {
  if (queryTokens.size === 0) {
    return 0;
  }

  const cheeseTokens = tokenize(
    normalizeText(
      [
        cheese.name,
        ...cheese.aliases,
        cheese.region,
        cheese.milkType,
        cheese.style,
        cheese.blurb,
        ...cheese.textures,
        ...cheese.pairings,
        ...cheese.servingContexts,
      ].join(" "),
    ),
  );

  let overlap = 0;
  for (const token of queryTokens) {
    if (cheeseTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / queryTokens.size;
}

function scoreTargetIntensity(cheese: CheeseRecord, targetIntensity: number | null): number {
  if (targetIntensity === null) {
    return 0.5;
  }

  return 1 - Math.min(Math.abs(cheese.intensity - targetIntensity), 4) / 4;
}

function scoreAttributeFit(cheese: CheeseRecord, intent: ParsedIntent): number {
  const checks: number[] = [];

  if (intent.desiredMilkTypes.size > 0) {
    checks.push(intent.desiredMilkTypes.has(cheese.milkType) ? 1 : 0);
  }
  if (intent.desiredStyles.size > 0) {
    checks.push(intent.desiredStyles.has(cheese.style) ? 1 : 0);
  }
  if (intent.desiredTextures.size > 0) {
    const matchedTextures = [...intent.desiredTextures].filter((texture) => cheese.textures.includes(texture)).length;
    checks.push(matchedTextures / intent.desiredTextures.size);
  }
  if (intent.maxPrice !== null) {
    checks.push(cheese.priceEur <= intent.maxPrice ? 1 : 0);
  }

  return averageOrDefault(checks, 0.5);
}

function scoreContextFit(cheese: CheeseRecord, intent: ParsedIntent): number {
  const checks: number[] = [];

  if (intent.desiredPairings.size > 0) {
    const matchedPairings = [...intent.desiredPairings].filter((pairing) => cheese.pairings.includes(pairing)).length;
    checks.push(matchedPairings / intent.desiredPairings.size);
  }
  if (intent.desiredContexts.size > 0) {
    const matchedContexts = [...intent.desiredContexts].filter((context) => cheese.servingContexts.includes(context)).length;
    checks.push(matchedContexts / intent.desiredContexts.size);
  }
  if (intent.requireInStock) {
    checks.push(cheese.stock === "in" ? 1 : cheese.stock === "low" ? 0.45 : 0);
  }

  return averageOrDefault(checks, 0.5);
}

function scoreEvaluationFit(cheese: CheeseRecord, intent: ParsedIntent): number {
  const checks = buildChecks(cheese, intent, "challenge-3");
  return averageOrDefault(
    checks.map((check) => (check.passed ? 1 : 0)),
    0.5,
  );
}

function buildMatchedSignals(cheese: CheeseRecord, intent: ParsedIntent, scenario: DemoScenarioId): string[] {
  const signals: string[] = [];

  if (scenario !== "baseline" && intent.referenceCheese && cheese.cheeseId !== intent.referenceCheese.cheeseId) {
    signals.push(`Similar milk/style profile to ${intent.referenceCheese.name}`);
  }
  if (intent.targetIntensity !== null && scoreTargetIntensity(cheese, intent.targetIntensity) >= 0.75) {
    signals.push("Close to the requested strength");
  }
  if (intent.desiredTextures.size > 0) {
    const matchedTextures = [...intent.desiredTextures].filter((texture) => cheese.textures.includes(texture));
    if (matchedTextures.length > 0) {
      signals.push(`Matches texture cue: ${matchedTextures.join(", ")}`);
    }
  }
  if (scenario !== "baseline" && intent.desiredPairings.size > 0) {
    const matchedPairings = [...intent.desiredPairings].filter((pairing) => cheese.pairings.includes(pairing));
    if (matchedPairings.length > 0) {
      signals.push(`Works with ${matchedPairings.join(", ")}`);
    }
  }
  if (scenario !== "baseline" && intent.requireInStock && cheese.stock === "in") {
    signals.push("Currently in stock");
  }

  return signals.length > 0 ? signals : ["Closest overall fit in the current scenario"];
}

function buildChecks(cheese: CheeseRecord, intent: ParsedIntent, scenario: DemoScenarioId): DemoResultCheck[] {
  if (scenario !== "challenge-3") {
    return [];
  }

  const checks: DemoResultCheck[] = [];

  checks.push({
    label: "Strength fits the request",
    passed: intent.targetIntensity === null || scoreTargetIntensity(cheese, intent.targetIntensity) >= 0.75,
    note: `Intensity ${cheese.intensity}/5`,
  });

  checks.push({
    label: "Enough similarity to the reference",
    passed: !intent.referenceCheese || scoreReferenceSimilarity(cheese, intent.referenceCheese) >= 0.45,
    note: intent.referenceCheese ? `Compared with ${intent.referenceCheese.name}` : "No reference cheese supplied",
  });

  checks.push({
    label: "Operationally available",
    passed: !intent.requireInStock || cheese.stock === "in",
    note: cheese.stock === "in" ? "In stock today" : cheese.stock === "low" ? "Low stock" : "Sold out",
  });

  checks.push({
    label: "Easy to explain to the audience",
    passed: intent.wantsExplanation ? cheese.blurb.length > 80 : true,
    note: intent.wantsExplanation ? "Recommendation includes a comparison-friendly rationale" : "Explanation not requested",
  });

  return checks;
}

function buildInsights(intent: ParsedIntent, scenario: DemoScenarioId, results: DemoSearchResult[]): string[] {
  const insights = [scenarioCopy[scenario].introInsight];

  if (intent.referenceCheese) {
    insights.push(`Reference cheese: ${intent.referenceCheese.name}.`);
  }
  if (intent.targetIntensity !== null) {
    insights.push(`Strength target: ${intent.targetIntensity}/5.`);
  }
  if (scenario !== "baseline" && intent.desiredTextures.size > 0) {
    insights.push(`Explicit textures: ${[...intent.desiredTextures].join(", ")}.`);
  }
  if (scenario !== "baseline" && intent.desiredPairings.size > 0) {
    insights.push(`Context data: ${[...intent.desiredPairings].join(", ")}.`);
  }
  if (scenario !== "baseline" && intent.requireInStock) {
    insights.push("In-stock filtering is on.");
  }
  if (scenario === "challenge-3" && results.length > 0) {
    const failedChecks = results[0].checks.filter((check) => !check.passed).map((check) => check.label.toLowerCase());
    insights.push(
      failedChecks.length > 0 ? `Top result still misses: ${failedChecks.join(", ")}.` : "Top result passes the current checks.",
    );
  }

  return insights;
}

function formatMeta(cheese: CheeseRecord): string {
  return [cheese.region, cheese.milkType + "'s milk", cheese.style, `strength ${cheese.intensity}/5`, `EUR ${cheese.priceEur}`].join(" • ");
}

function formatReason(cheese: CheeseRecord, matchedSignals: string[], scenario: DemoScenarioId): string {
  const stockLabel = cheese.stock === "in" ? "in stock" : cheese.stock === "low" ? "low stock" : "sold out";
  const scenarioSuffix =
    scenario === "baseline"
      ? "Surface match only."
      : scenario === "challenge-3"
        ? "Also checked against the evaluation criteria."
        : "Audience notes now affect the ranking.";

  return `${matchedSignals[0]}. ${cheese.name} is ${stockLabel}. ${scenarioSuffix}`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .split(/[^a-z0-9]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

function averageOrDefault(values: number[], defaultValue: number): number {
  if (values.length === 0) {
    return defaultValue;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clampIntensity(value: number): number {
  return Math.max(1, Math.min(5, value));
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

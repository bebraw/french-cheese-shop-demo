import { cheeseCatalog, type CheeseRecord, type ShopState, type SimulationSeason } from "./catalog";

export const MINIMUM_QUERY_LENGTH = 2;

export type DemoScenarioId = "baseline" | "challenge-1" | "challenge-2" | "challenge-3";
export type SearchBackend = "rules" | "llm";

export interface DemoSearchParams {
  query: string;
  scenario: DemoScenarioId;
  audienceInput?: string;
  season?: SimulationSeason | "";
  shopState?: ShopState | "";
  backend?: SearchBackend;
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
  explanation: string;
  presentationTag: string;
  matchedSignals: string[];
  checks: DemoResultCheck[];
}

export interface DemoSearchResponse {
  ok: true;
  query: string;
  scenario: DemoScenarioId;
  backend: SearchBackend;
  backendLabel: string;
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
  season: SimulationSeason | "";
  shopState: ShopState | "";
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

const backendCopy: Record<SearchBackend, { label: string; insight?: string }> = {
  rules: {
    label: "Deterministic rules",
  },
  llm: {
    label: "LLM backend",
    insight: "Backend mode: local LLM-style contrast.",
  },
};

export function searchDemoCatalog({
  query,
  scenario,
  audienceInput = "",
  season = "",
  shopState = "",
  backend = "rules",
}: DemoSearchParams): DemoSearchResponse {
  const normalizedAudienceInput = audienceInput.trim();
  const intent = parseIntent(query, normalizedAudienceInput, scenario, season, shopState);
  const scored = cheeseCatalog
    .map((cheese) => scoreCheese(cheese, intent, scenario, backend))
    .sort((left, right) => right.score - left.score || left.cheese.name.localeCompare(right.cheese.name));
  const visibleCount = scenario === "challenge-3" ? (intent.wantsShortlist ? 2 : 4) : 5;
  const visibleScored = scored.slice(0, visibleCount);
  const backupOptionName = intent.wantsBackup && visibleScored[1] ? visibleScored[1].cheese.name : null;

  const visibleResults = visibleScored.map(({ cheese, score, matchedSignals }, index) => {
    const effectiveStock = resolveEffectiveStock(cheese, intent);

    return {
      cheeseId: cheese.cheeseId,
      name: cheese.name,
      meta: formatMeta(cheese),
      blurb: cheese.blurb,
      score,
      reason: formatReason(cheese, matchedSignals, scenario, intent, effectiveStock, backend),
      explanation: buildExplanation(cheese, matchedSignals, scenario, intent),
      presentationTag: buildPresentationTag(index, scenario, intent),
      matchedSignals,
      checks: buildChecks(cheese, intent, scenario, index, backupOptionName, effectiveStock),
    };
  });

  return {
    ok: true,
    query,
    scenario,
    backend,
    backendLabel: backendCopy[backend].label,
    teachingFocus: scenarioCopy[scenario].teachingFocus,
    promptLabel: scenarioCopy[scenario].promptLabel,
    audienceInput: normalizedAudienceInput,
    insights: buildInsights(intent, scenario, visibleResults, backend),
    results: visibleResults,
  };
}

function scoreCheese(cheese: CheeseRecord, intent: ParsedIntent, scenario: DemoScenarioId, backend: SearchBackend) {
  const referenceMention = scoreReferenceMention(cheese, intent.referenceCheese);
  const referenceSimilarity = scoreReferenceSimilarity(cheese, intent.referenceCheese);
  const lexicalSimilarity = scoreLexicalSimilarity(cheese, intent.queryTokens);
  const targetIntensity = scoreTargetIntensity(cheese, intent.targetIntensity);
  const attributeFit = scoreAttributeFit(cheese, intent);
  const contextFit = scoreContextFit(cheese, intent);
  const evaluationFit = scoreEvaluationFit(cheese, intent);
  const bridgeFit = scoreBridgeFit(cheese, intent.referenceCheese, intent.targetIntensity);

  let score = 0;
  if (backend === "rules" && scenario === "baseline") {
    score = lexicalSimilarity * 0.55 + referenceMention * 0.25 + targetIntensity * 0.2;
  } else if (backend === "rules" && scenario === "challenge-1") {
    score = lexicalSimilarity * 0.1 + referenceSimilarity * 0.2 + targetIntensity * 0.35 + attributeFit * 0.35;
  } else if (backend === "rules" && scenario === "challenge-2") {
    score = lexicalSimilarity * 0.1 + referenceSimilarity * 0.2 + targetIntensity * 0.2 + attributeFit * 0.2 + contextFit * 0.3;
  } else if (backend === "rules") {
    score =
      lexicalSimilarity * 0.1 +
      referenceSimilarity * 0.15 +
      targetIntensity * 0.15 +
      attributeFit * 0.15 +
      contextFit * 0.2 +
      evaluationFit * 0.25;
  } else if (scenario === "baseline") {
    score = lexicalSimilarity * 0.18 + referenceMention * 0.06 + referenceSimilarity * 0.26 + targetIntensity * 0.14 + bridgeFit * 0.36;
  } else if (scenario === "challenge-1") {
    score =
      lexicalSimilarity * 0.08 +
      referenceSimilarity * 0.2 +
      targetIntensity * 0.2 +
      attributeFit * 0.16 +
      contextFit * 0.06 +
      bridgeFit * 0.3;
  } else if (scenario === "challenge-2") {
    score =
      lexicalSimilarity * 0.06 +
      referenceSimilarity * 0.18 +
      targetIntensity * 0.14 +
      attributeFit * 0.1 +
      contextFit * 0.16 +
      bridgeFit * 0.36;
  } else {
    score =
      lexicalSimilarity * 0.06 +
      referenceSimilarity * 0.14 +
      targetIntensity * 0.12 +
      attributeFit * 0.08 +
      contextFit * 0.14 +
      evaluationFit * 0.18 +
      bridgeFit * 0.28;
  }

  if (hasSimulationContext(intent)) {
    score +=
      backend === "rules"
        ? scenario === "baseline"
          ? contextFit * 0.2
          : scenario === "challenge-1"
            ? contextFit * 0.12
            : 0
        : scenario === "baseline"
          ? contextFit * 0.08
          : 0;
  }

  return {
    cheese,
    score: roundScore(score),
    matchedSignals: buildMatchedSignals(cheese, intent, scenario, backend),
  };
}

function scoreReferenceMention(cheese: CheeseRecord, referenceCheese: CheeseRecord | null): number {
  if (!referenceCheese) {
    return 0;
  }

  return cheese.cheeseId === referenceCheese.cheeseId ? 1 : 0;
}

function parseIntent(
  query: string,
  audienceInput: string,
  scenario: DemoScenarioId,
  season: SimulationSeason | "",
  shopState: ShopState | "",
): ParsedIntent {
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
    wantsShortlist:
      combinedText.includes("shortlist") ||
      combinedText.includes("options") ||
      combinedText.includes("few choices") ||
      combinedText.includes("two finalists"),
    wantsBackup:
      combinedText.includes("backup") ||
      combinedText.includes("second option") ||
      combinedText.includes("alternative") ||
      combinedText.includes("fallback"),
    wantsExplanation:
      combinedText.includes("explain") ||
      combinedText.includes("why") ||
      combinedText.includes("because") ||
      combinedText.includes("show why"),
    season,
    shopState,
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
  const effectiveStock = resolveEffectiveStock(cheese, intent);

  if (intent.desiredPairings.size > 0) {
    const matchedPairings = [...intent.desiredPairings].filter((pairing) => cheese.pairings.includes(pairing)).length;
    checks.push(matchedPairings / intent.desiredPairings.size);
  }
  if (intent.desiredContexts.size > 0) {
    const matchedContexts = [...intent.desiredContexts].filter((context) => cheese.servingContexts.includes(context)).length;
    checks.push(matchedContexts / intent.desiredContexts.size);
  }
  if (intent.requireInStock) {
    checks.push(scoreStockLevel(effectiveStock));
  }
  if (hasSimulationContext(intent)) {
    checks.push(scoreStockLevel(effectiveStock));
  }
  if (intent.season) {
    checks.push(scoreSeasonFit(cheese, intent.season));
  }

  return averageOrDefault(checks, 0.5);
}

function scoreBridgeFit(cheese: CheeseRecord, referenceCheese: CheeseRecord | null, targetIntensity: number | null): number {
  if (!referenceCheese) {
    return 0.5;
  }

  if (cheese.cheeseId === referenceCheese.cheeseId) {
    return 0.35;
  }

  const sharedTextures = cheese.textures.filter((texture) => referenceCheese.textures.includes(texture)).length;
  const textureScore = sharedTextures / Math.max(cheese.textures.length, referenceCheese.textures.length);
  const milkScore = cheese.milkType === referenceCheese.milkType ? 1 : 0;
  const styleScore = cheese.style === referenceCheese.style ? 1 : 0.2;
  const bridgeTarget =
    targetIntensity !== null && targetIntensity > referenceCheese.intensity
      ? Math.min(targetIntensity, referenceCheese.intensity + 1)
      : referenceCheese.intensity;
  const intensityScore = 1 - Math.min(Math.abs(cheese.intensity - bridgeTarget), 4) / 4;

  return textureScore * 0.25 + milkScore * 0.25 + styleScore * 0.3 + intensityScore * 0.2;
}

function scoreEvaluationFit(cheese: CheeseRecord, intent: ParsedIntent): number {
  const effectiveStock = resolveEffectiveStock(cheese, intent);
  const checks: DemoResultCheck[] = [
    {
      label: "Strength fits the request",
      passed: intent.targetIntensity === null || scoreTargetIntensity(cheese, intent.targetIntensity) >= 0.75,
      note: `Intensity ${cheese.intensity}/5`,
    },
    {
      label: "Enough similarity to the reference",
      passed: !intent.referenceCheese || scoreReferenceSimilarity(cheese, intent.referenceCheese) >= 0.45,
      note: intent.referenceCheese ? `Compared with ${intent.referenceCheese.name}` : "No reference cheese supplied",
    },
    {
      label: "Operationally available",
      passed: !intent.requireInStock || effectiveStock === "in",
      note: formatStockNote(effectiveStock),
    },
    {
      label: "Easy to explain to the audience",
      passed: intent.wantsExplanation ? cheese.blurb.length > 80 : true,
      note: intent.wantsExplanation ? "Recommendation includes a comparison-friendly rationale" : "Explanation not requested",
    },
  ];

  return averageOrDefault(
    checks.map((check) => (check.passed ? 1 : 0)),
    0.5,
  );
}

function buildMatchedSignals(cheese: CheeseRecord, intent: ParsedIntent, scenario: DemoScenarioId, backend: SearchBackend): string[] {
  const signals: string[] = [];
  const effectiveStock = resolveEffectiveStock(cheese, intent);

  if (backend === "llm" && intent.referenceCheese && scoreBridgeFit(cheese, intent.referenceCheese, intent.targetIntensity) >= 0.75) {
    signals.push(`Analogy fit: familiar step from ${intent.referenceCheese.name}`);
  }
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
  if (scenario !== "baseline" && intent.requireInStock && effectiveStock === "in") {
    signals.push("Currently in stock");
  }
  if (hasSimulationContext(intent)) {
    signals.push(`Simulation stock: ${formatStockLabel(effectiveStock)}`);
  }
  if (intent.season && scoreSeasonFit(cheese, intent.season) >= 0.95) {
    signals.push(`Seasonal fit: ${formatSeasonLabel(intent.season)}`);
  }

  return signals.length > 0 ? signals : ["Closest overall fit in the current scenario"];
}

function buildChecks(
  cheese: CheeseRecord,
  intent: ParsedIntent,
  scenario: DemoScenarioId,
  rank: number,
  backupOptionName: string | null,
  effectiveStock: CheeseRecord["stock"],
): DemoResultCheck[] {
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
    passed: !intent.requireInStock || effectiveStock === "in",
    note: formatStockNote(effectiveStock),
  });

  checks.push({
    label: "Easy to explain to the audience",
    passed: intent.wantsExplanation ? cheese.blurb.length > 80 : true,
    note: intent.wantsExplanation ? "Recommendation includes a comparison-friendly rationale" : "Explanation not requested",
  });

  if (intent.wantsBackup && rank === 0) {
    checks.push({
      label: "Backup choice is visible",
      passed: backupOptionName !== null,
      note: backupOptionName ? `Backup choice: ${backupOptionName}` : "No backup choice is visible yet",
    });
  }

  return checks;
}

function buildInsights(intent: ParsedIntent, scenario: DemoScenarioId, results: DemoSearchResult[], backend: SearchBackend): string[] {
  const insights = [scenarioCopy[scenario].introInsight];

  if (backendCopy[backend].insight) {
    insights.push(backendCopy[backend].insight);
  }

  if (intent.referenceCheese) {
    insights.push(`Reference cheese: ${intent.referenceCheese.name}.`);
  }
  if (intent.targetIntensity !== null) {
    insights.push(`Strength target: ${intent.targetIntensity}/5.`);
  }
  if (scenario !== "baseline" && intent.desiredMilkTypes.size > 0) {
    insights.push(`Explicit milk types: ${[...intent.desiredMilkTypes].join(", ")}.`);
  }
  if (scenario !== "baseline" && intent.desiredStyles.size > 0) {
    insights.push(`Explicit styles: ${[...intent.desiredStyles].join(", ")}.`);
  }
  if (scenario !== "baseline" && intent.desiredTextures.size > 0) {
    insights.push(`Explicit textures: ${[...intent.desiredTextures].join(", ")}.`);
  }
  if ((scenario === "challenge-2" || scenario === "challenge-3") && intent.desiredPairings.size > 0) {
    insights.push(`Context data: ${[...intent.desiredPairings].join(", ")}.`);
  }
  if ((scenario === "challenge-2" || scenario === "challenge-3") && intent.desiredContexts.size > 0) {
    insights.push(`Serving context: ${[...intent.desiredContexts].join(", ")}.`);
  }
  if ((scenario === "challenge-2" || scenario === "challenge-3") && intent.maxPrice !== null) {
    insights.push(`Budget cap: EUR ${intent.maxPrice}.`);
  }
  if ((scenario === "challenge-2" || scenario === "challenge-3") && intent.requireInStock) {
    insights.push("In-stock filtering is on.");
  }
  if (hasSimulationContext(intent)) {
    const contextParts: string[] = [];
    if (intent.season) {
      contextParts.push(`${intent.season} season`);
    }
    if (intent.shopState === "holiday-rush") {
      contextParts.push("holiday-rush demand");
    } else if (intent.shopState === "normal") {
      contextParts.push("normal service");
    }
    if (contextParts.length > 0) {
      insights.push(`Simulation context: ${contextParts.join(" and ")}.`);
    }
    if (intent.season && results.length > 0) {
      const seasonLabel = formatSeasonLabel(intent.season);
      const seasonalLeaders = results
        .filter((result) => result.matchedSignals.some((signal) => signal === `Seasonal fit: ${seasonLabel}`))
        .map((result) => result.name);

      if (seasonalLeaders.length > 0) {
        insights.push(`Seasonal leaders: ${seasonalLeaders.join(", ")}.`);
      }
    }
  }
  if (scenario === "challenge-3") {
    const evaluationSignals: string[] = [];

    if (intent.wantsExplanation) {
      evaluationSignals.push("explain why it fits");
    }
    if (intent.wantsBackup) {
      evaluationSignals.push("give a backup option");
    }
    if (intent.wantsShortlist) {
      evaluationSignals.push("return a shortlist");
    }

    if (evaluationSignals.length > 0) {
      insights.push(`Evaluation asks: ${evaluationSignals.join(", ")}.`);
    }
    if (intent.wantsShortlist) {
      insights.push("Showing two finalists instead of the full shortlist.");
    }
    if (intent.wantsBackup && results[1]) {
      insights.push(`Backup choice is marked on ${results[1].name}.`);
    }
    if (intent.wantsExplanation) {
      insights.push("Expanded cards include a direct why-it-fits explanation.");
    }
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

function buildPresentationTag(rank: number, scenario: DemoScenarioId, intent: ParsedIntent): string {
  if (scenario !== "challenge-3") {
    return "";
  }

  if (rank === 0) {
    return "Top pick";
  }
  if (intent.wantsBackup && rank === 1) {
    return "Backup choice";
  }

  return "";
}

function buildExplanation(cheese: CheeseRecord, matchedSignals: string[], scenario: DemoScenarioId, intent: ParsedIntent): string {
  if (scenario !== "challenge-3" || !intent.wantsExplanation) {
    return "";
  }

  const leadSignal = matchedSignals[0] || "It is the closest overall fit in the current scenario";
  const supportSignal = matchedSignals[1] || `its ${cheese.style} style keeps the comparison concrete for the audience`;

  return `${leadSignal}. ${supportSignal}.`;
}

function formatReason(
  cheese: CheeseRecord,
  matchedSignals: string[],
  scenario: DemoScenarioId,
  intent: ParsedIntent,
  effectiveStock: CheeseRecord["stock"],
  backend: SearchBackend,
): string {
  const stockLabel = formatStockLabel(effectiveStock);
  const scenarioSuffix =
    scenario === "baseline"
      ? hasSimulationContext(intent)
        ? "Surface match with shared world context."
        : "Surface match only."
      : scenario === "challenge-3"
        ? intent.wantsExplanation
          ? "Use the explanation panel to justify the choice."
          : "Also checked against the evaluation criteria."
        : "Audience notes now affect the ranking.";
  const backendSuffix = backend === "llm" ? " The backend leans on analogy over strict rule matching." : "";

  return `${matchedSignals[0]}. ${cheese.name} is ${stockLabel}. ${scenarioSuffix}${backendSuffix}`;
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

function hasSimulationContext(intent: ParsedIntent): boolean {
  return Boolean(intent.season || intent.shopState);
}

function resolveEffectiveStock(cheese: CheeseRecord, intent: ParsedIntent): CheeseRecord["stock"] {
  let stock = cheese.stock;

  if (intent.season && cheese.seasonalStock?.[intent.season]) {
    stock = pickLowerStock(stock, cheese.seasonalStock[intent.season] || stock);
  }

  if (intent.shopState === "holiday-rush" && cheese.holidayRushStock) {
    stock = pickLowerStock(stock, cheese.holidayRushStock);
  }

  return stock;
}

function scoreSeasonFit(cheese: CheeseRecord, season: SimulationSeason): number {
  if (!cheese.bestSeasons || cheese.bestSeasons.length === 0) {
    return 0.5;
  }

  return cheese.bestSeasons.includes(season) ? 1 : 0.2;
}

function pickLowerStock(left: CheeseRecord["stock"], right: CheeseRecord["stock"]): CheeseRecord["stock"] {
  return stockSeverity(left) <= stockSeverity(right) ? left : right;
}

function stockSeverity(stock: CheeseRecord["stock"]): number {
  return stock === "out" ? 0 : stock === "low" ? 1 : 2;
}

function scoreStockLevel(stock: CheeseRecord["stock"]): number {
  return stock === "in" ? 1 : stock === "low" ? 0.45 : 0;
}

function formatStockLabel(stock: CheeseRecord["stock"]): string {
  return stock === "in" ? "in stock" : stock === "low" ? "low stock" : "sold out";
}

function formatStockNote(stock: CheeseRecord["stock"]): string {
  return stock === "in" ? "In stock in this context" : stock === "low" ? "Low stock in this context" : "Sold out in this context";
}

function formatSeasonLabel(season: SimulationSeason): string {
  return season === "spring"
    ? "spring menu"
    : season === "summer"
      ? "summer picnic"
      : season === "autumn"
        ? "autumn board"
        : "winter holiday";
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

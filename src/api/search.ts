import { MINIMUM_QUERY_LENGTH, searchDemoCatalog, type DemoScenarioId } from "../cheese/demo";
import type { ShopState, SimulationSeason } from "../cheese/catalog";
import { jsonResponse } from "../views/shared";

const genericSearchErrorMessage = "Cheese search is currently unavailable.";

export async function createSearchResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const scenario = readScenario(url.searchParams.get("scenario"));
  const audienceInput = url.searchParams.get("audience")?.trim() ?? "";
  const season = readSeason(url.searchParams.get("season"));
  const shopState = readShopState(url.searchParams.get("shopState"));

  if (query.length < MINIMUM_QUERY_LENGTH) {
    return jsonResponse(
      {
        ok: false,
        error: `Search queries must be at least ${MINIMUM_QUERY_LENGTH} characters long.`,
        minimumQueryLength: MINIMUM_QUERY_LENGTH,
      },
      { status: 400 },
    );
  }

  try {
    const response = searchDemoCatalog({
      query,
      scenario,
      audienceInput,
      season,
      shopState,
    });
    return jsonResponse(response);
  } catch (error) {
    console.error("Cheese search failed.", error);

    return jsonResponse(
      {
        ok: false,
        error: genericSearchErrorMessage,
      },
      { status: 503 },
    );
  }
}

function readSeason(rawSeason: string | null): SimulationSeason | "" {
  if (rawSeason === "spring" || rawSeason === "summer" || rawSeason === "autumn" || rawSeason === "winter") {
    return rawSeason;
  }

  return "";
}

function readShopState(rawShopState: string | null): ShopState | "" {
  if (rawShopState === "normal" || rawShopState === "holiday-rush") {
    return rawShopState;
  }

  return "";
}

function readScenario(rawScenario: string | null): DemoScenarioId {
  if (rawScenario === "baseline" || rawScenario === "challenge-1" || rawScenario === "challenge-2" || rawScenario === "challenge-3") {
    return rawScenario;
  }

  return "baseline";
}

import { MINIMUM_QUERY_LENGTH, searchDemoCatalog, type DemoScenarioId } from "../cheese/demo";
import { jsonResponse } from "../views/shared";

const genericSearchErrorMessage = "Cheese search is currently unavailable.";

export async function createSearchResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const scenario = readScenario(url.searchParams.get("scenario"));
  const audienceInput = url.searchParams.get("audience")?.trim() ?? "";

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

function readScenario(rawScenario: string | null): DemoScenarioId {
  if (rawScenario === "baseline" || rawScenario === "challenge-1" || rawScenario === "challenge-2" || rawScenario === "challenge-3") {
    return rawScenario;
  }

  return "baseline";
}

import { MINIMUM_QUERY_LENGTH, type SupervisorSearchEnv } from "../supervisors/types";
import { searchSupervisors } from "../supervisors/service";

export async function createSearchResponse(request: Request, env: SupervisorSearchEnv): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < MINIMUM_QUERY_LENGTH) {
    return Response.json(
      {
        ok: false,
        error: `Search queries must be at least ${MINIMUM_QUERY_LENGTH} characters long.`,
        minimumQueryLength: MINIMUM_QUERY_LENGTH,
      },
      { status: 400 },
    );
  }

  try {
    const response = await searchSupervisors(query, env);
    return Response.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supervisor search is currently unavailable.";

    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: 503 },
    );
  }
}

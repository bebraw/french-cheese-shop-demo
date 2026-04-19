import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { parseSupervisorSnapshot, planSupervisorImport } from "../src/supervisors/import.ts";
import { DEFAULT_EMBEDDING_MODEL } from "../src/supervisors/types.ts";

interface CloudflareEnvelope<T> {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result: T;
}

interface VectorListResponse {
  vectors?: string[];
  nextCursor?: string | null;
}

interface IndexInfoResponse {
  dimensions?: number;
}

const VECTORIZE_PAGE_SIZE = 1_000;
const EMBEDDING_BATCH_SIZE = 100;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      "account-id": { type: "string" },
      "api-token": { type: "string" },
      "index-name": { type: "string" },
      model: { type: "string" },
      "dry-run": { type: "boolean" },
    },
    allowPositionals: false,
  });

  const inputPath = values.input;
  const accountId = values["account-id"] ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = values["api-token"] ?? process.env.CLOUDFLARE_API_TOKEN;
  const indexName = values["index-name"] ?? process.env.SUPERVISOR_SEARCH_INDEX_NAME;
  const model = values.model ?? process.env.SUPERVISOR_SEARCH_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
  const dryRun = values["dry-run"] ?? false;

  if (!inputPath) {
    throw new Error("Missing required --input <html-file> argument.");
  }

  if (!accountId) {
    throw new Error("Missing Cloudflare account id. Use --account-id or CLOUDFLARE_ACCOUNT_ID.");
  }

  if (!apiToken) {
    throw new Error("Missing Cloudflare API token. Use --api-token or CLOUDFLARE_API_TOKEN.");
  }

  if (!indexName) {
    throw new Error("Missing Vectorize index name. Use --index-name or SUPERVISOR_SEARCH_INDEX_NAME.");
  }

  const html = await readFile(inputPath, "utf8");
  const importedAt = new Date().toISOString();
  const supervisors = parseSupervisorSnapshot(html, importedAt);

  if (supervisors.length === 0) {
    throw new Error("No supervisors were parsed from the input HTML. Update the parser adapter before importing.");
  }

  const embeddings = await createEmbeddings({
    accountId,
    apiToken,
    model,
    texts: supervisors.map((supervisor) => supervisor.searchText),
  });

  const existingIds = await listExistingVectorIds({ accountId, apiToken, indexName });
  const importPlan = planSupervisorImport(supervisors, embeddings, existingIds);
  const indexInfo = await getIndexInfo({ accountId, apiToken, indexName });

  if (typeof indexInfo.dimensions === "number" && importPlan.vectors[0] && importPlan.vectors[0].values.length !== indexInfo.dimensions) {
    throw new Error(
      `Vector dimension mismatch: index expects ${indexInfo.dimensions}, but model ${model} returned ${importPlan.vectors[0].values.length}.`,
    );
  }

  if (!dryRun) {
    await upsertVectors({
      accountId,
      apiToken,
      indexName,
      ndjson: importPlan.vectorNdjson,
    });

    if (importPlan.idsToDelete.length > 0) {
      await deleteVectors({
        accountId,
        apiToken,
        indexName,
        ids: importPlan.idsToDelete,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        status: dryRun ? "Dry run" : "Import complete",
        model,
        importedAt,
        supervisorCount: importPlan.supervisors.length,
        upsertCount: importPlan.vectors.length,
        deleteCount: importPlan.idsToDelete.length,
        idsToDelete: importPlan.idsToDelete,
      },
      null,
      2,
    ),
  );
}

async function createEmbeddings(input: { accountId: string; apiToken: string; model: string; texts: string[] }): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let index = 0; index < input.texts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = input.texts.slice(index, index + EMBEDDING_BATCH_SIZE);
    const response = await callCloudflareApi<{ data?: number[][] } | { result?: { data?: number[][] } }>({
      accountId: input.accountId,
      apiToken: input.apiToken,
      method: "POST",
      path: `/ai/run/${input.model}`,
      body: JSON.stringify({ text: batch }),
      headers: {
        "content-type": "application/json",
      },
    });

    const payload = extractEmbeddingResponse(response);
    const batchEmbeddings = payload.data ?? [];

    if (!Array.isArray(batchEmbeddings) || batchEmbeddings.length !== batch.length) {
      throw new Error(`Embedding request returned ${batchEmbeddings.length} vectors for ${batch.length} inputs.`);
    }

    embeddings.push(...batchEmbeddings.map((embedding) => embedding.map((value: number) => Number(value))));
  }

  return embeddings;
}

async function listExistingVectorIds(input: { accountId: string; apiToken: string; indexName: string }): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null | undefined;

  do {
    const query = new URLSearchParams({ count: String(VECTORIZE_PAGE_SIZE) });
    if (cursor) {
      query.set("cursor", cursor);
    }

    const response = await callCloudflareApi<VectorListResponse>({
      accountId: input.accountId,
      apiToken: input.apiToken,
      method: "GET",
      path: `/vectorize/v2/indexes/${input.indexName}/list?${query.toString()}`,
    });

    ids.push(...(response.vectors ?? []));
    cursor = response.nextCursor;
  } while (cursor);

  return ids;
}

async function getIndexInfo(input: { accountId: string; apiToken: string; indexName: string }): Promise<IndexInfoResponse> {
  return await callCloudflareApi<IndexInfoResponse>({
    accountId: input.accountId,
    apiToken: input.apiToken,
    method: "GET",
    path: `/vectorize/v2/indexes/${input.indexName}/info`,
  });
}

async function upsertVectors(input: { accountId: string; apiToken: string; indexName: string; ndjson: string }): Promise<void> {
  await callCloudflareApi<{ mutationId?: string }>({
    accountId: input.accountId,
    apiToken: input.apiToken,
    method: "POST",
    path: `/vectorize/v2/indexes/${input.indexName}/upsert`,
    body: input.ndjson,
    headers: {
      "content-type": "application/x-ndjson",
    },
  });
}

async function deleteVectors(input: { accountId: string; apiToken: string; indexName: string; ids: string[] }): Promise<void> {
  await callCloudflareApi<{ mutationId?: string }>({
    accountId: input.accountId,
    apiToken: input.apiToken,
    method: "POST",
    path: `/vectorize/v2/indexes/${input.indexName}/delete_by_ids`,
    body: JSON.stringify({ ids: input.ids }),
    headers: {
      "content-type": "application/json",
    },
  });
}

async function callCloudflareApi<T>(input: {
  accountId: string;
  apiToken: string;
  method: string;
  path: string;
  body?: BodyInit;
  headers?: Record<string, string>;
}): Promise<T> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${input.accountId}${input.path}`, {
    method: input.method,
    body: input.body,
    headers: {
      authorization: `Bearer ${input.apiToken}`,
      ...input.headers,
    },
  });

  const payload = (await response.json()) as CloudflareEnvelope<T>;

  if (!response.ok || !payload.success) {
    const message =
      payload.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join("; ") || response.statusText;
    throw new Error(`Cloudflare API request failed: ${message}`);
  }

  return payload.result;
}

function extractEmbeddingResponse(payload: { data?: number[][] } | { result?: { data?: number[][] } }): { data?: number[][] } {
  if ("data" in payload) {
    return payload;
  }

  return "result" in payload ? (payload.result ?? { data: [] }) : { data: [] };
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

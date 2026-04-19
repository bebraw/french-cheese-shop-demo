import type { SupervisorSearchEnv } from "./supervisors/types";
import { jsonResponse } from "./views/shared";

const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 30;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function enforceSearchRateLimit(request: Request, env: SupervisorSearchEnv): Response | null {
  const maxRequests = readPositiveInteger(env.SUPERVISOR_SEARCH_RATE_LIMIT_MAX_REQUESTS, DEFAULT_RATE_LIMIT_MAX_REQUESTS);
  const windowMs = readPositiveInteger(env.SUPERVISOR_SEARCH_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS);
  const bucketKey = `search:${getClientIdentifier(request)}`;
  const now = Date.now();

  pruneExpiredBuckets(now);

  const currentBucket = rateLimitBuckets.get(bucketKey);
  if (!currentBucket || currentBucket.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null;
  }

  if (currentBucket.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((currentBucket.resetAt - now) / 1000));
    return jsonResponse(
      {
        ok: false,
        error: "Too many search requests. Try again soon.",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "retry-after": String(retryAfterSeconds),
        },
      },
    );
  }

  currentBucket.count += 1;
  return null;
}

export function resetRateLimitState(): void {
  rateLimitBuckets.clear();
}

function getClientIdentifier(request: Request): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }

  return "anonymous";
}

function readPositiveInteger(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function pruneExpiredBuckets(now: number): void {
  for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey);
    }
  }
}

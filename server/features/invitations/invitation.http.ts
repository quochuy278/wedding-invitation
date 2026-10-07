import "server-only";

import { ApiErrorCode, type ApiErrorResponse } from "@/lib/api/types";
import {
  checkRateLimit,
  type RateLimitPolicy,
  type RateLimitResult,
  requestIdentity,
} from "@/server/shared/http/rate-limit";

const lookupPolicy: RateLimitPolicy = {
  namespace: "invitation-lookup",
  limit: 60,
  windowMs: 60 * 1000,
};

export function invitationRateLimit(request: Request): Response | null {
  const result: RateLimitResult = checkRateLimit(lookupPolicy, requestIdentity(request));
  if (result.allowed) return null;
  const body: ApiErrorResponse = {
    error: { code: ApiErrorCode.RateLimited, message: "Too many invitation lookups." },
  };
  return Response.json(body, {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfterSeconds),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

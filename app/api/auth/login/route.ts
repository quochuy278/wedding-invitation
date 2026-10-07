import { ApiErrorCode } from "@/lib/api/types";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import {
  authError,
  authOk,
  handleAuthRequest,
  setAuthCookies,
} from "@/server/features/auth/auth.http";
import { parseLoginInput } from "@/server/features/auth/auth.schema";
import { type AuthResult, login } from "@/server/features/auth/auth.service";
import {
  checkRateLimit,
  type RateLimitPolicy,
  type RateLimitResult,
  requestIdentity,
} from "@/server/shared/http/rate-limit";
import type { ParseResult } from "@/server/shared/validation/schema";
import type { LoginInput } from "@/shared/contracts/auth";

const clientPolicy: RateLimitPolicy = {
  namespace: "login-client",
  limit: 30,
  windowMs: 15 * 60 * 1000,
};
const accountPolicy: RateLimitPolicy = {
  namespace: "login-account",
  limit: 10,
  windowMs: 15 * 60 * 1000,
};

export async function POST(request: Request): Promise<Response> {
  if (!hasTrustedOrigin(request))
    return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
  const clientLimit: RateLimitResult = checkRateLimit(clientPolicy, requestIdentity(request));
  if (!clientLimit.allowed) return limitedResponse(clientLimit);

  return handleAuthRequest(async (): Promise<Response> => {
    let body: unknown;
    try {
      const text: string = await request.text();
      if (text.length > 8192)
        return authError(ApiErrorCode.BadRequest, "Request body is too large.", 400);
      body = JSON.parse(text);
    } catch {
      return authError(ApiErrorCode.BadRequest, "Request body must be valid JSON.", 400);
    }
    const parsed: ParseResult<LoginInput> = parseLoginInput(body);
    if (!parsed.success)
      return authError(ApiErrorCode.BadRequest, "Invalid email or password.", 400);
    const accountLimit: RateLimitResult = checkRateLimit(accountPolicy, parsed.data.email);
    if (!accountLimit.allowed) return limitedResponse(accountLimit);
    const result: AuthResult | null = await login(parsed.data);
    if (!result)
      return authError(ApiErrorCode.InvalidCredentials, "Invalid email or password.", 401);
    await setAuthCookies(result.tokens);
    return authOk(result.session);
  });
}

function limitedResponse(limit: RateLimitResult): Response {
  const response: Response = authError(ApiErrorCode.RateLimited, "Too many login attempts.", 429);
  response.headers.set("Retry-After", String(limit.retryAfterSeconds));
  return response;
}

import { ApiErrorCode } from "@/lib/api/types";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import {
  type AuthCookies,
  authError,
  authOk,
  clearAuthCookies,
  handleAuthRequest,
  readAuthCookies,
  setAuthCookies,
} from "@/server/features/auth/auth.http";
import { type AuthResult, refresh } from "@/server/features/auth/auth.service";

export async function POST(request: Request): Promise<Response> {
  if (!hasTrustedOrigin(request))
    return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
  return handleAuthRequest(async (): Promise<Response> => {
    const cookies: AuthCookies = await readAuthCookies();
    const result: AuthResult | null = await refresh(cookies.refreshToken);
    if (!result) {
      await clearAuthCookies();
      return authError(ApiErrorCode.Unauthorized, "Session is no longer valid.", 401);
    }
    await setAuthCookies(result.tokens);
    return authOk(result.session);
  });
}

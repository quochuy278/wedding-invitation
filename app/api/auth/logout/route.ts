import { ApiErrorCode } from "@/lib/api/types";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import {
  type AuthCookies,
  authError,
  authOk,
  clearAuthCookies,
  handleAuthRequest,
  readAuthCookies,
} from "@/server/features/auth/auth.http";
import { logout } from "@/server/features/auth/auth.service";
import type { LogoutDto } from "@/shared/contracts/auth";

export async function POST(request: Request): Promise<Response> {
  if (!hasTrustedOrigin(request))
    return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
  return handleAuthRequest(async (): Promise<Response> => {
    const cookies: AuthCookies = await readAuthCookies();
    await logout(cookies.accessToken, cookies.refreshToken);
    await clearAuthCookies();
    return authOk<LogoutDto>({ success: true });
  });
}

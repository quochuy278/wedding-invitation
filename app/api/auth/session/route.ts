import { ApiErrorCode } from "@/lib/api/types";
import {
  authError,
  authOk,
  getAdminSession,
  handleAuthRequest,
} from "@/server/features/auth/auth.http";
import type { AuthSessionDto } from "@/shared/contracts/auth";

export async function GET(): Promise<Response> {
  return handleAuthRequest(async (): Promise<Response> => {
    const session: AuthSessionDto | null = await getAdminSession();
    return session
      ? authOk(session)
      : authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
  });
}

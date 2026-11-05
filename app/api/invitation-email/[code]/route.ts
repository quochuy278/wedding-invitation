import { ApiErrorCode } from "@/lib/api/types";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { invitationEmailService } from "@/server/features/invitations/invitation-email.service";
import { ok } from "@/server/shared/http/api-response";
import { isInvitationCode } from "@/shared/utils/invitation-code";

export async function POST(
  request: Request,
  context: RouteContext<"/api/invitation-email/[code]">,
): Promise<Response> {
  try {
    const session = await getAdminSession();
    if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
    if (!hasTrustedOrigin(request)) {
      return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
    }
    const { code } = await context.params;
    const attempted = isInvitationCode(code) && (await invitationEmailService.send(code, true));
    if (!attempted) {
      return authError(ApiErrorCode.Conflict, "This email cannot be resent.", 409);
    }
    return privateResponse(ok({ attempted }));
  } catch {
    console.error("Invitation email retry failed.");
    return authError(ApiErrorCode.Unavailable, "Email retry is temporarily unavailable.", 503);
  }
}

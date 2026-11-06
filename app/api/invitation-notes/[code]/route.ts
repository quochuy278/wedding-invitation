import { ApiErrorCode } from "@/lib/api/types";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { parseUpdateInvitationNoteInput } from "@/server/features/invitations/invitation.schema";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { badRequest } from "@/server/shared/http/api-response";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/invitation-notes/[code]">,
): Promise<Response> {
  try {
    const session = await getAdminSession();
    if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
    if (!hasTrustedOrigin(request)) {
      return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
    }

    let body: unknown;
    try {
      const text: string = await request.text();
      if (text.length > 16_384) {
        return privateResponse(badRequest("Request body is too large."));
      }
      body = JSON.parse(text);
    } catch {
      return privateResponse(badRequest("Request body must be valid JSON."));
    }

    const parsed = parseUpdateInvitationNoteInput(body);
    if (!parsed.success)
      return privateResponse(badRequest("Invalid invitation note.", parsed.errors));

    const { code } = await context.params;
    const updated: boolean = await invitationService.updateAdminNote(code, parsed.data);
    if (!updated) return authError(ApiErrorCode.NotFound, "Invitation not found.", 404);
    return privateResponse(new Response(null, { status: 204 }));
  } catch {
    console.error("Invitation note update failed.");
    return authError(ApiErrorCode.Unavailable, "Invitation note is temporarily unavailable.", 503);
  }
}

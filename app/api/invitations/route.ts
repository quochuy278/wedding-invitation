import { ApiErrorCode } from "@/lib/api/types";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { parseInvitationListQuery } from "@/server/features/invitations/invitation.schema";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { badRequest, ok } from "@/server/shared/http/api-response";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getAdminSession();
    if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
    const parsed = parseInvitationListQuery(new URL(request.url).searchParams);
    if (!parsed.success) {
      return privateResponse(badRequest("Invalid pagination parameters.", parsed.errors));
    }
    const invitations = await invitationService.list(parsed.data);
    return privateResponse(ok(invitations));
  } catch (error: unknown) {
    console.error(
      "Invitation list request failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return authError(ApiErrorCode.Unavailable, "Invitations are temporarily unavailable.", 503);
  }
}

import { ApiErrorCode } from "@/lib/api/types";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { parseVerifyInvitationTicketInput } from "@/server/features/invitations/invitation-ticket.schema";
import { invitationTicketService } from "@/server/features/invitations/invitation-ticket.service";
import { badRequest, ok } from "@/server/shared/http/api-response";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getAdminSession();
    if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
    const trustedOrigin = hasTrustedOrigin(request);
    if (!trustedOrigin) return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 1024) return privateResponse(badRequest("Request body is too large."));
      body = JSON.parse(text);
    } catch {
      return privateResponse(badRequest("Request body must be valid JSON."));
    }
    const parsed = parseVerifyInvitationTicketInput(body);
    if (!parsed.success) return privateResponse(badRequest("Invalid QR data.", parsed.errors));
    const result = await invitationTicketService.verifyForAdmin(parsed.data.qrValue);
    return privateResponse(ok(result));
  } catch (error: unknown) {
    console.error(
      "Ticket verification failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return authError(
      ApiErrorCode.Unavailable,
      "Ticket verification is temporarily unavailable.",
      503,
    );
  }
}

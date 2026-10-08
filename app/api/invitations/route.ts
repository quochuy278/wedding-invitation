import { ApiErrorCode } from "@/lib/api/types";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { InvitationCreationError } from "@/server/features/invitations/invitation.errors";
import {
  parseCreateInvitationInput,
  parseInvitationListQuery,
} from "@/server/features/invitations/invitation.schema";
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

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getAdminSession();
    if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
    const trustedOrigin = hasTrustedOrigin(request);
    if (!trustedOrigin) return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 8192) return privateResponse(badRequest("Request body is too large."));
      body = JSON.parse(text);
    } catch {
      return privateResponse(badRequest("Request body must be valid JSON."));
    }
    const parsed = parseCreateInvitationInput(body);
    if (!parsed.success) return privateResponse(badRequest("Invalid invitation.", parsed.errors));
    const invitation = await invitationService.create(parsed.data);
    return privateResponse(ok(invitation, 201));
  } catch (error: unknown) {
    if (error instanceof InvitationCreationError) {
      const isConflict = error.reason === "contactConflict";
      const code = isConflict ? ApiErrorCode.Conflict : ApiErrorCode.BadRequest;
      const status = isConflict ? 409 : 400;
      const details = error.fields.map((field) => ({ field, message: error.reason }));
      const body = { error: { code, message: error.message, details } };
      return privateResponse(Response.json(body, { status }));
    }
    console.error(
      "Invitation creation failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return authError(ApiErrorCode.Unavailable, "Invitation could not be saved.", 503);
  }
}

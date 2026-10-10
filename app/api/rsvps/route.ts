import { ApiErrorCode } from "@/lib/api/types";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { requireGuestApiKey } from "@/server/features/invitations/invitation.http";
import { createRsvpInputSchema } from "@/server/features/rsvps/rsvp.schema";
import { rsvpService } from "@/server/features/rsvps/rsvp.service";
import { badRequest, notFound, ok } from "@/server/shared/http/api-response";
import type { AuthSessionDto } from "@/shared/contracts/auth";

export async function GET(): Promise<Response> {
  const session: AuthSessionDto | null = await getAdminSession();
  if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
  const rsvps = await rsvpService.list();

  return privateResponse(ok(rsvps));
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireGuestApiKey(request);
  if (denied) return denied;
  let body: unknown;

  try {
    const text = await request.text();
    if (text.length > 4096) return badRequest("Request body is too large.");
    body = JSON.parse(text);
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = createRsvpInputSchema(body);

  if (!parsed.success) {
    return badRequest("Invalid RSVP data.", parsed.errors);
  }

  try {
    const rsvp = await rsvpService.create(parsed.data);
    return rsvp ? ok(rsvp) : notFound("Invitation is unavailable or has expired.");
  } catch (error: unknown) {
    console.error("RSVP save failed:", error instanceof Error ? error.name : "UnknownError");
    return authError(ApiErrorCode.Unavailable, "RSVP could not be saved.", 503);
  }
}

import { ApiErrorCode } from "@/lib/api/types";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { createRsvpInputSchema } from "@/server/features/rsvps/rsvp.schema";
import { rsvpService } from "@/server/features/rsvps/rsvp.service";
import { badRequest, ok } from "@/server/shared/http/api-response";
import type { AuthSessionDto } from "@/shared/contracts/auth";

export async function GET(): Promise<Response> {
  const session: AuthSessionDto | null = await getAdminSession();
  if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
  const rsvps = await rsvpService.list();

  return privateResponse(ok(rsvps));
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = createRsvpInputSchema(body);

  if (!parsed.success) {
    return badRequest("Invalid RSVP data.", parsed.errors);
  }

  const rsvp = await rsvpService.create(parsed.data);

  return ok(rsvp, 201);
}

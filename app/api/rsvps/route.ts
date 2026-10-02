import { createRsvpInputSchema } from "@/server/features/rsvps/rsvp.schema";
import { rsvpService } from "@/server/features/rsvps/rsvp.service";
import { badRequest, ok } from "@/server/shared/http/api-response";

export async function GET() {
  const rsvps = await rsvpService.list();

  return ok(rsvps);
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

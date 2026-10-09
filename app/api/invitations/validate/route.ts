import { validateInvitationCodeInputSchema } from "@/server/features/invitations/invitation.schema";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { badRequest, ok } from "@/server/shared/http/api-response";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    const text: string = await request.text();
    if (text.length > 2048) return badRequest("Request body is too large.");
    body = JSON.parse(text);
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = validateInvitationCodeInputSchema(body);

  if (!parsed.success) {
    return badRequest("Invalid invitation code.", parsed.errors);
  }

  const validation = await invitationService.validateCode(parsed.data.code);

  return ok(validation);
}

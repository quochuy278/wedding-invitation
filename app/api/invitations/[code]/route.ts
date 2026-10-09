import { requireGuestApiKey } from "@/server/features/invitations/invitation.http";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { notFound, ok } from "@/server/shared/http/api-response";

export async function GET(
  request: Request,
  context: RouteContext<"/api/invitations/[code]">,
): Promise<Response> {
  const denied = requireGuestApiKey(request);
  if (denied) return denied;
  const { code } = await context.params;
  const invitation = await invitationService.getByCode(code);

  if (!invitation) {
    return notFound("Invitation not found.");
  }

  return ok(invitation);
}

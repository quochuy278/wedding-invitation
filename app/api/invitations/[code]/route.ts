import { invitationService } from "@/server/features/invitations/invitation.service";
import { notFound, ok } from "@/server/shared/http/api-response";

export async function GET(_request: Request, context: RouteContext<"/api/invitations/[code]">) {
  const { code } = await context.params;
  const invitation = await invitationService.getByCode(code);

  if (!invitation) {
    return notFound("Invitation not found.");
  }

  return ok(invitation);
}

import "server-only";

import type { InvitationDto, InvitationTicketDto } from "@/shared/contracts/invitation";
import { invitationService } from "./invitation.service";
import { renderInvitationTicketQr } from "./invitation-ticket.qr";
import {
  issueInvitationTicketToken,
  readInvitationTicketCode,
  verifyInvitationTicketToken,
} from "./invitation-ticket.token";

export const invitationTicketService = {
  async getByCode(code: string): Promise<InvitationTicketDto | null> {
    const invitation = await invitationService.getByCode(code);
    if (!invitation) return null;
    const qrValue = issueInvitationTicketToken(invitation);
    const qrDataUrl = await renderInvitationTicketQr(qrValue);
    return { invitation, qrValue, qrDataUrl };
  },

  // Read-only foundation for the future admin scanner. This does not record check-in.
  async verify(qrValue: string): Promise<InvitationDto | null> {
    const code = readInvitationTicketCode(qrValue);
    if (!code) return null;
    const invitation = await invitationService.getByCode(code);
    if (!invitation) return null;
    const authentic = verifyInvitationTicketToken(qrValue, invitation);
    return authentic ? invitation : null;
  },
};

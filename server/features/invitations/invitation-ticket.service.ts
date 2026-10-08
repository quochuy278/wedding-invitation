import "server-only";

import type { InvitationDto, InvitationTicketDto } from "@/shared/contracts/invitation";
import type { InvitationTicketVerificationDto } from "@/shared/contracts/invitation-ticket";
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

  // Verify authenticity against current data without recording check-in.
  async verify(qrValue: string): Promise<InvitationDto | null> {
    const code = readInvitationTicketCode(qrValue);
    if (!code) return null;
    const invitation = await invitationService.getByCode(code);
    if (!invitation) return null;
    const authentic = verifyInvitationTicketToken(qrValue, invitation);
    return authentic ? invitation : null;
  },

  async verifyForAdmin(qrValue: string): Promise<InvitationTicketVerificationDto> {
    const invitation = await invitationTicketService.verify(qrValue);
    if (!invitation) return { isValid: false, invitation: null };
    return {
      isValid: true,
      invitation: {
        code: invitation.code,
        guestName: invitation.guest.fullName,
        status: invitation.status,
        guestCount: invitation.guestCount,
        expiresAt: invitation.expiresAt,
        address: invitation.address,
      },
    };
  },
};

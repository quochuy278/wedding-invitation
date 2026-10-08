import "server-only";

import type {
  InvitationCodeValidationDto,
  InvitationDto,
  InvitationListDto,
  InvitationListParams,
} from "@/shared/contracts/invitation";
import { invitationRepository, type PublicInvitationRecord } from "./invitation.repository";

function toInvitationDto(invitation: PublicInvitationRecord): InvitationDto {
  return {
    id: invitation.id,
    code: invitation.code,
    status: invitation.status,
    guestCount: invitation.guest_count,
    expiresAt: invitation.expires_at.toISOString(),
    guest: {
      fullName: invitation.user.full_name,
    },
    address: {
      name: invitation.address.name,
      addressText: invitation.address.address_text,
      eventAt: invitation.address.event_at.toISOString(),
    },
    wishes: invitation.wishes.map((wish) => ({
      id: wish.id,
      content: wish.content,
      createdAt: wish.created_at.toISOString(),
    })),
  };
}

export const invitationService = {
  async list(params: InvitationListParams): Promise<InvitationListDto> {
    const result = await invitationRepository.findPage(params);
    return {
      ...result,
      items: result.items.map((invitation) => ({
        id: invitation.id,
        code: invitation.code,
        guestName: invitation.user.full_name,
        phoneNumber: invitation.user.phone_number,
        status: invitation.status,
        guestCount: invitation.guest_count,
        updatedAt: invitation.updated_at.toISOString(),
      })),
    };
  },

  async validateCode(code: string): Promise<InvitationCodeValidationDto> {
    const invitation = await invitationRepository.findActiveIdByCode(code);

    return { isValid: invitation !== null };
  },

  async getByCode(code: string): Promise<InvitationDto | null> {
    const invitation = await invitationRepository.findActiveByCode(code);

    return invitation ? toInvitationDto(invitation) : null;
  },
};

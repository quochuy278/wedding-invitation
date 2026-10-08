import "server-only";

import { toAddressDto } from "@/server/features/addresses/address.service";
import type {
  CreatedInvitationDto,
  CreateInvitationInput,
  InvitationCodeValidationDto,
  InvitationDto,
  InvitationListDto,
  InvitationListParams,
} from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";
import { InvitationCreationError } from "./invitation.errors";
import { invitationRepository, type PublicInvitationRecord } from "./invitation.repository";

function toInvitationDto(invitation: PublicInvitationRecord): InvitationDto {
  return {
    id: invitation.id,
    code: invitation.code,
    status: invitation.status,
    guestCount: invitation.guest_count,
    expiresAt: invitation.expires_at.toISOString(),
    personalMessage: invitation.personal_message,
    guest: {
      fullName: invitation.user.full_name,
    },
    address: toAddressDto(invitation.address),
    wishes: invitation.wishes.map((wish) => ({
      id: wish.id,
      content: wish.content,
      createdAt: wish.created_at.toISOString(),
    })),
  };
}

export const invitationService = {
  async create(input: CreateInvitationInput): Promise<CreatedInvitationDto> {
    const hasFutureDeadline = Date.parse(input.expiresAt) > now().valueOf();
    if (!hasFutureDeadline) throw new InvitationCreationError("expiredDeadline", ["expiresAt"]);
    const invitation = await invitationRepository.create(input);
    return {
      id: invitation.id,
      code: invitation.code,
      status: invitation.status,
      guestName: invitation.user.full_name,
      email: invitation.user.email,
      phoneNumber: invitation.user.phone_number,
      address: toAddressDto(invitation.address),
      expiresAt: invitation.expires_at.toISOString(),
      personalMessage: invitation.personal_message,
    };
  },
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

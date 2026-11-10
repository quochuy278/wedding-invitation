import "server-only";

import { toAddressDto } from "@/server/features/addresses/address.service";
import type {
  CreatedInvitationDto,
  CreateInvitationInput,
  InvitationCodeValidationDto,
  InvitationDto,
  InvitationListDto,
  UpdateInvitationNoteInput,
} from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";
import { isInvitationCode, normalizeInvitationCode } from "@/shared/utils/invitation-code";
import { InvitationCreationError } from "./invitation.errors";
import { invitationRepository, type PublicInvitationRecord } from "./invitation.repository";
import type { InvitationListCriteria } from "./invitation.schema";
import { invitationEmailService, toCreatedInvitationDto } from "./invitation-email.service";

export function toInvitationDto(invitation: PublicInvitationRecord): InvitationDto {
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
    const created = toCreatedInvitationDto(invitation);
    await invitationEmailService.send(created.code, false).catch(() => {
      console.error("Invitation email state could not be saved.");
    });
    return created;
  },
  async list(params: InvitationListCriteria): Promise<InvitationListDto> {
    const result = await invitationRepository.findPage(params);
    const currentTime = now().valueOf();
    return {
      ...result,
      items: result.items.map((invitation) => {
        const emailStatus = invitationEmailService.visibleStatus(
          invitation.email_status,
          invitation.email_attempted_at,
          currentTime,
        );
        return {
          id: invitation.id,
          code: invitation.code,
          guestName: invitation.user.full_name,
          email: invitation.user.email,
          phoneNumber: invitation.user.phone_number,
          address: { name: invitation.address.name, addressText: invitation.address.address_text },
          adminNote: invitation.admin_note,
          status: invitation.status,
          guestCount: invitation.guest_count,
          updatedAt: invitation.updated_at.toISOString(),
          emailStatus,
          emailError: invitation.email_error,
          canResendEmail:
            invitation.expires_at.getTime() > currentTime && emailStatus !== "pending",
        };
      }),
    };
  },

  updateAdminNote(code: string, input: UpdateInvitationNoteInput): Promise<boolean> {
    const normalizedCode: string = normalizeInvitationCode(code);
    if (!isInvitationCode(normalizedCode)) return Promise.resolve(false);
    return invitationRepository.updateAdminNote(normalizedCode, input.adminNote);
  },

  async validateCode(code: string): Promise<InvitationCodeValidationDto> {
    const normalizedCode = normalizeInvitationCode(code);
    if (!isInvitationCode(normalizedCode)) return { isValid: false };
    const invitation = await invitationRepository.findActiveIdByCode(normalizedCode);

    return { isValid: invitation !== null };
  },

  async getByCode(code: string): Promise<InvitationDto | null> {
    const normalizedCode = normalizeInvitationCode(code);
    if (!isInvitationCode(normalizedCode)) return null;
    const invitation = await invitationRepository.findActiveByCode(normalizedCode);

    return invitation ? toInvitationDto(invitation) : null;
  },
};

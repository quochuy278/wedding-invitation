"use client";

import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/lib/api/types";
import { invitationService } from "@/services/invitations/invitation.service";
import type { InvitationDto, ValidateInvitationCodeInput } from "@/shared/contracts/invitation";

export function useCheckInvitationCode() {
  return useMutation<
    InvitationDto | null,
    AxiosError<ApiErrorResponse>,
    ValidateInvitationCodeInput
  >({
    mutationFn: async (input) => {
      const validation = await invitationService.validateCode(input);

      return validation.isValid ? invitationService.getByCode(input.code) : null;
    },
  });
}

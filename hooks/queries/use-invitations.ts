"use client";

import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/lib/api/types";
import { invitationService } from "@/services/invitations/invitation.service";
import type { InvitationDto, ValidateInvitationCodeInput } from "@/shared/contracts/invitation";

type InvitationCodeCheckResult = InvitationDto | null;
type CheckInvitationCodeMutation = UseMutationResult<
  InvitationCodeCheckResult,
  AxiosError<ApiErrorResponse>,
  ValidateInvitationCodeInput
>;

export function useCheckInvitationCode(): CheckInvitationCodeMutation {
  return useMutation<
    InvitationCodeCheckResult,
    AxiosError<ApiErrorResponse>,
    ValidateInvitationCodeInput
  >({
    mutationFn: async (input: ValidateInvitationCodeInput): Promise<InvitationCodeCheckResult> => {
      const validation = await invitationService.validateCode(input);

      return validation.isValid ? invitationService.getByCode(input.code) : null;
    },
  });
}

"use client";

import { type UseMutationResult, useMutation, useQuery } from "@tanstack/react-query";
import type { ResolvedApiError } from "@/lib/api/error-resolver";
import { invitationService } from "@/services/invitations/invitation.service";
import type {
  InvitationDto,
  InvitationListDto,
  InvitationListParams,
  ValidateInvitationCodeInput,
} from "@/shared/contracts/invitation";

export const invitationQueryKeys = {
  all: ["invitations"] as const,
  list: (params: InvitationListParams) => [...invitationQueryKeys.all, "list", params] as const,
};

export function useInvitations(params: InvitationListParams) {
  return useQuery<InvitationListDto, ResolvedApiError>({
    queryKey: invitationQueryKeys.list(params),
    queryFn: ({ signal }) => invitationService.list(params, signal),
    staleTime: 0,
    retry: (failureCount, error) =>
      error.status !== 401 && error.status !== 403 && failureCount < 1,
  });
}

type InvitationCodeCheckResult = InvitationDto | null;
type CheckInvitationCodeMutation = UseMutationResult<
  InvitationCodeCheckResult,
  ResolvedApiError,
  ValidateInvitationCodeInput
>;

export function useCheckInvitationCode(): CheckInvitationCodeMutation {
  return useMutation<InvitationCodeCheckResult, ResolvedApiError, ValidateInvitationCodeInput>({
    mutationFn: async (input: ValidateInvitationCodeInput): Promise<InvitationCodeCheckResult> => {
      const validation = await invitationService.validateCode(input);

      return validation.isValid ? invitationService.getByCode(input.code) : null;
    },
  });
}

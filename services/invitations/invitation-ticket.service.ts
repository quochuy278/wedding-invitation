import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type {
  InvitationTicketVerificationDto,
  VerifyInvitationTicketInput,
} from "@/shared/contracts/invitation-ticket";

export const invitationTicketService = {
  async verify(
    input: VerifyInvitationTicketInput,
    signal?: AbortSignal,
  ): Promise<InvitationTicketVerificationDto> {
    const response = await apiClient.post<ApiResponse<InvitationTicketVerificationDto>>(
      "/invitation-tickets/verify",
      input,
      { signal },
    );
    return response.data.data;
  },
};

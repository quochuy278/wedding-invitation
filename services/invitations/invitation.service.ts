import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type {
  InvitationCodeValidationDto,
  InvitationDto,
  ValidateInvitationCodeInput,
} from "@/shared/contracts/invitation";

export const invitationService = {
  async validateCode(input: ValidateInvitationCodeInput): Promise<InvitationCodeValidationDto> {
    const response = await apiClient.post<ApiResponse<InvitationCodeValidationDto>>(
      "/invitations/validate",
      input,
    );

    return response.data.data;
  },

  async getByCode(code: string): Promise<InvitationDto> {
    const response = await apiClient.get<ApiResponse<InvitationDto>>(
      `/invitations/${encodeURIComponent(code)}`,
    );

    return response.data.data;
  },
};

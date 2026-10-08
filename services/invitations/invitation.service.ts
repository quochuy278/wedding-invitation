import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type {
  CreatedInvitationDto,
  CreateInvitationInput,
  InvitationCodeValidationDto,
  InvitationDto,
  InvitationListDto,
  InvitationListParams,
  ValidateInvitationCodeInput,
} from "@/shared/contracts/invitation";

export const invitationService = {
  async create(input: CreateInvitationInput): Promise<CreatedInvitationDto> {
    const response = await apiClient.post<ApiResponse<CreatedInvitationDto>>("/invitations", input);
    return response.data.data;
  },
  async list(params: InvitationListParams, signal?: AbortSignal): Promise<InvitationListDto> {
    const response = await apiClient.get<ApiResponse<InvitationListDto>>("/invitations", {
      params,
      signal,
    });
    return response.data.data;
  },

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

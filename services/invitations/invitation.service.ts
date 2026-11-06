import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import { guestApiHeaders } from "@/shared/contracts/guest-api";
import {
  type CreatedInvitationDto,
  type CreateInvitationInput,
  type InvitationCodeValidationDto,
  type InvitationDto,
  type InvitationListDto,
  type InvitationListParams,
  invitationTimeZoneHeader,
  type UpdateInvitationNoteInput,
  type ValidateInvitationCodeInput,
} from "@/shared/contracts/invitation";

export const invitationService = {
  async create(input: CreateInvitationInput): Promise<CreatedInvitationDto> {
    const response = await apiClient.post<ApiResponse<CreatedInvitationDto>>("/invitations", input);
    return response.data.data;
  },
  async list(
    params: InvitationListParams,
    signal?: AbortSignal,
    timeZone?: string,
  ): Promise<InvitationListDto> {
    const headers = timeZone ? { [invitationTimeZoneHeader]: timeZone } : undefined;
    const response = await apiClient.get<ApiResponse<InvitationListDto>>("/invitations", {
      params,
      signal,
      headers,
    });
    return response.data.data;
  },
  async resendEmail(code: string): Promise<void> {
    await apiClient.post(`/invitation-email/${encodeURIComponent(code)}`);
  },
  async updateAdminNote(code: string, input: UpdateInvitationNoteInput): Promise<void> {
    await apiClient.patch(`/invitation-notes/${encodeURIComponent(code)}`, input);
  },

  async validateCode(input: ValidateInvitationCodeInput): Promise<InvitationCodeValidationDto> {
    const response = await apiClient.post<ApiResponse<InvitationCodeValidationDto>>(
      "/invitations/validate",
      input,
      { headers: guestApiHeaders },
    );

    return response.data.data;
  },

  async getByCode(code: string): Promise<InvitationDto> {
    const response = await apiClient.get<ApiResponse<InvitationDto>>(
      `/invitations/${encodeURIComponent(code)}`,
      { headers: guestApiHeaders },
    );

    return response.data.data;
  },
};

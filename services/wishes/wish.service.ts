import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import { guestApiHeaders } from "@/shared/contracts/guest-api";
import type { CreateWishInput } from "@/shared/contracts/guest-response";
import type { InvitationWishDto } from "@/shared/contracts/invitation";

export const wishService = {
  async create(input: CreateWishInput): Promise<InvitationWishDto> {
    const response = await apiClient.post<ApiResponse<InvitationWishDto>>("/wishes", input, {
      headers: guestApiHeaders,
    });
    return response.data.data;
  },
  async list(code: string, signal?: AbortSignal): Promise<InvitationWishDto[]> {
    const response = await apiClient.get<ApiResponse<InvitationWishDto[]>>("/wishes", {
      params: { code },
      signal,
    });
    return response.data.data;
  },
};

import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import { guestApiHeaders } from "@/shared/contracts/guest-api";
import type { CreateRsvpInput, Rsvp } from "./rsvp.types";

export const rsvpService = {
  async list(signal?: AbortSignal): Promise<Rsvp[]> {
    const response = await apiClient.get<ApiResponse<Rsvp[]>>("/rsvps", { signal });

    return response.data.data;
  },

  async create(input: CreateRsvpInput): Promise<Rsvp> {
    const response = await apiClient.post<ApiResponse<Rsvp>>("/rsvps", input, {
      headers: guestApiHeaders,
    });

    return response.data.data;
  },
};

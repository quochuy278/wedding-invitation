import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type { CreateRsvpInput, Rsvp } from "./rsvp.types";

export const rsvpService = {
  async list(signal?: AbortSignal): Promise<Rsvp[]> {
    const response = await apiClient.get<ApiResponse<Rsvp[]>>("/rsvps", { signal });

    return response.data.data;
  },

  async create(input: CreateRsvpInput): Promise<Rsvp> {
    const response = await apiClient.post<ApiResponse<Rsvp>>("/rsvps", input);

    return response.data.data;
  },
};

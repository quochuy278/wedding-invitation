import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type { AddressDto, AddressListDto, CreateAddressInput } from "@/shared/contracts/address";

export const addressService = {
  async list(signal?: AbortSignal): Promise<AddressListDto> {
    const response = await apiClient.get<ApiResponse<AddressListDto>>("/addresses", { signal });
    return response.data.data;
  },
  async create(input: CreateAddressInput): Promise<AddressDto> {
    const response = await apiClient.post<ApiResponse<AddressDto>>("/addresses", input);
    return response.data.data;
  },
};

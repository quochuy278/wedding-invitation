import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type { CreateUserInput, UserDto } from "@/shared/contracts/user";

export const userService = {
  async create(input: CreateUserInput): Promise<UserDto> {
    const response = await apiClient.post<ApiResponse<UserDto>>("/users", input);
    return response.data.data;
  },
};

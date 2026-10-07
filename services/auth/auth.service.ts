import type { AxiosResponse } from "axios";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type { AuthSessionDto, LoginInput, LogoutDto } from "@/shared/contracts/auth";
import { clearAuthState, setAuthenticatedSession } from "@/stores/auth.store";

export async function login(input: LoginInput): Promise<AuthSessionDto> {
  const response: AxiosResponse<ApiResponse<AuthSessionDto>> = await apiClient.post<
    ApiResponse<AuthSessionDto>
  >("/auth/login", input);
  const session: AuthSessionDto = response.data.data;
  setAuthenticatedSession(session);
  return session;
}

export async function getSession(): Promise<AuthSessionDto> {
  const response: AxiosResponse<ApiResponse<AuthSessionDto>> =
    await apiClient.get<ApiResponse<AuthSessionDto>>("/auth/session");
  const session: AuthSessionDto = response.data.data;
  setAuthenticatedSession(session);
  return session;
}

export async function logout(): Promise<LogoutDto> {
  const logoutBody: Record<string, never> = {};
  try {
    const response: AxiosResponse<ApiResponse<LogoutDto>> = await apiClient.post<
      ApiResponse<LogoutDto>
    >("/auth/logout", logoutBody);
    return response.data.data;
  } finally {
    clearAuthState();
  }
}

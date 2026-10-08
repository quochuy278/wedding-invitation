import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  isAxiosError,
} from "axios";
import type { AuthSessionDto } from "@/shared/contracts/auth";
import { clearAuthState, setAuthenticatedSession } from "@/stores/auth.store";
import { apiConfig } from "./config";
import { type ResolvedApiError, resolveApiError } from "./error-resolver";
import { ApiErrorCode, type ApiResponse } from "./types";

type AuthRequestConfig = InternalAxiosRequestConfig<unknown> & {
  authRetried?: boolean;
};

export const apiClient: AxiosInstance = axios.create({
  ...apiConfig,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Auth transport has no response interceptor, so refresh failures cannot recurse.
const authTransport: AxiosInstance = axios.create({ ...apiConfig, withCredentials: true });
let refreshAccessTokenRequest: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  try {
    // A different tab may already have refreshed the shared cookies while we waited for the lock.
    const sessionResponse: AxiosResponse<ApiResponse<AuthSessionDto>> =
      await authTransport.get<ApiResponse<AuthSessionDto>>("/auth/session");
    setAuthenticatedSession(sessionResponse.data.data);
    return;
  } catch (error: unknown) {
    const resolvedError: ResolvedApiError = resolveApiError(error);
    if (resolvedError.code !== ApiErrorCode.Unauthorized) throw error;
  }
  const refreshBody: Record<string, never> = {};
  const refreshResponse: AxiosResponse<ApiResponse<AuthSessionDto>> = await authTransport.post<
    ApiResponse<AuthSessionDto>
  >("/auth/refresh", refreshBody);
  setAuthenticatedSession(refreshResponse.data.data);
}

async function refreshAccessTokenAcrossTabs(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request<void>("wedding-auth-refresh", refreshAccessToken);
  } else {
    await refreshAccessToken();
  }
}

async function refreshAccessTokenOnce(): Promise<void> {
  refreshAccessTokenRequest ??= refreshAccessTokenAcrossTabs().finally((): void => {
    refreshAccessTokenRequest = null;
  });
  return refreshAccessTokenRequest;
}

async function refreshTokenResponseInterceptor(error: unknown): Promise<AxiosResponse<unknown>> {
  const resolvedError: ResolvedApiError = resolveApiError(error);
  if (!isAxiosError(error) || resolvedError.code !== ApiErrorCode.Unauthorized || !error.config) {
    throw error;
  }
  const config: AuthRequestConfig = error.config;
  const url: string = config.url ?? "";
  const excluded: boolean = [
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/invitations/",
    "/health",
  ].some((path: string): boolean => url.startsWith(path));
  if (config.authRetried || excluded) throw error;
  config.authRetried = true;
  try {
    await refreshAccessTokenOnce();
  } catch (refreshError: unknown) {
    clearAuthState();
    const resolvedRefreshError: ResolvedApiError = resolveApiError(refreshError);
    if (
      resolvedRefreshError.code === ApiErrorCode.Unauthorized &&
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/dashboard")
    ) {
      window.location.replace("/login");
    }
    throw refreshError;
  }
  return apiClient.request<unknown, AxiosResponse<unknown>, unknown>(config);
}

function resolveErrorResponseInterceptor(error: unknown): Promise<never> {
  const resolvedError: ResolvedApiError = resolveApiError(error);
  return Promise.reject<never>(resolvedError);
}

apiClient.interceptors.response.use(undefined, refreshTokenResponseInterceptor);
apiClient.interceptors.response.use(undefined, resolveErrorResponseInterceptor);

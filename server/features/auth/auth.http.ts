import "server-only";

import { cookies } from "next/headers";
import { ApiErrorCode, type ApiErrorResponse, type ApiResponse } from "@/lib/api/types";
import type { AuthSessionDto } from "@/shared/contracts/auth";
import { getSession } from "./auth.service";
import type { AuthTokens } from "./token";

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type AuthHandler = () => Promise<Response>;
type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  expires?: Date;
  maxAge?: number;
};

export type AuthCookies = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
};

function accessCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-access_token" : "access_token";
}

function refreshCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-refresh_token" : "refresh_token";
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export async function readAuthCookies(): Promise<AuthCookies> {
  const store: CookieStore = await cookies();
  return {
    accessToken: store.get(accessCookieName())?.value,
    refreshToken: store.get(refreshCookieName())?.value,
  };
}

export async function setAuthCookies(tokens: AuthTokens): Promise<void> {
  const store: CookieStore = await cookies();
  store.set(accessCookieName(), tokens.accessToken, {
    ...cookieOptions(),
    expires: tokens.accessExpiresAt,
  });
  store.set(refreshCookieName(), tokens.refreshToken, {
    ...cookieOptions(),
    expires: tokens.refreshExpiresAt,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store: CookieStore = await cookies();
  store.set(accessCookieName(), "", { ...cookieOptions(), maxAge: 0 });
  store.set(refreshCookieName(), "", { ...cookieOptions(), maxAge: 0 });
}

export async function getAdminSession(): Promise<AuthSessionDto | null> {
  const tokens: AuthCookies = await readAuthCookies();
  return getSession(tokens.accessToken);
}

export function privateResponse(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", "Cookie");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export function authOk<T>(data: T): Response {
  const body: ApiResponse<T> = { data };
  return privateResponse(Response.json(body));
}

export function authError(code: ApiErrorCode, message: string, status: number): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return privateResponse(Response.json(body, { status }));
}

export async function handleAuthRequest(handler: AuthHandler): Promise<Response> {
  try {
    return await handler();
  } catch (error: unknown) {
    console.error("Auth request failed:", error instanceof Error ? error.name : "UnknownError");
    return authError(ApiErrorCode.Unavailable, "Authentication is temporarily unavailable.", 503);
  }
}

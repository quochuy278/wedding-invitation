import "server-only";

import { ApiErrorCode, type ApiErrorDetail, type ApiErrorResponse } from "@/lib/api/types";

export function ok<T>(data: T, status: number = 200): Response {
  return Response.json(
    { data },
    { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );
}

export function badRequest(message: string, details?: ApiErrorDetail[]): Response {
  const error: ApiErrorResponse["error"] = {
    code: ApiErrorCode.BadRequest,
    message,
    ...(details ? { details } : {}),
  };
  const body: ApiErrorResponse = { error };
  const headers: HeadersInit = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  return Response.json(body, { status: 400, headers });
}

export function notFound(message: string): Response {
  const error: ApiErrorResponse["error"] = { code: ApiErrorCode.NotFound, message };
  const body: ApiErrorResponse = { error };
  const headers: HeadersInit = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  return Response.json(body, { status: 404, headers });
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { type ResolvedApiError, resolveApiError } from "@/lib/api/error-resolver";
import { ApiErrorCode, type ApiErrorResponse } from "@/lib/api/types";

function createAxiosError(status: number, data: unknown): AxiosError<unknown> {
  const headers: AxiosHeaders = new AxiosHeaders();
  const config: InternalAxiosRequestConfig<unknown> = { headers };
  const response: AxiosResponse<unknown> = {
    data,
    status,
    statusText: "Request failed",
    headers,
    config,
  };
  return new AxiosError<unknown>(
    "Request failed",
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    response,
  );
}

test("API error code takes precedence over HTTP status", (): void => {
  const responseBody: ApiErrorResponse = {
    error: {
      code: ApiErrorCode.RateLimited,
      message: "Try later.",
    },
  };
  const error: AxiosError<unknown> = createAxiosError(401, responseBody);
  const resolved: ResolvedApiError = resolveApiError(error);

  assert.equal(resolved.code, ApiErrorCode.RateLimited);
  assert.equal(resolved.status, 401);
  assert.equal(resolved.message, "Try later.");
  assert.equal(resolveApiError(resolved), resolved);
});

test("resolver falls back to status and handles non-Axios errors", (): void => {
  const emptyBody: Record<string, never> = {};
  const axiosError: AxiosError<unknown> = createAxiosError(404, emptyBody);
  const statusResolved: ResolvedApiError = resolveApiError(axiosError);
  const unknownResolved: ResolvedApiError = resolveApiError(new Error("Unexpected"));

  assert.equal(statusResolved.code, ApiErrorCode.NotFound);
  assert.equal(unknownResolved.code, ApiErrorCode.Unknown);
  assert.equal(unknownResolved.status, null);
});

import { isAxiosError } from "axios";
import { ApiErrorCode, type ApiErrorDetail } from "@/lib/api/types";

type UnknownRecord = Record<string, unknown>;

export type ResolvedApiError = {
  code: ApiErrorCode;
  status: number | null;
  message: string | null;
  details: ApiErrorDetail[];
  cause: unknown;
};

const apiErrorCodes: ReadonlySet<string> = new Set<string>(Object.values(ApiErrorCode));
const statusCodeMap: Readonly<Partial<Record<number, ApiErrorCode>>> = {
  400: ApiErrorCode.BadRequest,
  401: ApiErrorCode.Unauthorized,
  403: ApiErrorCode.Forbidden,
  404: ApiErrorCode.NotFound,
  409: ApiErrorCode.Conflict,
  429: ApiErrorCode.RateLimited,
  500: ApiErrorCode.Unavailable,
  502: ApiErrorCode.Unavailable,
  503: ApiErrorCode.Unavailable,
  504: ApiErrorCode.Unavailable,
};

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && apiErrorCodes.has(value);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isApiErrorDetail(value: unknown): value is ApiErrorDetail {
  return isRecord(value) && typeof value.field === "string" && typeof value.message === "string";
}

export function isResolvedApiError(value: unknown): value is ResolvedApiError {
  return (
    isRecord(value) &&
    isApiErrorCode(value.code) &&
    (typeof value.status === "number" || value.status === null) &&
    (typeof value.message === "string" || value.message === null) &&
    Array.isArray(value.details) &&
    value.details.every(isApiErrorDetail) &&
    "cause" in value
  );
}

export function resolveApiError(error: unknown): ResolvedApiError {
  if (isResolvedApiError(error)) return error;

  if (!isAxiosError(error)) {
    return {
      code: ApiErrorCode.Unknown,
      status: null,
      message: null,
      details: [],
      cause: error,
    };
  }

  const status: number | null = error.response?.status ?? null;
  const responseData: unknown = error.response?.data;
  const responseError: UnknownRecord | null =
    isRecord(responseData) && isRecord(responseData.error) ? responseData.error : null;
  const responseCode: unknown = responseError?.code;
  const statusCode: ApiErrorCode | undefined = status === null ? undefined : statusCodeMap[status];
  const code: ApiErrorCode = isApiErrorCode(responseCode)
    ? responseCode
    : (statusCode ?? ApiErrorCode.Unavailable);
  const responseMessage: unknown = responseError?.message;
  const message: string | null =
    typeof responseMessage === "string" ? responseMessage : (error.message ?? null);
  const responseDetails: unknown = responseError?.details;
  const details: ApiErrorDetail[] = Array.isArray(responseDetails)
    ? responseDetails.filter(isApiErrorDetail)
    : [];

  return { code, status, message, details, cause: error };
}

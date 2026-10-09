export type ApiResponse<T> = {
  data: T;
};

export enum ApiErrorCode {
  BadRequest = "BAD_REQUEST",
  Unauthorized = "UNAUTHORIZED",
  Forbidden = "FORBIDDEN",
  NotFound = "NOT_FOUND",
  Conflict = "CONFLICT",
  InvalidCredentials = "INVALID_CREDENTIALS",
  RateLimited = "RATE_LIMITED",
  GeocodingNotFound = "GEOCODING_NOT_FOUND",
  GeocodingUnavailable = "GEOCODING_UNAVAILABLE",
  Unavailable = "UNAVAILABLE",
  Unknown = "UNKNOWN",
}

export type ApiErrorDetail = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
};

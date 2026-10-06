import "server-only";

export type ValidationError = {
  field: string;
  message: string;
};

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import "server-only";

export type ValidationError = {
  field: string;
  message: string;
};

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; errors: ValidationError[] };
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

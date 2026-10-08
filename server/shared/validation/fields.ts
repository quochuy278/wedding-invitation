import "server-only";

import type { ValidationError } from "./schema";

export function textField(
  value: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
  maximum: number,
  required: boolean = true,
): string {
  const raw = value[field];
  const missing = raw === undefined || raw === null || raw === "";
  if (missing && !required) return "";
  const text = typeof raw === "string" ? raw.trim() : "";
  const invalid =
    typeof raw !== "string" || (required && text.length === 0) || text.length > maximum;
  if (invalid)
    errors.push({
      field,
      message: `Must be text of at most ${maximum} characters${required ? ", and cannot be empty" : ""}.`,
    });
  return text;
}

export function timestampField(
  value: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
): string {
  const text = textField(value, field, errors, 40);
  const hasTimezone =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(text);
  const timestamp = Date.parse(text);
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(5, 7));
  const day = Number(text.slice(8, 10));
  const hour = Number(text.slice(11, 13));
  const minute = Number(text.slice(14, 16));
  const second = Number(text.slice(17, 19));
  const validClockTime = hour < 24 && minute < 60 && second < 60;
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  const validCalendarDate =
    calendarDate.getUTCFullYear() === year &&
    calendarDate.getUTCMonth() === month - 1 &&
    calendarDate.getUTCDate() === day;
  const invalid =
    !hasTimezone || !Number.isFinite(timestamp) || !validCalendarDate || !validClockTime;
  if (invalid) errors.push({ field, message: "Must be an ISO date and time with a timezone." });
  return text;
}

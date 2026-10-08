import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { ResolvedApiError } from "@/lib/api/error-resolver";

dayjs.extend(utc);
dayjs.extend(timezone);

export function formZonedTimestamp(data: FormData, name: string, timeZone: string): string {
  const text = formText(data, name);
  try {
    const date = dayjs.tz(text, timeZone);
    const validLocalTime = date.isValid() && date.format("YYYY-MM-DDTHH:mm") === text;
    return validLocalTime ? date.toISOString() : text;
  } catch {
    return text;
  }
}

export function formText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function formTimestamp(data: FormData, name: string): string {
  const text = formText(data, name);
  const date = new Date(text);
  const valid = Number.isFinite(date.valueOf());
  return valid ? date.toISOString() : text;
}

export function hasFieldError(error: ResolvedApiError | null, name: string): boolean {
  return error?.details.some((detail) => detail.field === name) ?? false;
}

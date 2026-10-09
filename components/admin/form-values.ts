import { format, isValid, parse } from "date-fns";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { ResolvedApiError } from "@/lib/api/error-resolver";

dayjs.extend(utc);
dayjs.extend(timezone);

export function parseDisplayDate(text: string): Date | undefined {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return undefined;
  const date = parse(text, "dd/MM/yyyy", new Date());
  return isValid(date) && format(date, "dd/MM/yyyy") === text ? date : undefined;
}

export function localDateTimeValue(dateText: string, hour: string, minute: string): string {
  const date = parseDisplayDate(dateText);
  if (!date || !/^(?:[01]\d|2[0-3])$/.test(hour) || !/^[0-5]\d$/.test(minute)) return "";
  return `${format(date, "yyyy-MM-dd")}T${hour}:${minute}`;
}

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
  const valid = Number.isFinite(date.valueOf()) && format(date, "yyyy-MM-dd'T'HH:mm") === text;
  return valid ? date.toISOString() : text;
}

export function hasFieldError(error: ResolvedApiError | null, name: string): boolean {
  return error?.details.some((detail) => detail.field === name) ?? false;
}

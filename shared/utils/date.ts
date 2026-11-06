import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const isoDateFormat = "YYYY-MM-DD";

export function now(): Dayjs {
  return dayjs();
}

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatLocalDate(timestamp: string, timeZone?: string): string {
  const date: Date = dayjs(timestamp).toDate();
  return date.toLocaleDateString("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function parseCalendarDate(value: string): Dayjs | undefined {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date: Dayjs = dayjs.utc(`${value}T00:00:00.000Z`);
  return date.format(isoDateFormat) === value ? date : undefined;
}

export function calendarFormatter(timeZone: string): Intl.DateTimeFormat | undefined {
  if (timeZone.length > 100 || !/^[A-Za-z]/.test(timeZone)) return undefined;
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone,
      calendar: "gregory",
      era: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  } catch {
    return undefined;
  }
}

export function zonedDayStart(date: Dayjs, formatter: Intl.DateTimeFormat): Date {
  const targetDay: number = date.year() * 10000 + (date.month() + 1) * 100 + date.date();
  let before: number = date.subtract(1, "day").valueOf();
  let after: number = date.add(1, "day").valueOf();

  // Find the first instant of the local day, even when a clock change skips or repeats midnight.
  while (after - before > 1) {
    const instant: number = Math.floor((before + after) / 2);
    const parts = formatter.formatToParts(instant);
    const year: number = Number(parts.find((part) => part.type === "year")?.value);
    const month: number = Number(parts.find((part) => part.type === "month")?.value);
    const day: number = Number(parts.find((part) => part.type === "day")?.value);
    const isBeforeCommonEra: boolean = parts.some(
      (part) => part.type === "era" && part.value === "BC",
    );
    const calendarYear: number = isBeforeCommonEra ? 1 - year : year;
    const localDay: number = calendarYear * 10000 + month * 100 + day;
    if (localDay < targetDay) before = instant;
    else after = instant;
  }

  return new Date(after);
}

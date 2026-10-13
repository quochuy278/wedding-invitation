import type { AddressDto } from "@/shared/contracts/address";
import { addressDisplayLines } from "./address";

type CalendarVenue = Pick<
  AddressDto,
  "name" | "addressText" | "addressLine2" | "eventAt" | "eventTimeZone"
>;

type CalendarEventText = { title: string; details: string };

const eventDurationMs = 3 * 60 * 60 * 1000;

function calendarTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function invitationCalendarUrl(
  venue: CalendarVenue,
  { title, details }: CalendarEventText,
): string | null {
  const start = new Date(venue.eventAt);
  const end = new Date(start.getTime() + eventDurationMs);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
  const timeZone = venue.eventTimeZone ?? "Asia/Ho_Chi_Minh";
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    return null;
  }
  const location = [venue.name, ...addressDisplayLines(venue)].join(", ");
  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${calendarTimestamp(start)}/${calendarTimestamp(end)}`,
    ctz: timeZone,
    location,
    details,
  });
  return `https://calendar.google.com/calendar/render?${parameters}`;
}

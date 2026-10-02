import "server-only";

import type { Attendance, CreateRsvpInput } from "./rsvp.types";

type ValidationError = {
  field: string;
  message: string;
};

type ParseResult =
  | { success: true; data: CreateRsvpInput }
  | { success: false; errors: ValidationError[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createRsvpInputSchema(value: unknown): ParseResult {
  if (!isRecord(value)) {
    return {
      success: false,
      errors: [{ field: "body", message: "Must be a JSON object." }],
    };
  }

  const errors: ValidationError[] = [];
  const guestName =
    typeof value.guestName === "string" ? value.guestName.trim() : "";
  const attendance = value.attendance;
  const guestCount = value.guestCount;
  const message =
    typeof value.message === "string" && value.message.trim()
      ? value.message.trim()
      : null;

  if (guestName.length < 2 || guestName.length > 100) {
    errors.push({
      field: "guestName",
      message: "Must contain between 2 and 100 characters.",
    });
  }

  if (attendance !== "yes" && attendance !== "no") {
    errors.push({
      field: "attendance",
      message: 'Must be either "yes" or "no".',
    });
  }

  if (!Number.isInteger(guestCount) || Number(guestCount) < 0 || Number(guestCount) > 10) {
    errors.push({
      field: "guestCount",
      message: "Must be an integer between 0 and 10.",
    });
  }

  if (message && message.length > 500) {
    errors.push({
      field: "message",
      message: "Must not exceed 500 characters.",
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      guestName,
      attendance: attendance as Attendance,
      guestCount: Number(guestCount),
      message,
    },
  };
}

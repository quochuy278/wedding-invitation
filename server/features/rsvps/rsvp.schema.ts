import "server-only";

import {
  isRecord,
  type ParseResult,
  type ValidationError,
} from "@/server/shared/validation/schema";
import { guestResponseLimits } from "@/shared/contracts/guest-response";
import { isInvitationCode, normalizeInvitationCode } from "@/shared/utils/invitation-code";
import type { Attendance, CreateRsvpInput } from "./rsvp.types";

export function createRsvpInputSchema(value: unknown): ParseResult<CreateRsvpInput> {
  if (!isRecord(value)) {
    return {
      success: false,
      errors: [{ field: "body", message: "Must be a JSON object." }],
    };
  }

  const errors: ValidationError[] = [];
  const code = typeof value.code === "string" ? normalizeInvitationCode(value.code) : "";
  const attendance = value.attendance;
  const guestCount = value.guestCount;
  if (!isInvitationCode(code)) {
    errors.push({
      field: "code",
      message: "Must be a six-character invitation code.",
    });
  }

  if (attendance !== "yes" && attendance !== "no") {
    errors.push({
      field: "attendance",
      message: 'Must be either "yes" or "no".',
    });
  }

  const validCount =
    Number.isInteger(guestCount) &&
    (attendance === "yes"
      ? Number(guestCount) >= 1 && Number(guestCount) <= guestResponseLimits.maxGuestCount
      : attendance === "no" && guestCount === 0);
  if (!validCount) {
    errors.push({
      field: "guestCount",
      message: `Must be 1–${guestResponseLimits.maxGuestCount} for attendance or zero when declining.`,
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      code,
      attendance: attendance as Attendance,
      guestCount: Number(guestCount),
    },
  };
}

import "server-only";

import { isRecord, type ParseResult } from "@/server/shared/validation/schema";
import type { VerifyInvitationTicketInput } from "@/shared/contracts/invitation-ticket";

export function parseVerifyInvitationTicketInput(
  value: unknown,
): ParseResult<VerifyInvitationTicketInput> {
  if (!isRecord(value)) {
    return { success: false, errors: [{ field: "body", message: "Must be a JSON object." }] };
  }
  const qrValue = value.qrValue;
  const validValue = typeof qrValue === "string" && qrValue.length > 0 && qrValue.length <= 256;
  if (!validValue) {
    return {
      success: false,
      errors: [{ field: "qrValue", message: "Must contain between 1 and 256 characters." }],
    };
  }
  return { success: true, data: { qrValue } };
}

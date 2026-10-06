import "server-only";

import { isRecord, type ParseResult } from "@/server/shared/validation/schema";
import type { ValidateInvitationCodeInput } from "@/shared/contracts/invitation";

export function validateInvitationCodeInputSchema(
  value: unknown,
): ParseResult<ValidateInvitationCodeInput> {
  if (!isRecord(value)) {
    return {
      success: false,
      errors: [{ field: "body", message: "Must be a JSON object." }],
    };
  }

  const code = typeof value.code === "string" ? value.code.trim() : "";

  if (code.length === 0 || code.length > 128) {
    return {
      success: false,
      errors: [{ field: "code", message: "Must contain between 1 and 128 characters." }],
    };
  }

  return {
    success: true,
    data: { code },
  };
}

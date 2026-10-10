import "server-only";

import {
  isRecord,
  type ParseResult,
  type ValidationError,
} from "@/server/shared/validation/schema";
import { type CreateWishInput, guestResponseLimits } from "@/shared/contracts/guest-response";
import { isInvitationCode, normalizeInvitationCode } from "@/shared/utils/invitation-code";

export function createWishInputSchema(value: unknown): ParseResult<CreateWishInput> {
  if (!isRecord(value)) {
    return { success: false, errors: [{ field: "body", message: "Must be a JSON object." }] };
  }
  const code = typeof value.code === "string" ? normalizeInvitationCode(value.code) : "";
  const content = typeof value.content === "string" ? value.content.trim() : "";
  const errors: ValidationError[] = [];
  if (!isInvitationCode(code)) {
    errors.push({ field: "code", message: "Must be a six-character invitation code." });
  }
  if (!content || content.length > guestResponseLimits.maxWishLength) {
    errors.push({
      field: "content",
      message: `Must contain 1–${guestResponseLimits.maxWishLength} characters.`,
    });
  }
  return errors.length ? { success: false, errors } : { success: true, data: { code, content } };
}

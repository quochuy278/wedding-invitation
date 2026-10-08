import "server-only";

import type { ApiErrorDetail } from "@/lib/api/types";
import { isRecord, type ParseResult } from "@/server/shared/validation/schema";
import {
  type InvitationListParams,
  invitationPaginationDefaults,
  type ValidateInvitationCodeInput,
} from "@/shared/contracts/invitation";

export function parseInvitationListQuery(
  query: URLSearchParams,
): ParseResult<InvitationListParams> {
  const errors: ApiErrorDetail[] = [];

  function parse(field: "page" | "pageSize", fallback: number, maximum: number): number {
    const values: string[] = query.getAll(field);
    if (values.length === 0) return fallback;
    const raw: string = values[0];
    const value: number = Number(raw);
    if (
      values.length !== 1 ||
      !/^\d+$/.test(raw) ||
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > maximum
    ) {
      errors.push({ field, message: `Must be a positive integer no greater than ${maximum}.` });
    }
    return value;
  }

  const page: number = parse("page", invitationPaginationDefaults.page, Number.MAX_SAFE_INTEGER);
  const pageSize: number = parse(
    "pageSize",
    invitationPaginationDefaults.pageSize,
    invitationPaginationDefaults.maxPageSize,
  );
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, data: { page, pageSize } };
}

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

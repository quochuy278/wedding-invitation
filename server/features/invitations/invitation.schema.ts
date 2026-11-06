import "server-only";

import type { ApiErrorDetail } from "@/lib/api/types";
import { textField, timestampField } from "@/server/shared/validation/fields";
import { isRecord, type ParseResult } from "@/server/shared/validation/schema";
import {
  type CreateInvitationInput,
  type InvitationListParams,
  invitationPaginationDefaults,
  type ValidateInvitationCodeInput,
} from "@/shared/contracts/invitation";
import { calendarFormatter, parseCalendarDate, zonedDayStart } from "@/shared/utils/date";
import { isInvitationCode, normalizeInvitationCode } from "@/shared/utils/invitation-code";

export type InvitationListCriteria = Omit<InvitationListParams, "updatedFrom" | "updatedTo"> & {
  updatedAt?: { gte?: Date; lt?: Date };
};

export function parseCreateInvitationInput(value: unknown): ParseResult<CreateInvitationInput> {
  if (!isRecord(value))
    return { success: false, errors: [{ field: "body", message: "Must be a JSON object." }] };
  const errors: ApiErrorDetail[] = [];
  const guestName = textField(value, "guestName", errors, 200);
  const email = textField(value, "email", errors, 254).toLowerCase();
  const phoneNumber = textField(value, "phoneNumber", errors, 50, false) || null;
  const addressId = textField(value, "addressId", errors, 128);
  const expiresAt = timestampField(value, "expiresAt", errors);
  const personalMessage = textField(value, "personalMessage", errors, 2000, false) || null;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!validEmail) errors.push({ field: "email", message: "Must be a valid email address." });
  if (errors.length > 0) return { success: false, errors };
  return {
    success: true,
    data: { guestName, email, phoneNumber, addressId, expiresAt, personalMessage },
  };
}

export function parseInvitationListQuery(
  query: URLSearchParams,
  timeZone?: string | null,
): ParseResult<InvitationListCriteria> {
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

  function parseFilter(
    field: "addressId" | "status" | "updatedFrom" | "updatedTo",
    maximum: number,
  ): string {
    const values: string[] = query.getAll(field);
    if (values.length > 1) {
      errors.push({ field, message: "Must be provided at most once." });
    }
    return textField({ [field]: values[0] }, field, errors, maximum, false);
  }

  const page: number = parse("page", invitationPaginationDefaults.page, Number.MAX_SAFE_INTEGER);
  const pageSize: number = parse(
    "pageSize",
    invitationPaginationDefaults.pageSize,
    invitationPaginationDefaults.maxPageSize,
  );
  const addressId: string = parseFilter("addressId", 128);
  const status: string = parseFilter("status", 40);
  const updatedFrom: string = parseFilter("updatedFrom", 10);
  const updatedTo: string = parseFilter("updatedTo", 10);
  const fromDay = parseCalendarDate(updatedFrom);
  const toDay = parseCalendarDate(updatedTo);
  const hasDateFilter: boolean = Boolean(updatedFrom || updatedTo);
  const formatter = hasDateFilter && timeZone ? calendarFormatter(timeZone) : undefined;

  if (updatedFrom && !fromDay) {
    errors.push({ field: "updatedFrom", message: "Must be a valid date in YYYY-MM-DD format." });
  }
  if (updatedTo && !toDay) {
    errors.push({ field: "updatedTo", message: "Must be a valid date in YYYY-MM-DD format." });
  }
  if (fromDay && toDay && fromDay.isAfter(toDay)) {
    errors.push({ field: "updatedTo", message: "Must be on or after the start date." });
  }
  if (hasDateFilter && !formatter) {
    errors.push({ field: "timeZone", message: "X-Time-Zone must contain a valid IANA time zone." });
  }
  if (errors.length > 0) return { success: false, errors };

  const data: InvitationListCriteria = { page, pageSize };
  if (addressId) data.addressId = addressId;
  if (status) data.status = status;
  if (formatter && (fromDay || toDay)) {
    data.updatedAt = {};
    if (fromDay) data.updatedAt.gte = zonedDayStart(fromDay, formatter);
    if (toDay) data.updatedAt.lt = zonedDayStart(toDay.add(1, "day"), formatter);
  }
  return { success: true, data };
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

  const code = typeof value.code === "string" ? normalizeInvitationCode(value.code) : "";

  if (!isInvitationCode(code)) {
    return {
      success: false,
      errors: [{ field: "code", message: "Must contain exactly 6 letters A-Z or digits 0-9." }],
    };
  }

  return {
    success: true,
    data: { code },
  };
}

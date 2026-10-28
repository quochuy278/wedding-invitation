import "server-only";

import {
  isRecord,
  type ParseResult,
  type ValidationError,
} from "@/server/shared/validation/schema";
import { UserLevel } from "@/shared/contracts/auth";
import type { CreateUserInput } from "@/shared/contracts/user";

export function parseCreateUserInput(value: unknown): ParseResult<CreateUserInput> {
  if (!isRecord(value))
    return { success: false, errors: [{ field: "body", message: "Must be an object." }] };
  const errors: ValidationError[] = [];
  const fullName = typeof value.fullName === "string" ? value.fullName.trim() : "";
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const phoneNumber =
    typeof value.phoneNumber === "string" ? value.phoneNumber.trim() || null : null;
  const level = value.level;
  if (!fullName || fullName.length > 200)
    errors.push({ field: "fullName", message: "Name must contain 1–200 characters." });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push({ field: "email", message: "Invalid email." });
  if (
    (value.phoneNumber != null && typeof value.phoneNumber !== "string") ||
    (phoneNumber && phoneNumber.length > 50)
  )
    errors.push({ field: "phoneNumber", message: "Invalid phone number." });
  if (level !== UserLevel.Admin && level !== UserLevel.Guest)
    errors.push({ field: "level", message: "Invalid role." });
  const password = typeof value.password === "string" ? value.password : "";
  if (level === UserLevel.Admin && (password.length < 12 || password.length > 1024))
    errors.push({ field: "password", message: "Password must contain 12–1024 characters." });
  if (errors.length > 0) return { success: false, errors };
  return {
    success: true,
    data: {
      fullName,
      email,
      phoneNumber,
      level: level === UserLevel.Admin ? UserLevel.Admin : UserLevel.Guest,
      ...(level === UserLevel.Admin ? { password } : {}),
    },
  };
}

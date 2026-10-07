import "server-only";

import { isRecord, type ParseResult } from "@/server/shared/validation/schema";
import type { LoginInput } from "@/shared/contracts/auth";

export function parseLoginInput(value: unknown): ParseResult<LoginInput> {
  if (!isRecord(value) || typeof value.email !== "string" || typeof value.password !== "string") {
    return {
      success: false,
      errors: [{ field: "credentials", message: "Email and password are required." }],
    };
  }
  const email: string = value.email.trim().toLowerCase();
  const password: string = value.password;
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return {
      success: false,
      errors: [{ field: "credentials", message: "Invalid email or password." }],
    };
  }
  return { success: true, data: { email, password } };
}

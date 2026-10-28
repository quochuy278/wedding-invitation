import { ApiErrorCode } from "@/lib/api/types";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { parseCreateUserInput } from "@/server/features/users/user.schema";
import { createUser, UserContactConflict } from "@/server/features/users/user.service";
import { badRequest, ok } from "@/server/shared/http/api-response";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getAdminSession();
    if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
    if (!hasTrustedOrigin(request))
      return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 8192) return privateResponse(badRequest("Request body is too large."));
      body = JSON.parse(text);
    } catch {
      return privateResponse(badRequest("Request body must be valid JSON."));
    }
    const parsed = parseCreateUserInput(body);
    if (!parsed.success) return privateResponse(badRequest("Invalid user.", parsed.errors));
    return privateResponse(ok(await createUser(parsed.data), 201));
  } catch (error: unknown) {
    if (error instanceof UserContactConflict)
      return authError(ApiErrorCode.Conflict, "Email or phone number already exists.", 409);
    console.error("User creation failed:", error instanceof Error ? error.name : "UnknownError");
    return authError(ApiErrorCode.Unavailable, "User could not be saved.", 503);
  }
}

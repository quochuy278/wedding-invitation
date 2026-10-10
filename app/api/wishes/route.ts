import { ApiErrorCode } from "@/lib/api/types";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { requireGuestApiKey } from "@/server/features/invitations/invitation.http";
import { createWishInputSchema } from "@/server/features/wishes/wish.schema";
import { wishService } from "@/server/features/wishes/wish.service";
import { badRequest, notFound, ok } from "@/server/shared/http/api-response";
import { isInvitationCode, normalizeInvitationCode } from "@/shared/utils/invitation-code";

export async function GET(request: Request): Promise<Response> {
  const session = await getAdminSession();
  if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
  const code = normalizeInvitationCode(new URL(request.url).searchParams.get("code") ?? "");
  if (!isInvitationCode(code)) return privateResponse(badRequest("Invalid invitation code."));
  try {
    return privateResponse(ok(await wishService.list(code)));
  } catch (error: unknown) {
    console.error("Wish list failed:", error instanceof Error ? error.name : "UnknownError");
    return authError(ApiErrorCode.Unavailable, "Wishes are temporarily unavailable.", 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireGuestApiKey(request);
  if (denied) return denied;
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return badRequest("Request body is too large.");
    body = JSON.parse(text);
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
  const parsed = createWishInputSchema(body);
  if (!parsed.success) return badRequest("Invalid wish.", parsed.errors);
  try {
    const wish = await wishService.create(parsed.data);
    return wish ? ok(wish) : notFound("Invitation is unavailable or has expired.");
  } catch (error: unknown) {
    console.error("Wish save failed:", error instanceof Error ? error.name : "UnknownError");
    return authError(ApiErrorCode.Unavailable, "Wish could not be saved.", 503);
  }
}

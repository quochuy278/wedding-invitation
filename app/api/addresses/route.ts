import { ApiErrorCode } from "@/lib/api/types";
import { AddressGeocodingError } from "@/server/features/addresses/address.errors";
import { parseCreateAddressInput } from "@/server/features/addresses/address.schema";
import { addressService } from "@/server/features/addresses/address.service";
import { hasTrustedOrigin } from "@/server/features/auth/auth.config";
import { authError, getAdminSession, privateResponse } from "@/server/features/auth/auth.http";
import { badRequest, ok } from "@/server/shared/http/api-response";

export async function GET(): Promise<Response> {
  try {
    const session = await getAdminSession();
    if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
    const addresses = await addressService.list();
    return privateResponse(ok(addresses));
  } catch (error: unknown) {
    console.error("Address list failed:", error instanceof Error ? error.name : "UnknownError");
    return authError(ApiErrorCode.Unavailable, "Addresses are temporarily unavailable.", 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getAdminSession();
    if (!session) return authError(ApiErrorCode.Unauthorized, "Authentication required.", 401);
    const trustedOrigin = hasTrustedOrigin(request);
    if (!trustedOrigin) return authError(ApiErrorCode.Forbidden, "Untrusted request origin.", 403);
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 16_384) return privateResponse(badRequest("Request body is too large."));
      body = JSON.parse(text);
    } catch {
      return privateResponse(badRequest("Request body must be valid JSON."));
    }
    const parsed = parseCreateAddressInput(body);
    if (!parsed.success) return privateResponse(badRequest("Invalid address.", parsed.errors));
    const address = await addressService.create(parsed.data);
    return privateResponse(ok(address, 201));
  } catch (error: unknown) {
    if (error instanceof AddressGeocodingError) {
      if (error.reason === "notFound") {
        return authError(
          ApiErrorCode.GeocodingNotFound,
          "No sufficiently specific location was found. Refine the full address or enter both coordinates.",
          422,
        );
      }
      return authError(
        ApiErrorCode.GeocodingUnavailable,
        "Coordinates are temporarily unavailable. Try again or enter both coordinates.",
        503,
      );
    }
    console.error("Address creation failed:", error instanceof Error ? error.name : "UnknownError");
    return authError(ApiErrorCode.Unavailable, "Address could not be saved.", 503);
  }
}

import { type NextRequest, NextResponse } from "next/server";
import { invitationRateLimit } from "@/server/features/invitations/invitation.http";

export function proxy(request: NextRequest): Response {
  // Limit every public entry point before rendering, database access or QR generation.
  // Keep lookup counting here: Proxy and route rendering have separate runtimes.
  return invitationRateLimit(request) ?? NextResponse.next();
}

export const config = {
  // Include RSC and prefetch requests; client-supplied headers must not bypass this guard.
  matcher: ["/invitation/:path*", "/ticket/:path*", "/api/invitations/:code/:path*"],
};

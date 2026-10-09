import { ApiErrorCode, type ApiErrorResponse } from "@/lib/api/types";
import { invitationTicketService } from "@/server/features/invitations/invitation-ticket.service";
import { notFound } from "@/server/shared/http/api-response";

const responseHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: Request,
  context: RouteContext<"/api/invitations/[code]/ticket/qr">,
): Promise<Response> {
  try {
    const { code } = await context.params;
    const ticket = await invitationTicketService.getByCode(code);
    if (!ticket) return notFound("Invitation not found.");
    const png = new Uint8Array(Buffer.from(ticket.qrDataUrl.split(",")[1], "base64"));
    const fileName = `invitation-${ticket.invitation.code}-qr.png`;
    const contentDisposition = `attachment; filename="${fileName}"`;
    return new Response(png, {
      headers: {
        ...responseHeaders,
        "Content-Type": "image/png",
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error: unknown) {
    console.error(
      "Ticket QR download failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    const body: ApiErrorResponse = {
      error: { code: ApiErrorCode.Unavailable, message: "Ticket QR is temporarily unavailable." },
    };
    return Response.json(body, { status: 503, headers: responseHeaders });
  }
}

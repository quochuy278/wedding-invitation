import { createHash, timingSafeEqual } from "node:crypto";
import {
  invitationEmailService,
  isInvitationEmailEvent,
} from "@/server/features/invitations/invitation-email.service";
import { isRecord } from "@/server/shared/validation/schema";

const maximumBodyBytes = 16_384;
const attemptHeader =
  /^invitation-attempt:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.BREVO_WEBHOOK_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) {
    return new Response(null, { status: 401 });
  }

  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBodyBytes) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      text += decoder.decode(value, { stream: true });
    }
    payload = JSON.parse(text + decoder.decode());
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!isRecord(payload) || typeof payload.event !== "string") {
    return new Response(null, { status: 400 });
  }
  if (!isInvitationEmailEvent(payload.event)) return new Response(null, { status: 204 });

  const custom = payload["X-Mailin-custom"];
  const attemptId = typeof custom === "string" ? attemptHeader.exec(custom)?.[1] : undefined;
  if (!attemptId) return new Response(null, { status: 204 });
  const messageId = payload["message-id"];
  if (typeof messageId !== "string" || !messageId.trim() || messageId.length > 512) {
    return new Response(null, { status: 400 });
  }

  try {
    await invitationEmailService.applyEvent(payload.event, attemptId, messageId);
    return new Response(null, { status: 204 });
  } catch {
    console.error("Brevo webhook update failed.");
    // Brevo discards callbacks on 5xx; 429 leaves the event eligible for retry.
    return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
  }
}

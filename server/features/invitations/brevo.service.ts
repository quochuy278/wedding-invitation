import "server-only";

import { isRecord } from "@/server/shared/validation/schema";
import type { CreatedInvitationDto } from "@/shared/contracts/invitation";
import { invitationEmailContent } from "./invitation-email.template";

export class BrevoEmailError extends Error {
  constructor(public readonly code: "configuration" | "provider" | "unconfirmed") {
    super("Invitation email could not be confirmed.");
    this.name = "BrevoEmailError";
  }
}

function emailConfig() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "noreply";
  const baseUrl = process.env.APP_URL?.trim() || process.env.AUTH_ORIGIN?.trim();
  const validEmail = senderEmail && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(senderEmail);
  if (!apiKey || !validEmail || !baseUrl) throw new BrevoEmailError("configuration");
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new BrevoEmailError("configuration");
  }
  const validProtocol =
    parsed.protocol === "https:" ||
    (process.env.NODE_ENV !== "production" && parsed.protocol === "http:");
  if (!validProtocol || parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new BrevoEmailError("configuration");
  return { apiKey, senderEmail, senderName, origin: parsed.origin };
}

export const brevoService = {
  async sendInvitation(invitation: CreatedInvitationDto): Promise<string> {
    const config = emailConfig();
    const path = `/invitation/${encodeURIComponent(invitation.code)}`;
    const invitationUrl = new URL(path, config.origin).href;
    const content = invitationEmailContent(invitation, invitationUrl);
    const body = {
      sender: { name: config.senderName, email: config.senderEmail },
      to: [{ name: invitation.guestName, email: invitation.email }],
      ...content,
      tags: ["wedding-invitation"],
    };
    let response: Response;
    try {
      response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": config.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      // A timed-out request may already have been accepted; never retry automatically.
      throw new BrevoEmailError("unconfirmed");
    }
    if (!response.ok) {
      const code =
        response.status === 401 || response.status === 403 ? "configuration" : "provider";
      throw new BrevoEmailError(code);
    }
    try {
      const result: unknown = await response.json();
      if (!isRecord(result) || typeof result.messageId !== "string" || !result.messageId.trim())
        throw new BrevoEmailError("unconfirmed");
      return result.messageId;
    } catch {
      throw new BrevoEmailError("unconfirmed");
    }
  },
};

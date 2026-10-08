import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthConfig } from "@/server/features/auth/auth.config";
import type { InvitationDto } from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";

type TicketInvitation = Pick<InvitationDto, "id" | "code" | "expiresAt">;
const ticketPattern = /^WIT1\.([A-Z0-9]{6})\.([a-z0-9]{1,11})\.([A-Za-z0-9_-]{43})$/;

function parseTicketToken(token: string): RegExpExecArray | null {
  const match = ticketPattern.exec(token);
  // A JavaScript `$` also matches before a final newline; accept the exact token only.
  return match?.[0] === token ? match : null;
}

function ticketPayload(invitation: TicketInvitation): string {
  const expiry = Date.parse(invitation.expiresAt).toString(36);
  return `WIT1.${invitation.code}.${expiry}`;
}

function ticketSignature(payload: string, invitationId: string): string {
  const { secret } = getAuthConfig();
  // Separate ticket signing from admin JWT signing, while retaining the existing secret setup.
  const ticketKey = createHmac("sha256", secret).update("wedding-invitation-ticket:v1").digest();
  return createHmac("sha256", ticketKey)
    .update(payload)
    .update("\0")
    .update(invitationId)
    .digest("base64url");
}

export function issueInvitationTicketToken(invitation: TicketInvitation): string {
  const payload = ticketPayload(invitation);
  const signature = ticketSignature(payload, invitation.id);
  return `${payload}.${signature}`;
}

// This extracts an untrusted lookup code only; it does not authenticate the QR.
export function readInvitationTicketCode(token: string): string | null {
  const match = parseTicketToken(token);
  return match?.[1] ?? null;
}

export function verifyInvitationTicketToken(token: string, invitation: TicketInvitation): boolean {
  const match = parseTicketToken(token);
  const expired = Date.parse(invitation.expiresAt) <= now().valueOf();
  if (!match || expired) return false;
  const payload = `WIT1.${match[1]}.${match[2]}`;
  const expectedPayload = ticketPayload(invitation);
  if (payload !== expectedPayload) return false;
  const signature = Buffer.from(match[3], "ascii");
  const expectedSignature = Buffer.from(ticketSignature(payload, invitation.id), "ascii");
  return timingSafeEqual(signature, expectedSignature);
}

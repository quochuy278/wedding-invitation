import "server-only";

import { randomUUID } from "node:crypto";
import type { InvitationEmailStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { toAddressDto } from "@/server/features/addresses/address.service";
import type { CreatedInvitationDto } from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";
import { BrevoEmailError, brevoService } from "./brevo.service";
import { activeInvitationWhere, type CreatedInvitationRecord } from "./invitation.repository";

export function toCreatedInvitationDto(invitation: CreatedInvitationRecord): CreatedInvitationDto {
  return {
    id: invitation.id,
    code: invitation.code,
    status: invitation.status,
    guestName: invitation.user.full_name,
    email: invitation.user.email,
    phoneNumber: invitation.user.phone_number,
    address: toAddressDto(invitation.address),
    expiresAt: invitation.expires_at.toISOString(),
    personalMessage: invitation.personal_message,
  };
}

const webhookTransitions = {
  request: { status: "accepted", from: ["pending", "unconfirmed"] },
  delivered: { status: "delivered", from: ["pending", "unconfirmed", "accepted", "bounced"] },
  hard_bounce: { status: "bounced", from: ["pending", "unconfirmed", "accepted"] },
  blocked: { status: "bounced", from: ["pending", "unconfirmed", "accepted"] },
  invalid_email: { status: "bounced", from: ["pending", "unconfirmed", "accepted"] },
  error: { status: "bounced", from: ["pending", "unconfirmed", "accepted"] },
} satisfies Record<string, { status: InvitationEmailStatus; from: InvitationEmailStatus[] }>;

export type InvitationEmailEvent = keyof typeof webhookTransitions;

const pendingTimeoutMs = 60_000;

export function isInvitationEmailEvent(event: string): event is InvitationEmailEvent {
  return Object.hasOwn(webhookTransitions, event);
}

function normalizeMessageId(messageId: string): string {
  return messageId.trim().replace(/^<(.*)>$/, "$1");
}

export const invitationEmailService = {
  visibleStatus(
    status: InvitationEmailStatus | null,
    attemptedAt: Date | null,
    currentTime: number,
  ): InvitationEmailStatus | null {
    if (
      status === "pending" &&
      attemptedAt &&
      currentTime - attemptedAt.getTime() > pendingTimeoutMs
    ) {
      return "unconfirmed";
    }
    return status;
  },

  async send(code: string, allowResend: boolean): Promise<boolean> {
    const attemptId = randomUUID();
    const currentTime = now();
    const attemptedAt = currentTime.toDate();
    const staleBefore = currentTime.subtract(pendingTimeoutMs, "millisecond").toDate();
    const active = activeInvitationWhere(code);
    const invitation = await prisma.invitation
      .update({
        where: {
          code,
          AND: [
            active,
            {
              OR: allowResend
                ? [
                    { email_status: null },
                    { email_status: { not: "pending" } },
                    { email_status: "pending", email_attempted_at: { lt: staleBefore } },
                  ]
                : [{ email_status: null }],
            },
          ],
        },
        data: {
          email_status: "pending",
          email_attempt_id: attemptId,
          email_attempted_at: attemptedAt,
          email_message_id: null,
          email_error: null,
        },
        include: { user: true, address: true },
      })
      .catch((error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "P2025") return null;
        throw error;
      });
    if (!invitation) return false;

    let status: InvitationEmailStatus = "accepted";
    let messageId: string | null = null;
    let reason: string | null = null;
    try {
      const responseId = await brevoService.sendInvitation(
        toCreatedInvitationDto(invitation),
        attemptId,
      );
      messageId = normalizeMessageId(responseId);
    } catch (error: unknown) {
      reason = error instanceof BrevoEmailError ? error.code : "unconfirmed";
      status = reason === "unconfirmed" ? "unconfirmed" : "failed";
    }
    await prisma.invitation.updateMany({
      where: { email_attempt_id: attemptId, email_status: "pending" },
      data: { email_status: status, email_message_id: messageId, email_error: reason },
    });
    return true;
  },

  async applyEvent(
    event: InvitationEmailEvent,
    attemptId: string,
    messageId: string,
  ): Promise<void> {
    const { status, from } = webhookTransitions[event];
    const normalizedId = normalizeMessageId(messageId);
    await prisma.invitation.updateMany({
      where: {
        email_attempt_id: attemptId,
        email_status: { in: from },
        OR: [{ email_message_id: null }, { email_message_id: normalizedId }],
      },
      data: {
        email_status: status,
        email_message_id: normalizedId,
        email_error: status === "bounced" ? event : null,
      },
    });
  },
};

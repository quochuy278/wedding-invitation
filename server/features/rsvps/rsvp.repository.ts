import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { activeInvitationWhere } from "@/server/features/invitations/invitation.repository";
import { confirmedInvitationStatuses } from "@/shared/utils/invitation-status";
import { RsvpAlreadyAttendedError } from "./rsvp.errors";
import type { CreateRsvpInput } from "./rsvp.types";

const rsvpSelect = {
  id: true,
  code: true,
  status: true,
  guest_count: true,
  updated_at: true,
  user: { select: { full_name: true } },
} as const satisfies Prisma.InvitationSelect;

export type RsvpRecord = Prisma.InvitationGetPayload<{ select: typeof rsvpSelect }>;

export const rsvpRepository = {
  findMany(): Promise<RsvpRecord[]> {
    return prisma.invitation.findMany({
      where: {
        status: { in: [...confirmedInvitationStatuses, "declined"] },
        deleted_at: null,
        user: { deleted_at: null },
      },
      select: rsvpSelect,
      orderBy: [{ updated_at: "desc" }, { id: "desc" }],
    });
  },

  create(input: CreateRsvpInput): Promise<RsvpRecord | null> {
    return prisma.$transaction(async (transaction) => {
      // Eligibility is checked in the write, rather than in a separate lookup.
      const result = await transaction.invitation.updateMany({
        where: { ...activeInvitationWhere(input.code), status: { not: "attended" } },
        data: {
          status: input.attendance === "yes" ? "accepted" : "declined",
          guest_count: input.guestCount,
        },
      });
      if (result.count === 0) {
        const attended = await transaction.invitation.findFirst({
          where: { ...activeInvitationWhere(input.code), status: "attended" },
          select: { id: true },
        });
        if (attended) throw new RsvpAlreadyAttendedError();
        return null;
      }
      return transaction.invitation.findUniqueOrThrow({
        where: { code: input.code },
        select: rsvpSelect,
      });
    });
  },
};

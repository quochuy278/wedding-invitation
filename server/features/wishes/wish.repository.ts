import "server-only";

import { prisma } from "@/server/db/prisma";
import { activeInvitationWhere } from "@/server/features/invitations/invitation.repository";
import type { CreateWishInput } from "@/shared/contracts/guest-response";

const wishSelect = { id: true, content: true, created_at: true } as const;

export const wishRepository = {
  findMany(code: string) {
    return prisma.wish.findMany({
      where: { invitation: { code, deleted_at: null, user: { deleted_at: null } } },
      select: wishSelect,
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });
  },
  create(input: CreateWishInput) {
    return prisma.$transaction(async (transaction) => {
      // Lock this active invitation so simultaneous retries cannot create duplicate wishes.
      const available = await transaction.invitation.updateMany({
        where: activeInvitationWhere(input.code),
        data: { updated_at: new Date() },
      });
      if (available.count === 0) return null;
      const invitation = await transaction.invitation.findUniqueOrThrow({
        where: { code: input.code },
        select: { id: true },
      });
      const where = { invitation_id: invitation.id, content: input.content };
      const existing = await transaction.wish.findFirst({ where, select: wishSelect });
      return existing ?? transaction.wish.create({ data: where, select: wishSelect });
    });
  },
};

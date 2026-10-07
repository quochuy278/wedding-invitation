import "server-only";

import type { Invitation, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { now } from "@/shared/utils/date";

const publicInvitationSelect = {
  id: true,
  code: true,
  status: true,
  guest_count: true,
  expires_at: true,
  user: {
    select: {
      full_name: true,
    },
  },
  address: {
    select: {
      name: true,
      address_text: true,
      event_at: true,
    },
  },
  wishes: {
    select: {
      id: true,
      content: true,
      created_at: true,
    },
    orderBy: {
      created_at: "asc" as const,
    },
  },
} as const satisfies Prisma.InvitationSelect;

type PublicInvitationArgs = { select: typeof publicInvitationSelect };
export type PublicInvitationRecord = Prisma.InvitationGetPayload<PublicInvitationArgs>;
type InvitationIdRecord = Pick<Invitation, "id">;
type InvitationRepository = {
  findActiveIdByCode(code: string): Promise<InvitationIdRecord | null>;
  findActiveByCode(code: string): Promise<PublicInvitationRecord | null>;
};

function activeInvitationWhere(code: string): Prisma.InvitationWhereInput {
  const currentDate: Date = now().toDate();
  return {
    code,
    deleted_at: null,
    expires_at: { gt: currentDate },
    user: {
      deleted_at: null,
    },
  };
}

export const invitationRepository: InvitationRepository = {
  findActiveIdByCode(code: string): Promise<InvitationIdRecord | null> {
    return prisma.invitation.findFirst({
      where: activeInvitationWhere(code),
      select: {
        id: true,
      },
    });
  },

  findActiveByCode(code: string): Promise<PublicInvitationRecord | null> {
    return prisma.invitation.findFirst({
      where: activeInvitationWhere(code),
      select: publicInvitationSelect,
    });
  },
};

import "server-only";

import { prisma } from "@/server/db/prisma";

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
} as const;

export const invitationRepository = {
  findActiveByCode(code: string) {
    return prisma.invitation.findFirst({
      where: {
        code,
        deleted_at: null,
        user: {
          deleted_at: null,
        },
      },
      select: publicInvitationSelect,
    });
  },
};

export type PublicInvitationRecord = NonNullable<
  Awaited<ReturnType<typeof invitationRepository.findActiveByCode>>
>;

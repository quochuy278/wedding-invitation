import "server-only";

import type { Invitation, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import type { InvitationListDto, InvitationListParams } from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";

const adminInvitationSelect = {
  id: true,
  code: true,
  status: true,
  guest_count: true,
  updated_at: true,
  user: { select: { full_name: true, phone_number: true } },
} as const satisfies Prisma.InvitationSelect;

export type InvitationListRecord = Prisma.InvitationGetPayload<{
  select: typeof adminInvitationSelect;
}>;

type InvitationListResult = {
  items: InvitationListRecord[];
  pagination: InvitationListDto["pagination"];
  summary: InvitationListDto["summary"];
};

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
  findPage(params: InvitationListParams): Promise<InvitationListResult>;
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
  findPage(params: InvitationListParams): Promise<InvitationListResult> {
    const where: Prisma.InvitationWhereInput = { deleted_at: null, user: { deleted_at: null } };
    // Count, summary and rows share a snapshot, even if invitations change during the request.
    return prisma.$transaction(
      async (transaction): Promise<InvitationListResult> => {
        const groups = await transaction.invitation.groupBy({
          by: ["status"],
          where,
          _count: { _all: true },
          _sum: { guest_count: true },
        });
        const totalItems: number = groups.reduce((total, group) => total + group._count._all, 0);
        const totalPages: number = Math.max(1, Math.ceil(totalItems / params.pageSize));
        const page: number = Math.min(params.page, totalPages);
        const accepted = groups.find((group) => group.status === "accepted");
        const pending = groups.find((group) => group.status === "pending");
        const items: InvitationListRecord[] = await transaction.invitation.findMany({
          where,
          select: adminInvitationSelect,
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          skip: (page - 1) * params.pageSize,
          take: params.pageSize,
        });
        return {
          items,
          pagination: { page, pageSize: params.pageSize, totalItems, totalPages },
          summary: {
            totalInvitations: totalItems,
            acceptedInvitations: accepted?._count._all ?? 0,
            acceptedGuests: accepted?._sum.guest_count ?? 0,
            pendingInvitations: pending?._count._all ?? 0,
          },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  },

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

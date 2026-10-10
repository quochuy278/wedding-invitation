import "server-only";

import { type Invitation, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { isRecord } from "@/server/shared/validation/schema";
import { UserLevel } from "@/shared/contracts/auth";
import type {
  CreateInvitationInput,
  InvitationListDto,
  InvitationListParams,
} from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";
import { isConfirmedInvitationStatus } from "@/shared/utils/invitation-status";
import { InvitationCreationError } from "./invitation.errors";
import { invitationCodeGenerator } from "./invitation-code";

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
  personal_message: true,
  user: {
    select: {
      full_name: true,
    },
  },
  address: true,
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
const createdInvitationInclude = {
  user: true,
  address: true,
} as const satisfies Prisma.InvitationInclude;
export type CreatedInvitationRecord = Prisma.InvitationGetPayload<{
  include: typeof createdInvitationInclude;
}>;
type InvitationRepository = {
  create(input: CreateInvitationInput): Promise<CreatedInvitationRecord>;
  findPage(params: InvitationListParams): Promise<InvitationListResult>;
  findActiveIdByCode(code: string): Promise<InvitationIdRecord | null>;
  findActiveByCode(code: string): Promise<PublicInvitationRecord | null>;
  checkIn(invitation: {
    id: string;
    code: string;
    expiresAt: string;
  }): Promise<{ record: PublicInvitationRecord; recorded: boolean } | null>;
};

export function activeInvitationWhere(code: string): Prisma.InvitationWhereInput {
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

function isInvitationCodeConflict(error: Prisma.PrismaClientKnownRequestError): boolean {
  const target = error.meta?.target;
  if (Array.isArray(target) && target.includes("code")) return true;
  const adapterError = error.meta?.driverAdapterError;
  if (!isRecord(adapterError) || !isRecord(adapterError.cause)) return false;
  const constraint = adapterError.cause.constraint;
  return isRecord(constraint) && constraint.index === "invitations_code_key";
}

const maximumCodeAttempts = 5;

export const invitationRepository: InvitationRepository = {
  async create(input: CreateInvitationInput): Promise<CreatedInvitationRecord> {
    for (let attempt = 0; attempt < maximumCodeAttempts; attempt += 1) {
      try {
        return await prisma.$transaction(async (transaction): Promise<CreatedInvitationRecord> => {
          const address = await transaction.address.findUnique({
            where: { id: input.addressId },
            select: { id: true },
          });
          if (!address) throw new InvitationCreationError("addressNotFound", ["addressId"]);
          const contacts: Prisma.UserWhereInput[] = [
            { email: { equals: input.email, mode: "insensitive" } },
          ];
          if (input.phoneNumber) contacts.push({ phone_number: input.phoneNumber });
          const existingContact = await transaction.user.findFirst({
            where: { OR: contacts },
            select: { email: true, phone_number: true },
          });
          if (existingContact) {
            const fields: string[] = [];
            const duplicateEmail =
              existingContact.email.toLowerCase() === input.email.toLowerCase();
            const duplicatePhone =
              Boolean(input.phoneNumber) && existingContact.phone_number === input.phoneNumber;
            if (duplicateEmail) fields.push("email");
            if (duplicatePhone) fields.push("phoneNumber");
            throw new InvitationCreationError("contactConflict", fields);
          }
          const data: Prisma.InvitationCreateInput = {
            code: invitationCodeGenerator.generate(),
            status: "pending",
            guest_count: 0,
            expires_at: new Date(input.expiresAt),
            personal_message: input.personalMessage,
            address: { connect: { id: input.addressId } },
            user: {
              create: {
                full_name: input.guestName,
                email: input.email,
                phone_number: input.phoneNumber,
                level: UserLevel.Guest,
              },
            },
          };
          return transaction.invitation.create({ data, include: createdInvitationInclude });
        });
      } catch (error: unknown) {
        const uniqueConflict =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!uniqueConflict) throw error;
        // PostgreSQL aborts a failed transaction, so a collision retries the whole creation.
        if (isInvitationCodeConflict(error)) continue;
        throw new InvitationCreationError("contactConflict", ["email", "phoneNumber"]);
      }
    }
    throw new Error("Could not allocate a unique invitation code.");
  },
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
        const confirmed = groups.filter((group) => isConfirmedInvitationStatus(group.status));
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
            acceptedInvitations: confirmed.reduce((total, group) => total + group._count._all, 0),
            acceptedGuests: confirmed.reduce(
              (total, group) => total + (group._sum.guest_count ?? 0),
              0,
            ),
            pendingInvitations: pending?._count._all ?? 0,
          },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  },

  checkIn(invitation) {
    return prisma.$transaction(async (transaction) => {
      // Recheck the signed identity, deadline and eligibility in the write itself.
      const where: Prisma.InvitationWhereInput = {
        ...activeInvitationWhere(invitation.code),
        id: invitation.id,
        AND: [{ expires_at: new Date(invitation.expiresAt) }],
      };
      const result = await transaction.invitation.updateMany({
        where: { ...where, status: "accepted" },
        data: { status: "attended" },
      });
      const record = await transaction.invitation.findFirst({
        where,
        select: publicInvitationSelect,
      });
      return record ? { record, recorded: result.count === 1 } : null;
    });
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

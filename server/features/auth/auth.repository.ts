import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { UserLevel } from "@/shared/contracts/auth";

const authUserSelect = {
  id: true,
  full_name: true,
  email: true,
  level: true,
  password_hash: true,
  deleted_at: true,
} as const satisfies Prisma.UserSelect;

const sessionUserSelect = {
  id: true,
  full_name: true,
  email: true,
  level: true,
  deleted_at: true,
} as const satisfies Prisma.UserSelect;

const activeSessionArgs = {
  include: {
    user: { select: sessionUserSelect },
  },
} satisfies Prisma.SessionDefaultArgs;

type AuthUserArgs = { select: typeof authUserSelect };
export type AuthUserRecord = Prisma.UserGetPayload<AuthUserArgs>;
export type AuthSessionRecord = Prisma.SessionGetPayload<typeof activeSessionArgs>;

export type ActiveSessionQuery = {
  sessionId: string;
  userId: string;
  currentDate: Date;
};

export type CreateAuthSessionInput = {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
};

export type RotateRefreshTokenInput = {
  sessionId: string;
  userId: string;
  previousRefreshTokenHash: string;
  nextRefreshTokenHash: string;
  currentDate: Date;
};

export type RevokeAuthSessionInput = {
  sessionId: string;
  userId: string;
  revokedAt: Date;
};

type AuthRepository = {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findActiveSession(query: ActiveSessionQuery): Promise<AuthSessionRecord | null>;
  createSession(input: CreateAuthSessionInput): Promise<void>;
  rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean>;
  revokeSession(input: RevokeAuthSessionInput): Promise<void>;
};

export const authRepository: AuthRepository = {
  findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: authUserSelect,
    });
  },

  findActiveSession(query: ActiveSessionQuery): Promise<AuthSessionRecord | null> {
    return prisma.session.findFirst({
      ...activeSessionArgs,
      where: {
        id: query.sessionId,
        user_id: query.userId,
        revoked_at: null,
        expires_at: { gt: query.currentDate },
        user: { level: UserLevel.Admin, deleted_at: null },
      },
    });
  },

  async createSession(input: CreateAuthSessionInput): Promise<void> {
    const data: Prisma.SessionUncheckedCreateInput = {
      id: input.sessionId,
      user_id: input.userId,
      refresh_token_hash: input.refreshTokenHash,
      expires_at: input.expiresAt,
    };
    await prisma.session.create({ data });
  },

  async rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean> {
    const result: Prisma.BatchPayload = await prisma.session.updateMany({
      where: {
        id: input.sessionId,
        user_id: input.userId,
        refresh_token_hash: input.previousRefreshTokenHash,
        revoked_at: null,
        expires_at: { gt: input.currentDate },
        user: { level: UserLevel.Admin, deleted_at: null },
      },
      data: { refresh_token_hash: input.nextRefreshTokenHash },
    });
    return result.count === 1;
  },

  async revokeSession(input: RevokeAuthSessionInput): Promise<void> {
    await prisma.session.updateMany({
      where: {
        id: input.sessionId,
        user_id: input.userId,
        revoked_at: null,
      },
      data: { revoked_at: input.revokedAt },
    });
  },
};

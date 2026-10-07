import "server-only";

import { type AuthSessionDto, type LoginInput, UserLevel } from "@/shared/contracts/auth";
import { now } from "@/shared/utils/date";
import { generateId } from "@/shared/utils/id";
import { type AuthConfig, getAuthConfig } from "./auth.config";
import {
  type ActiveSessionQuery,
  type AuthSessionRecord,
  type AuthUserRecord,
  authRepository,
  type CreateAuthSessionInput,
  type RevokeAuthSessionInput,
  type RotateRefreshTokenInput,
} from "./auth.repository";
import { verifyPassword } from "./password";
import {
  type AuthTokens,
  hashRefreshToken,
  issueTokens,
  type TokenClaims,
  TokenPurpose,
  type TokenSession,
  verifyToken,
} from "./token";

type SessionUser = Pick<AuthUserRecord, "id" | "full_name" | "email" | "level" | "deleted_at">;

export type AuthResult = {
  session: AuthSessionDto;
  tokens: AuthTokens;
};

function toSessionDto(user: SessionUser, expiresAt: Date): AuthSessionDto {
  return {
    user: { id: user.id, fullName: user.full_name, email: user.email, level: UserLevel.Admin },
    expiresAt: expiresAt.toISOString(),
  };
}

async function findActiveSession(claims: TokenClaims): Promise<AuthSessionRecord | null> {
  const currentDate: Date = now().toDate();
  const query: ActiveSessionQuery = {
    sessionId: claims.sessionId,
    userId: claims.userId,
    currentDate,
  };
  return authRepository.findActiveSession(query);
}

export async function login(input: LoginInput): Promise<AuthResult | null> {
  const user: AuthUserRecord | null = await authRepository.findUserByEmail(input.email);
  const passwordHash: string | null = user?.password_hash ?? null;
  const matches: boolean = await verifyPassword(passwordHash, input.password);
  if (!user || !matches || user.level !== UserLevel.Admin || user.deleted_at !== null) return null;

  const config: AuthConfig = getAuthConfig();
  const sessionExpiresAt: Date = now().add(config.sessionLifetimeSeconds, "second").toDate();
  const sessionId: string = generateId();
  const session: TokenSession = {
    id: sessionId,
    user_id: user.id,
    expires_at: sessionExpiresAt,
  };
  const tokens: AuthTokens = await issueTokens(session);
  const refreshTokenHash: string = hashRefreshToken(tokens.refreshToken);
  const sessionData: CreateAuthSessionInput = {
    sessionId: session.id,
    userId: session.user_id,
    refreshTokenHash,
    expiresAt: session.expires_at,
  };
  await authRepository.createSession(sessionData);
  const authSession: AuthSessionDto = toSessionDto(user, session.expires_at);
  return { session: authSession, tokens };
}

export async function getSession(accessToken: string | undefined): Promise<AuthSessionDto | null> {
  const claims: TokenClaims | null = await verifyToken(accessToken, TokenPurpose.Access);
  if (!claims) return null;
  const session: AuthSessionRecord | null = await findActiveSession(claims);
  if (!session) return null;
  const authSession: AuthSessionDto = toSessionDto(session.user, session.expires_at);
  return authSession;
}

export async function refresh(refreshToken: string | undefined): Promise<AuthResult | null> {
  const claims: TokenClaims | null = await verifyToken(refreshToken, TokenPurpose.Refresh);
  if (!claims || !refreshToken) return null;
  const session: AuthSessionRecord | null = await findActiveSession(claims);
  if (!session) return null;
  const previousHash: string = hashRefreshToken(refreshToken);

  // Only a valid, signed refresh token can trigger reuse revocation.
  if (session.refresh_token_hash !== previousHash) {
    await revokeSession(claims);
    return null;
  }
  const tokens: AuthTokens = await issueTokens(session);
  const currentDate: Date = now().toDate();
  const refreshTokenHash: string = hashRefreshToken(tokens.refreshToken);
  const rotationInput: RotateRefreshTokenInput = {
    sessionId: session.id,
    userId: claims.userId,
    previousRefreshTokenHash: previousHash,
    nextRefreshTokenHash: refreshTokenHash,
    currentDate,
  };
  const rotated: boolean = await authRepository.rotateRefreshToken(rotationInput);
  if (!rotated) {
    await revokeSession(claims);
    return null;
  }
  const authSession: AuthSessionDto = toSessionDto(session.user, session.expires_at);
  return { session: authSession, tokens };
}

async function revokeSession(claims: TokenClaims): Promise<void> {
  const revokedAt: Date = now().toDate();
  const input: RevokeAuthSessionInput = {
    sessionId: claims.sessionId,
    userId: claims.userId,
    revokedAt,
  };
  await authRepository.revokeSession(input);
}

export async function logout(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): Promise<void> {
  const claims: TokenClaims | null =
    (await verifyToken(refreshToken, TokenPurpose.Refresh)) ??
    (await verifyToken(accessToken, TokenPurpose.Access));
  if (claims) await revokeSession(claims);
}

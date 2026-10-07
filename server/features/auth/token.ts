import "server-only";

import { createHash } from "node:crypto";
import type { Dayjs } from "dayjs";
import { type JWTPayload, type JWTVerifyResult, jwtVerify, SignJWT } from "jose";
import { now } from "@/shared/utils/date";
import { generateId } from "@/shared/utils/id";
import { type AuthConfig, getAuthConfig } from "./auth.config";

export enum TokenPurpose {
  Access = "admin-access",
  Refresh = "admin-refresh",
}

type TokenPayload = JWTPayload & {
  sid: string;
};

export type TokenClaims = {
  userId: string;
  sessionId: string;
  tokenId: string;
};

export type TokenSession = {
  id: string;
  user_id: string;
  expires_at: Date;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

async function signToken(
  session: TokenSession,
  purpose: TokenPurpose,
  expiresAt: Date,
  config: AuthConfig,
): Promise<string> {
  const payload: TokenPayload = { sid: session.id };
  const currentTime: Dayjs = now();
  const issuedAt: number = currentTime.unix();
  const expirationTime: number = Math.floor(expiresAt.getTime() / 1000);
  const tokenId: string = generateId();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(session.user_id)
    .setJti(tokenId)
    .setIssuer(config.issuer)
    .setAudience(purpose)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expirationTime)
    .sign(config.secret);
}

export async function issueTokens(session: TokenSession): Promise<AuthTokens> {
  const config: AuthConfig = getAuthConfig();
  const currentTime: Dayjs = now();
  const accessLifetimeExpiresAt: Dayjs = currentTime.add(config.accessLifetimeSeconds, "second");
  const accessLifetimeExpiresAtValue: number = accessLifetimeExpiresAt.valueOf();
  const sessionExpiresAt: number = session.expires_at.getTime();
  const accessExpiresAt: Date =
    accessLifetimeExpiresAtValue <= sessionExpiresAt
      ? accessLifetimeExpiresAt.toDate()
      : session.expires_at;
  const refreshExpiresAt: Date = session.expires_at;
  const accessToken: string = await signToken(
    session,
    TokenPurpose.Access,
    accessExpiresAt,
    config,
  );
  const refreshToken: string = await signToken(
    session,
    TokenPurpose.Refresh,
    refreshExpiresAt,
    config,
  );
  return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
}

export async function verifyToken(
  token: string | undefined,
  purpose: TokenPurpose,
): Promise<TokenClaims | null> {
  if (!token || token.length > 4096) return null;
  const config: AuthConfig = getAuthConfig();
  try {
    const result: JWTVerifyResult<TokenPayload> = await jwtVerify<TokenPayload>(
      token,
      config.secret,
      {
        algorithms: ["HS256"],
        issuer: config.issuer,
        audience: purpose,
        requiredClaims: ["sub", "sid", "jti", "iat", "exp"],
      },
    );
    const payload: TokenPayload = result.payload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.jti !== "string"
    ) {
      return null;
    }
    return { userId: payload.sub, sessionId: payload.sid, tokenId: payload.jti };
  } catch {
    return null;
  }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

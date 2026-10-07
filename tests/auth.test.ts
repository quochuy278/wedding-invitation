import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import { getAuthConfig, hasTrustedOrigin } from "@/server/features/auth/auth.config";
import { parseLoginInput } from "@/server/features/auth/auth.schema";
import { hashPassword, verifyPassword } from "@/server/features/auth/password";
import {
  type AuthTokens,
  hashRefreshToken,
  issueTokens,
  type TokenClaims,
  TokenPurpose,
  type TokenSession,
  verifyToken,
} from "@/server/features/auth/token";
import {
  checkRateLimit,
  type RateLimitPolicy,
  requestIdentity,
} from "@/server/shared/http/rate-limit";
import type { ParseResult } from "@/server/shared/validation/schema";
import { type LoginInput, UserLevel } from "@/shared/contracts/auth";
import { now } from "@/shared/utils/date";
import { generateId } from "@/shared/utils/id";

process.env.AUTH_SECRET = randomBytes(48).toString("base64url");
process.env.AUTH_ORIGIN = "https://wedding.example";

test("UserLevel preserves the approved database integers", (): void => {
  assert.equal(UserLevel.Admin, 0);
  assert.equal(UserLevel.Guest, 1);
});

test("Argon2id uses unique salts and rejects incorrect or absent hashes", async (): Promise<void> => {
  const password: string = "  a long Unicode mật khẩu  ";
  const first: string = await hashPassword(password);
  const second: string = await hashPassword(password);
  assert.match(first, /^\$argon2id\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(first, password), true);
  assert.equal(await verifyPassword(first, password.trim()), false);
  assert.equal(await verifyPassword(null, password), false);
});

test("login parser normalizes email, preserves password, and bounds input", (): void => {
  const result: ParseResult<LoginInput> = parseLoginInput({
    email: " ADMIN@Example.com ",
    password: " with spaces ",
  });
  assert.equal(result.success, true);
  if (result.success)
    assert.deepEqual(result.data, { email: "admin@example.com", password: " with spaces " });
  assert.equal(
    parseLoginInput({ email: "admin@example.com", password: "a".repeat(1025) }).success,
    false,
  );
  assert.equal(parseLoginInput(null).success, false);
});

test("JWTs verify only for their intended purpose and reject tampering", async (): Promise<void> => {
  const sessionExpiresAt: Date = now().add(1, "hour").toDate();
  const session: TokenSession = {
    id: generateId(),
    user_id: generateId(),
    expires_at: sessionExpiresAt,
  };
  const tokens: AuthTokens = await issueTokens(session);
  const claims: TokenClaims | null = await verifyToken(tokens.accessToken, TokenPurpose.Access);
  assert.equal(claims?.sessionId, session.id);
  assert.equal(claims?.userId, session.user_id);
  assert.equal(await verifyToken(tokens.accessToken, TokenPurpose.Refresh), null);
  assert.equal(await verifyToken(tokens.refreshToken, TokenPurpose.Access), null);
  assert.equal(await verifyToken(`${tokens.refreshToken}tampered`, TokenPurpose.Refresh), null);
  assert.equal(hashRefreshToken(tokens.refreshToken).length, 64);
  assert.ok(tokens.accessExpiresAt.getTime() < tokens.refreshExpiresAt.getTime());
});

test("JWT expiry, issuer and algorithm are enforced", async (): Promise<void> => {
  const expiredAt: Date = now().subtract(10, "second").toDate();
  const expiredSession: TokenSession = {
    id: generateId(),
    user_id: generateId(),
    expires_at: expiredAt,
  };
  const expired: AuthTokens = await issueTokens(expiredSession);
  assert.equal(await verifyToken(expired.accessToken, TokenPurpose.Access), null);
  assert.equal(await verifyToken(expired.refreshToken, TokenPurpose.Refresh), null);
  const wrongIssuerSessionId: string = generateId();
  const wrongIssuerUserId: string = generateId();
  const wrongIssuerTokenId: string = generateId();
  const wrongIssuer: string = await new SignJWT({ sid: wrongIssuerSessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(wrongIssuerUserId)
    .setJti(wrongIssuerTokenId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .setAudience(TokenPurpose.Access)
    .setIssuer("untrusted")
    .sign(getAuthConfig().secret);
  assert.equal(await verifyToken(wrongIssuer, TokenPurpose.Access), null);
  const wrongAlgorithmSessionId: string = generateId();
  const wrongAlgorithmUserId: string = generateId();
  const wrongAlgorithmTokenId: string = generateId();
  const wrongAlgorithm: string = await new SignJWT({ sid: wrongAlgorithmSessionId })
    .setProtectedHeader({ alg: "HS512" })
    .setSubject(wrongAlgorithmUserId)
    .setJti(wrongAlgorithmTokenId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .setAudience(TokenPurpose.Access)
    .setIssuer(getAuthConfig().issuer)
    .sign(getAuthConfig().secret);
  assert.equal(await verifyToken(wrongAlgorithm, TokenPurpose.Access), null);
});

test("auth mutations accept only the exact configured origin", (): void => {
  assert.equal(
    hasTrustedOrigin(
      new Request("https://wedding.example/api/auth/login", {
        headers: { origin: "https://wedding.example" },
      }),
    ),
    true,
  );
  for (const origin of ["null", "https://evil.example", "https://wedding.example.evil.example"]) {
    assert.equal(
      hasTrustedOrigin(
        new Request("https://wedding.example/api/auth/login", { headers: { origin } }),
      ),
      false,
    );
  }
  assert.equal(hasTrustedOrigin(new Request("https://wedding.example/api/auth/login")), false);
});

test("rate limits share counters within a namespace and ignore untrusted IP headers", (): void => {
  const namespace: string = generateId();
  const policy: RateLimitPolicy = { namespace, limit: 2, windowMs: 60_000 };
  assert.equal(checkRateLimit(policy, "client").allowed, true);
  assert.equal(checkRateLimit(policy, "client").allowed, true);
  assert.equal(checkRateLimit(policy, "client").allowed, false);
  assert.equal(checkRateLimit(policy, "different-client").allowed, true);
  delete process.env.TRUSTED_CLIENT_IP_HEADER;
  assert.equal(
    requestIdentity(
      new Request("https://wedding.example", { headers: { "x-forwarded-for": "attacker" } }),
    ),
    "shared",
  );
});

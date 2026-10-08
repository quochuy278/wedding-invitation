import "dotenv/config";

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import type { Address, Invitation, Session, User } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  type AuthResult,
  getSession,
  login,
  logout,
  refresh,
} from "@/server/features/auth/auth.service";
import { hashPassword } from "@/server/features/auth/password";
import { type TokenClaims, TokenPurpose, verifyToken } from "@/server/features/auth/token";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { invitationCodeGenerator } from "@/server/features/invitations/invitation-code";
import { type AuthSessionDto, UserLevel } from "@/shared/contracts/auth";
import type { InvitationDto } from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";
import { generateId } from "@/shared/utils/id";

type Fixtures = {
  admin: User;
  guest: User;
  noPasswordAdmin: User;
  address: Address;
  invitation: Invitation;
  password: string;
};
const userIds: string[] = [];
const addressIds: string[] = [];
let fixtures: Fixtures;

before(async (): Promise<void> => {
  const runId: string = generateId();
  const password: string = randomBytes(32).toString("base64url");
  const passwordHash: string = await hashPassword(password);
  const admin: User = await prisma.user.create({
    data: {
      full_name: "Auth test admin",
      email: `auth-admin-${runId}@example.invalid`,
      level: UserLevel.Admin,
      password_hash: passwordHash,
    },
  });
  userIds.push(admin.id);
  const guest: User = await prisma.user.create({
    data: { full_name: "Auth test guest", email: `auth-guest-${runId}@example.invalid` },
  });
  userIds.push(guest.id);
  const noPasswordAdmin: User = await prisma.user.create({
    data: {
      full_name: "Auth test no password",
      email: `auth-empty-${runId}@example.invalid`,
      level: UserLevel.Admin,
    },
  });
  userIds.push(noPasswordAdmin.id);
  const eventAt: Date = now().add(1, "day").toDate();
  const address: Address = await prisma.address.create({
    data: {
      name: "Auth test venue",
      address_text: "Temporary fixture",
      event_at: eventAt,
    },
  });
  addressIds.push(address.id);
  const invitationExpiresAt: Date = now().add(1, "day").toDate();
  const invitationCode: string = invitationCodeGenerator.generate();
  const invitation: Invitation = await prisma.invitation.create({
    data: {
      code: invitationCode,
      user_id: guest.id,
      address_id: address.id,
      status: "pending",
      expires_at: invitationExpiresAt,
    },
  });
  fixtures = { admin, guest, noPasswordAdmin, address, invitation, password };
});

after(async (): Promise<void> => {
  try {
    await prisma.wish.deleteMany({ where: { invitation: { user_id: { in: userIds } } } });
    await prisma.invitation.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.session.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.address.deleteMany({ where: { id: { in: addressIds } } });
  } finally {
    await prisma.$disconnect();
  }
});

async function loginAdmin(): Promise<AuthResult> {
  const result: AuthResult | null = await login({
    email: fixtures.admin.email,
    password: fixtures.password,
  });
  assert.ok(result);
  return result;
}

test("guest defaults remain level 1 and no password or phone is required", async (): Promise<void> => {
  assert.equal(fixtures.guest.level, UserLevel.Guest);
  assert.equal(fixtures.guest.password_hash, null);
  assert.equal(fixtures.guest.phone_number, null);
  assert.equal(await login({ email: fixtures.guest.email, password: fixtures.password }), null);
  assert.equal(
    await login({ email: fixtures.noPasswordAdmin.email, password: fixtures.password }),
    null,
  );
  assert.equal(await login({ email: fixtures.admin.email, password: "incorrect-password" }), null);
});

test("login stores only a refresh hash and returns a limited user DTO", async (): Promise<void> => {
  const result: AuthResult = await loginAdmin();
  const claims: TokenClaims | null = await verifyToken(
    result.tokens.accessToken,
    TokenPurpose.Access,
  );
  assert.ok(claims);
  const record: Session | null = await prisma.session.findUnique({
    where: { id: claims.sessionId },
  });
  assert.ok(record);
  assert.match(record.refresh_token_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(record.refresh_token_hash, result.tokens.refreshToken);
  assert.equal((await getSession(result.tokens.accessToken))?.user.id, fixtures.admin.id);
  assert.equal("password_hash" in result.session.user, false);
  assert.equal("phone_number" in result.session.user, false);
  await logout(result.tokens.accessToken, result.tokens.refreshToken);
});

test("rotation invalidates old refresh tokens and reuse revokes the session", async (): Promise<void> => {
  const first: AuthResult = await loginAdmin();
  const second: AuthResult | null = await refresh(first.tokens.refreshToken);
  assert.ok(second);
  assert.notEqual(first.tokens.refreshToken, second.tokens.refreshToken);
  assert.equal(second.session.expiresAt, first.session.expiresAt);
  assert.ok(await getSession(second.tokens.accessToken));
  assert.equal(await refresh(first.tokens.refreshToken), null);
  assert.equal(await getSession(second.tokens.accessToken), null);
  assert.equal(await refresh(second.tokens.refreshToken), null);
});

test("forged tokens cannot revoke a valid session, logout can", async (): Promise<void> => {
  const result: AuthResult = await loginAdmin();
  assert.equal(await refresh(`${result.tokens.refreshToken}forged`), null);
  assert.ok(await getSession(result.tokens.accessToken));
  await logout(undefined, result.tokens.refreshToken);
  assert.equal(await getSession(result.tokens.accessToken), null);
  assert.equal(await refresh(result.tokens.refreshToken), null);
});

test("concurrent rotation consumes a refresh token at most once", async (): Promise<void> => {
  const original: AuthResult = await loginAdmin();
  const results: (AuthResult | null)[] = await Promise.all([
    refresh(original.tokens.refreshToken),
    refresh(original.tokens.refreshToken),
  ]);
  assert.equal(results.filter((result: AuthResult | null): boolean => result !== null).length, 1);
  assert.equal(await getSession(original.tokens.accessToken), null);
  for (const result of results) {
    if (result) assert.equal(await getSession(result.tokens.accessToken), null);
  }
});

test("current user level, soft deletion and database session expiry are enforced", async (): Promise<void> => {
  const result: AuthResult = await loginAdmin();
  await prisma.user.update({ where: { id: fixtures.admin.id }, data: { level: UserLevel.Guest } });
  assert.equal(await getSession(result.tokens.accessToken), null);
  assert.equal(await refresh(result.tokens.refreshToken), null);
  const adminDeletedAt: Date = now().toDate();
  await prisma.user.update({
    where: { id: fixtures.admin.id },
    data: { level: UserLevel.Admin, deleted_at: adminDeletedAt },
  });
  assert.equal(await getSession(result.tokens.accessToken), null);
  assert.equal(await login({ email: fixtures.admin.email, password: fixtures.password }), null);
  await prisma.user.update({ where: { id: fixtures.admin.id }, data: { deleted_at: null } });
  const claims: TokenClaims | null = await verifyToken(
    result.tokens.accessToken,
    TokenPurpose.Access,
  );
  assert.ok(claims);
  const expiredAt: Date = now().subtract(1, "second").toDate();
  await prisma.session.update({
    where: { id: claims.sessionId },
    data: { expires_at: expiredAt },
  });
  assert.equal(await getSession(result.tokens.accessToken), null);
  assert.equal(await refresh(result.tokens.refreshToken), null);
});

test("public invitations hide auth fields and exclude expired/deleted records", async (): Promise<void> => {
  const invitation: InvitationDto | null = await invitationService.getByCode(
    fixtures.invitation.code,
  );
  assert.ok(invitation);
  assert.match(fixtures.invitation.code, /^[A-Z0-9]{6}$/);
  assert.deepEqual(Object.keys(invitation.guest), ["fullName"]);
  const expiredAt: Date = now().subtract(1, "second").toDate();
  await prisma.invitation.update({
    where: { id: fixtures.invitation.id },
    data: { expires_at: expiredAt },
  });
  assert.equal(await invitationService.getByCode(fixtures.invitation.code), null);
  assert.equal((await invitationService.validateCode(fixtures.invitation.code)).isValid, false);
  const restoredExpiresAt: Date = now().add(1, "day").toDate();
  const deletedAt: Date = now().toDate();
  await prisma.invitation.update({
    where: { id: fixtures.invitation.id },
    data: { expires_at: restoredExpiresAt, deleted_at: deletedAt },
  });
  assert.equal(await invitationService.getByCode(fixtures.invitation.code), null);
  await prisma.invitation.update({
    where: { id: fixtures.invitation.id },
    data: { deleted_at: null },
  });
  const guestDeletedAt: Date = now().toDate();
  await prisma.user.update({
    where: { id: fixtures.guest.id },
    data: { deleted_at: guestDeletedAt },
  });
  assert.equal(await invitationService.getByCode(fixtures.invitation.code), null);
  await prisma.user.update({ where: { id: fixtures.guest.id }, data: { deleted_at: null } });
});

test("HTTP login, cookies, refresh, logout and public access", {
  skip: !process.env.AUTH_TEST_BASE_URL,
}, async (): Promise<void> => {
  const baseUrl: string = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
  const origin: string = process.env.AUTH_ORIGIN ?? new URL(baseUrl).origin;
  const jar: Map<string, string> = new Map<string, string>();

  async function request(path: string, method: string = "GET", body?: unknown): Promise<Response> {
    const headers: Headers = new Headers({ Origin: origin, "Content-Type": "application/json" });
    const cookie: string = Array.from(jar.entries())
      .map(([name, value]: [string, string]): string => `${name}=${value}`)
      .join("; ");
    if (cookie) headers.set("Cookie", cookie);
    const init: RequestInit = {
      method,
      headers,
      redirect: "manual",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };
    const response: Response = await fetch(`${baseUrl}${path}`, init);
    for (const value of response.headers.getSetCookie()) {
      const pair: string = value.split(";")[0];
      const separator: number = pair.indexOf("=");
      const name: string = pair.slice(0, separator);
      const token: string = pair.slice(separator + 1);
      if (token) jar.set(name, token);
      else jar.delete(name);
    }
    return response;
  }

  assert.equal((await request("/api/auth/session")).status, 401);
  assert.equal((await request("/api/rsvps")).status, 401);
  const dashboard: Response = await request("/dashboard");
  assert.equal(dashboard.status, 307);
  assert.equal(dashboard.headers.get("location"), "/login");
  assert.equal((await request(`/api/invitations/${fixtures.invitation.code}`)).status, 200);
  const csrf: Response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    body: JSON.stringify({ email: fixtures.admin.email, password: fixtures.password }),
  });
  assert.equal(csrf.status, 403);
  assert.equal(
    (
      await request("/api/auth/login", "POST", {
        email: fixtures.guest.email,
        password: fixtures.password,
      })
    ).status,
    401,
  );
  const signedIn: Response = await request("/api/auth/login", "POST", {
    email: fixtures.admin.email,
    password: fixtures.password,
  });
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.headers.get("cache-control"), "no-store");
  assert.equal(signedIn.headers.getSetCookie().length, 2);
  for (const cookie of signedIn.headers.getSetCookie()) {
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
  }
  const body: AuthSessionDto = ((await signedIn.json()) as ApiSessionBody).data;
  assert.equal(body.user.level, UserLevel.Admin);
  assert.equal("password_hash" in body.user, false);
  assert.equal((await request("/api/rsvps")).status, 200);
  for (const name of jar.keys()) {
    if (name.endsWith("access_token")) jar.delete(name);
  }
  assert.equal((await request("/api/auth/session")).status, 401);
  assert.equal((await request("/api/auth/refresh", "POST", {})).status, 200);
  assert.equal((await request("/api/auth/session")).status, 200);
  assert.equal((await request("/api/auth/logout", "POST", {})).status, 200);
  assert.equal(jar.size, 0);
  assert.equal((await request("/api/auth/session")).status, 401);
  assert.equal((await request("/api/auth/refresh", "POST", {})).status, 401);
});

type ApiSessionBody = { data: AuthSessionDto };

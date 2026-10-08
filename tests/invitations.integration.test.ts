import "dotenv/config";

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import type { Invitation, User } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/features/auth/password";
import { issueTokens } from "@/server/features/auth/token";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { UserLevel } from "@/shared/contracts/auth";
import type { InvitationListDto } from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";
import { generateId } from "@/shared/utils/id";

const userIds: string[] = [];
const addressIds: string[] = [];
const invitations: Invitation[] = [];
const password: string = randomBytes(32).toString("base64url");
let admin: User;
let guest: User;
let baseline: InvitationListDto;

before(async () => {
  baseline = await invitationService.list({ page: Number.MAX_SAFE_INTEGER, pageSize: 100 });
  const runId: string = generateId();
  const address = await prisma.address.create({
    data: {
      name: "Invitation list test",
      address_text: "Temporary fixture",
      event_at: now().add(1, "day").toDate(),
    },
  });
  addressIds.push(address.id);
  const passwordHash: string = await hashPassword(password);
  admin = await prisma.user.create({
    data: {
      full_name: "Invitation list admin",
      email: `list-admin-${runId}@example.invalid`,
      level: UserLevel.Admin,
      password_hash: passwordHash,
    },
  });
  userIds.push(admin.id);

  for (let index = 0; index < 8; index += 1) {
    const user: User = await prisma.user.create({
      data: {
        full_name: `List guest ${index}`,
        email: `list-${runId}-${index}@example.invalid`,
        deleted_at: index === 7 ? now().toDate() : null,
      },
    });
    userIds.push(user.id);
    if (index === 0) guest = user;
    // Future creation dates keep test records first without touching existing invitations.
    const createdAt: Date = now()
      .add(10, "year")
      .startOf("day")
      .add(index < 2 ? 0 : index, "second")
      .toDate();
    invitations.push(
      await prisma.invitation.create({
        data: {
          user_id: user.id,
          address_id: address.id,
          code: generateId(),
          status:
            index < 2 || index >= 6
              ? "accepted"
              : index === 2
                ? "declined"
                : index === 3
                  ? "custom-status"
                  : "pending",
          guest_count: index < 2 ? index + 2 : index >= 6 ? 20 : 1,
          created_at: createdAt,
          expires_at:
            index === 0 ? now().subtract(1, "day").toDate() : now().add(1, "day").toDate(),
          deleted_at: index === 6 ? now().toDate() : null,
        },
      }),
    );
  }
});

after(async () => {
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

test("empty invitation lists have a valid first page and zero summary", (context) => {
  if (baseline.pagination.totalItems !== 0) {
    context.skip("Requires an empty test database; existing invitations are preserved.");
    return;
  }
  assert.deepEqual(baseline, {
    items: [],
    pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 1 },
    summary: {
      totalInvitations: 0,
      acceptedInvitations: 0,
      acceptedGuests: 0,
      pendingInvitations: 0,
    },
  });
});

test("list pagination uses stable order, global summary and excludes deleted records", async () => {
  const first = await invitationService.list({ page: 1, pageSize: 5 });
  const second = await invitationService.list({ page: 2, pageSize: 5 });
  const sorted = invitations
    .slice(0, 6)
    .sort(
      (left, right) =>
        right.created_at.getTime() - left.created_at.getTime() || right.id.localeCompare(left.id),
    );
  assert.deepEqual(
    first.items.map((item) => item.id),
    sorted.slice(0, 5).map((item) => item.id),
  );
  assert.equal(second.items[0].id, sorted[5].id);
  assert.equal(first.pagination.totalItems, baseline.pagination.totalItems + 6);
  assert.equal(first.pagination.totalPages, Math.ceil((baseline.pagination.totalItems + 6) / 5));
  const expectedSummary = {
    totalInvitations: baseline.summary.totalInvitations + 6,
    acceptedInvitations: baseline.summary.acceptedInvitations + 2,
    acceptedGuests: baseline.summary.acceptedGuests + 5,
    pendingInvitations: baseline.summary.pendingInvitations + 2,
  };
  assert.deepEqual(first.summary, expectedSummary);
  assert.deepEqual(second.summary, expectedSummary);
  const expired = [...first.items, ...second.items].find((item) => item.id === invitations[0].id);
  assert.ok(expired, "Expired invitations remain visible to admins.");
  assert.equal(await invitationService.getByCode(invitations[0].code), null);
  assert.deepEqual(
    Object.keys(expired).sort(),
    ["id", "code", "guestName", "phoneNumber", "status", "guestCount", "updatedAt"].sort(),
  );
  assert.equal(expired.phoneNumber, null);
  assert.equal(expired.updatedAt, invitations[0].updated_at.toISOString());
  assert.equal(first.items.find((item) => item.id === invitations[3].id)?.status, "custom-status");
});

test("pages beyond the end clamp before computing the database offset", async () => {
  const beyond = await invitationService.list({ page: Number.MAX_SAFE_INTEGER, pageSize: 5 });
  const last = await invitationService.list({ page: beyond.pagination.totalPages, pageSize: 5 });
  assert.deepEqual(beyond, last);
  assert.ok(last.items.length >= 1 && last.items.length <= 5);
});

test("HTTP list enforces admin access, validates query and returns private metadata", {
  skip: !process.env.AUTH_TEST_BASE_URL,
}, async () => {
  const baseUrl: string = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
  const endpoint: string = `${baseUrl}/api/invitations`;
  assert.equal((await fetch(endpoint)).status, 401);
  assert.equal(
    (await fetch(`${endpoint}?page=0`)).status,
    401,
    "Auth is checked before query validation.",
  );
  const signedIn = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      Origin: process.env.AUTH_ORIGIN ?? new URL(baseUrl).origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: admin.email, password }),
  });
  assert.equal(signedIn.status, 200);
  const cookies: string[] = signedIn.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  const headers = { Cookie: cookies.join("; ") };
  const response = await fetch(`${endpoint}?page=1&pageSize=5`, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(response.headers.get("vary")?.split(/,\s*/).includes("Cookie"));
  const result: { data: InvitationListDto } = await response.json();
  assert.deepEqual(result.data, await invitationService.list({ page: 1, pageSize: 5 }));
  const invalid = await fetch(`${endpoint}?page=0&pageSize=101`, { headers });
  assert.equal(invalid.status, 400);
  const invalidBody = await invalid.json();
  assert.deepEqual(
    invalidBody.error.details.map((detail: { field: string }) => detail.field),
    ["page", "pageSize"],
  );
  const clamped = await fetch(`${endpoint}?page=${Number.MAX_SAFE_INTEGER}`, { headers });
  assert.equal(clamped.status, 200);
  const clampedBody: { data: InvitationListDto } = await clamped.json();
  assert.equal(clampedBody.data.pagination.page, clampedBody.data.pagination.totalPages);

  const guestExpiresAt = now().add(1, "hour").toDate();
  const guestSession = await prisma.session.create({
    data: {
      user_id: guest.id,
      refresh_token_hash: "temporary-test-hash",
      expires_at: guestExpiresAt,
    },
  });
  const guestTokens = await issueTokens(guestSession);
  const accessCookieName = cookies
    .find((cookie) => cookie.split("=")[0].endsWith("access_token"))
    ?.split("=")[0];
  assert.ok(accessCookieName);
  assert.equal(
    (
      await fetch(endpoint, {
        headers: { Cookie: `${accessCookieName}=${guestTokens.accessToken}` },
      })
    ).status,
    401,
  );
  await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: {
      ...headers,
      Origin: process.env.AUTH_ORIGIN ?? new URL(baseUrl).origin,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(
    (await fetch(endpoint, { headers })).status,
    401,
    "Revoked admin sessions cannot list invitations.",
  );
});

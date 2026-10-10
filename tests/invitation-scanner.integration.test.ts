import "dotenv/config";

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, mock, test } from "node:test";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/features/auth/password";
import { issueTokens } from "@/server/features/auth/token";
import { brevoService } from "@/server/features/invitations/brevo.service";
import { invitationRepository } from "@/server/features/invitations/invitation.repository";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { issueInvitationTicketToken } from "@/server/features/invitations/invitation-ticket.token";
import { rsvpService } from "@/server/features/rsvps/rsvp.service";
import { UserLevel } from "@/shared/contracts/auth";
import { guestApiHeaders } from "@/shared/contracts/guest-api";
import type { CreatedInvitationDto } from "@/shared/contracts/invitation";
import type { InvitationTicketVerificationDto } from "@/shared/contracts/invitation-ticket";
import { generateId } from "@/shared/utils/id";

const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
const emailSender = mock.method(brevoService, "sendInvitation", async () => "<test-message>");
const origin = process.env.AUTH_ORIGIN ?? new URL(baseUrl).origin;
const endpoint = `${baseUrl}/api/invitation-tickets/verify`;
const httpOptions = { skip: !process.env.AUTH_TEST_BASE_URL };
const userIds: string[] = [];
const invitations: CreatedInvitationDto[] = [];
let addressId: string;
let adminId: string;
let headers: Record<string, string>;
let accessCookieName: string;

before(async () => {
  if (!process.env.AUTH_TEST_BASE_URL) return;
  const runId = generateId();
  const password = randomBytes(32).toString("base64url");
  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.create({
    data: {
      full_name: "Scanner test admin",
      email: `scanner-admin-${runId}@example.invalid`,
      level: UserLevel.Admin,
      password_hash: passwordHash,
    },
  });
  adminId = admin.id;
  userIds.push(admin.id);
  const address = await prisma.address.create({
    data: {
      name: "Scanner test venue",
      address_text: "12 Đường Mẫu, TP. Hồ Chí Minh",
      floor: "3A",
      entrance: "Cổng B",
      event_at: new Date("2027-06-12T11:00:00Z"),
      event_time_zone: "Asia/Ho_Chi_Minh",
    },
  });
  addressId = address.id;
  for (const label of [
    "active",
    "expired",
    "deleted",
    "guest-deleted",
    "pending",
    "declined",
    "deadline-changed",
  ]) {
    const invitation = await invitationService.create({
      guestName: `Scanner guest ${label}`,
      email: `scanner-${label}-${runId}@example.invalid`,
      phoneNumber: null,
      addressId,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      personalMessage: null,
    });
    invitations.push(invitation);
    const guest = await prisma.user.findUniqueOrThrow({ where: { email: invitation.email } });
    userIds.push(guest.id);
  }
  await rsvpService.create({ code: invitations[0].code, attendance: "yes", guestCount: 3 });
  await rsvpService.create({ code: invitations[5].code, attendance: "no", guestCount: 0 });
  const signedIn = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: admin.email, password }),
  });
  assert.equal(signedIn.status, 200);
  const cookies = signedIn.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  accessCookieName =
    cookies.find((cookie) => cookie.split("=")[0].endsWith("access_token"))?.split("=")[0] ?? "";
  assert.ok(accessCookieName);
  headers = { Cookie: cookies.join("; "), Origin: origin, "Content-Type": "application/json" };
});

after(async () => {
  emailSender.mock.restore();
  try {
    await prisma.wish.deleteMany({ where: { invitation: { user_id: { in: userIds } } } });
    await prisma.invitation.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.session.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (addressId) await prisma.address.delete({ where: { id: addressId } });
  } finally {
    await prisma.$disconnect();
  }
});

async function verify(qrValue: string): Promise<Response> {
  return fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ qrValue }) });
}

test(
  "scanner API and screen require a current admin session before reading input",
  httpOptions,
  async () => {
    const unauthenticated = await fetch(endpoint, {
      method: "POST",
      headers: { Origin: origin },
      body: "broken",
    });
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.headers.get("cache-control"), "no-store");
    const protectedPage = await fetch(`${baseUrl}/dashboard/scan`, { redirect: "manual" });
    assert.equal(protectedPage.status, 307);
    assert.equal(protectedPage.headers.get("location"), "/login");
    const guestSession = await prisma.session.create({
      data: {
        user_id: userIds[1],
        refresh_token_hash: "scanner-fixture",
        expires_at: new Date(Date.now() + 3600000),
      },
    });
    const guestTokens = await issueTokens(guestSession);
    const guestResponse = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers, Cookie: `${accessCookieName}=${guestTokens.accessToken}` },
      body: JSON.stringify({ qrValue: issueInvitationTicketToken(invitations[0]) }),
    });
    assert.equal(guestResponse.status, 401);
  },
);

test(
  "scanner API validates origin and JSON, with private response headers",
  httpOptions,
  async () => {
    for (const invalidOrigin of ["https://untrusted.example", "null", ""]) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, Origin: invalidOrigin },
        body: "{}",
      });
      assert.equal(response.status, 403);
    }
    for (const body of [
      "broken",
      "x".repeat(1025),
      "[]",
      "{}",
      JSON.stringify({ qrValue: "" }),
      JSON.stringify({ qrValue: "x".repeat(257) }),
    ]) {
      const response = await fetch(endpoint, { method: "POST", headers, body });
      assert.equal(response.status, 400);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.ok(response.headers.get("vary")?.split(/,\s*/).includes("Cookie"));
    }
  },
);

test(
  "confirmed QR checks in once under simultaneous scans and preserves guest counts",
  httpOptions,
  async () => {
    const invitation = invitations[0];
    const token = issueInvitationTicketToken(invitation);
    const beforeRecord = await prisma.invitation.findUniqueOrThrow({
      where: { id: invitation.id },
    });
    const baseline = await invitationService.list({ page: 1, pageSize: 100 });
    const results: string[] = [];
    for (const response of await Promise.all([verify(token), verify(token), verify(token)])) {
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
      assert.ok(response.headers.get("vary")?.split(/,\s*/).includes("Cookie"));
      const body: { data: InvitationTicketVerificationDto } = await response.json();
      assert.ok(body.data.isValid);
      results.push(body.data.checkIn);
      assert.equal(body.data.invitation.status, "attended");
      assert.equal(body.data.invitation.guestCount, 3);
      assert.equal(body.data.invitation.code, invitation.code);
      assert.equal(body.data.invitation.guestName, invitation.guestName);
      assert.equal(body.data.invitation.address.floor, "3A");
      assert.equal(body.data.invitation.address.entrance, "Cổng B");
      assert.equal(body.data.invitation.expiresAt, invitation.expiresAt);
      assert.deepEqual(
        Object.keys(body.data.invitation).sort(),
        ["code", "guestName", "status", "guestCount", "expiresAt", "address"].sort(),
      );
      assert.ok(!JSON.stringify(body).includes(invitation.email));
    }
    assert.deepEqual(results.sort(), ["alreadyAttended", "alreadyAttended", "recorded"]);
    const checkedIn = await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } });
    assert.equal(checkedIn.status, "attended");
    assert.equal(checkedIn.guest_count, beforeRecord.guest_count);
    assert.ok(checkedIn.updated_at >= beforeRecord.updated_at);
    const repeat: { data: InvitationTicketVerificationDto } = await (await verify(token)).json();
    assert.ok(repeat.data.isValid);
    assert.equal(repeat.data.checkIn, "alreadyAttended");
    assert.deepEqual(
      await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } }),
      checkedIn,
    );
    assert.deepEqual(
      (await invitationService.list({ page: 1, pageSize: 100 })).summary,
      baseline.summary,
    );
    assert.equal(
      (await rsvpService.list()).find((rsvp) => rsvp.code === invitation.code)?.attendance,
      "yes",
    );
    for (const attendance of ["yes", "no"] as const) {
      const rsvp = await fetch(`${baseUrl}/api/rsvps`, {
        method: "POST",
        headers: { ...guestApiHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          code: invitation.code,
          attendance,
          guestCount: attendance === "yes" ? 9 : 0,
        }),
      });
      assert.equal(rsvp.status, 409);
    }
    assert.deepEqual(
      await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } }),
      checkedIn,
    );
    const publicInvitation = await invitationService.getByCode(invitation.code);
    assert.equal(publicInvitation?.status, "attended");
    const page = await fetch(`${baseUrl}/dashboard/scan`, { headers });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes("Bật camera"));
    assert.ok(!html.includes('type="file"'));
    assert.ok(!html.includes("Chọn ảnh QR"));
  },
);

test("pending and declined tickets are authentic but cannot check in", httpOptions, async () => {
  for (const invitation of invitations.slice(4, 6)) {
    const beforeRecord = await prisma.invitation.findUniqueOrThrow({
      where: { id: invitation.id },
    });
    const response = await verify(issueInvitationTicketToken(invitation));
    assert.equal(response.status, 200);
    const body: { data: InvitationTicketVerificationDto } = await response.json();
    assert.ok(body.data.isValid);
    assert.equal(body.data.checkIn, "notConfirmed");
    assert.equal(body.data.invitation.status, beforeRecord.status);
    assert.deepEqual(
      await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } }),
      beforeRecord,
    );
  }
});

test(
  "check-in rechecks signed identity and expiry in the conditional write",
  httpOptions,
  async () => {
    const invitation = invitations[6];
    await rsvpService.create({ code: invitation.code, attendance: "yes", guestCount: 2 });
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { expires_at: new Date(Date.parse(invitation.expiresAt) + 1000) },
    });
    const beforeRecord = await prisma.invitation.findUniqueOrThrow({
      where: { id: invitation.id },
    });
    assert.equal(await invitationRepository.checkIn(invitation), null);
    assert.equal(
      await invitationRepository.checkIn({
        ...invitation,
        id: invitations[0].id,
        expiresAt: beforeRecord.expires_at.toISOString(),
      }),
      null,
    );
    assert.deepEqual(
      await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } }),
      beforeRecord,
    );
  },
);

test(
  "forged, unrelated, expired and soft-deleted QR data never discloses a guest",
  httpOptions,
  async () => {
    const active = invitations[0];
    const token = issueInvitationTicketToken(active);
    const forged = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    const invalidTokens = [forged, active.code, `${token}\n`, "https://fake.example/ticket/AB12CD"];
    await prisma.invitation.update({
      where: { id: invitations[1].id },
      data: { expires_at: new Date(Date.now() - 1000) },
    });
    await prisma.invitation.update({
      where: { id: invitations[2].id },
      data: { deleted_at: new Date() },
    });
    await prisma.user.update({
      where: { email: invitations[3].email },
      data: { deleted_at: new Date() },
    });
    invalidTokens.push(
      ...[...invitations.slice(1, 4), invitations[6]].map(issueInvitationTicketToken),
    );
    const beforeRecords = await prisma.invitation.findMany({
      where: { id: { in: invitations.map((invitation) => invitation.id) } },
      orderBy: { id: "asc" },
    });
    for (const value of invalidTokens) {
      const response = await verify(value);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { data: { isValid: false, invitation: null } });
    }
    assert.deepEqual(
      await prisma.invitation.findMany({
        where: { id: { in: invitations.map((invitation) => invitation.id) } },
        orderBy: { id: "asc" },
      }),
      beforeRecords,
    );
  },
);

test("revoking admin access immediately blocks ticket verification", httpOptions, async () => {
  await prisma.user.update({ where: { id: adminId }, data: { level: UserLevel.Guest } });
  assert.equal((await verify(issueInvitationTicketToken(invitations[0]))).status, 401);
});

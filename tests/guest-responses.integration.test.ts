import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { Invitation } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { invitationCodeGenerator } from "@/server/features/invitations/invitation-code";
import { rsvpService } from "@/server/features/rsvps/rsvp.service";
import { wishService } from "@/server/features/wishes/wish.service";
import { guestApiHeaders } from "@/shared/contracts/guest-api";
import type { InvitationListDto } from "@/shared/contracts/invitation";

const invitations: Invitation[] = [];
const userIds: string[] = [];
let addressId: string;
let baseline: InvitationListDto;

before(async () => {
  baseline = await invitationService.list({ page: 1, pageSize: 100 });
  const runId = randomUUID();
  const address = await prisma.address.create({
    data: {
      name: "Response integration venue",
      address_text: "Temporary fixture",
      event_at: new Date(Date.now() + 86_400_000),
    },
  });
  addressId = address.id;
  for (let index = 0; index < 5; index++) {
    const user = await prisma.user.create({
      data: {
        full_name: `Response test guest ${index}`,
        email: `response-${runId}-${index}@example.invalid`,
        deleted_at: index === 4 ? new Date() : null,
      },
    });
    userIds.push(user.id);
    invitations.push(
      await prisma.invitation.create({
        data: {
          code: invitationCodeGenerator.generate(),
          user_id: user.id,
          address_id: addressId,
          status: "pending",
          guest_count: 0,
          expires_at: new Date(Date.now() + (index === 2 ? -86_400_000 : 86_400_000)),
          deleted_at: index === 3 ? new Date() : null,
        },
      }),
    );
  }
});

after(async () => {
  try {
    await prisma.wish.deleteMany({
      where: { invitation_id: { in: invitations.map((item) => item.id) } },
    });
    await prisma.invitation.deleteMany({
      where: { id: { in: invitations.map((item) => item.id) } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (addressId) await prisma.address.delete({ where: { id: addressId } });
  } finally {
    await prisma.$disconnect();
  }
});

test("RSVP persists, replaces the previous count and updates the global admin summary", async () => {
  const code = invitations[0].code;
  for (const count of [2, 2, 11]) {
    const response = await rsvpService.create({ code, attendance: "yes", guestCount: count });
    assert.ok(response);
    assert.equal(response.id, invitations[0].id);
    assert.equal(response.guestCount, count);
    const read = await invitationService.getByCode(code);
    assert.equal(read?.status, "accepted");
    assert.equal(read?.guestCount, count);
    const list = await invitationService.list({ page: 1, pageSize: 100 });
    assert.equal(list.summary.acceptedInvitations, baseline.summary.acceptedInvitations + 1);
    assert.equal(list.summary.acceptedGuests, baseline.summary.acceptedGuests + count);
  }
  await rsvpService.create({ code, attendance: "no", guestCount: 0 });
  const read = await invitationService.getByCode(code);
  assert.equal(read?.status, "declined");
  assert.equal(read?.guestCount, 0);
  const list = await invitationService.list({ page: 1, pageSize: 100 });
  assert.equal(list.summary.acceptedInvitations, baseline.summary.acceptedInvitations);
  assert.equal(list.summary.acceptedGuests, baseline.summary.acceptedGuests);
  assert.equal(list.summary.pendingInvitations, baseline.summary.pendingInvitations + 2);
  assert.equal((await rsvpService.list()).find((item) => item.code === code)?.attendance, "no");
});

test("wishes persist independently of attendance, retries deduplicate, and codes stay isolated", async () => {
  const code = invitations[0].code;
  const content = "Chúc hai bạn thật nhiều hạnh phúc!\nMãi bên nhau nhé ❤️";
  const responses = await Promise.all(
    Array.from({ length: 3 }, () => wishService.create({ code, content })),
  );
  const wish = responses[0];
  assert.ok(wish);
  for (const response of responses) assert.deepEqual(response, wish);
  const second = await wishService.create({ code, content: "Một lời chúc khác." });
  assert.ok(second);
  assert.notEqual(second.id, wish.id);
  const read = await invitationService.getByCode(code);
  assert.equal(read?.wishes.length, 2);
  assert.equal(read?.status, "declined");
  assert.equal(read?.guestCount, 0);
  assert.deepEqual(await wishService.list(code), read?.wishes);
  assert.deepEqual((await invitationService.getByCode(invitations[1].code))?.wishes, []);
  await rsvpService.create({ code, attendance: "yes", guestCount: 3 });
  assert.equal((await invitationService.getByCode(code))?.wishes.length, 2);
});

test("expired invitations, deleted invitations and deleted guests cannot write either response", async () => {
  for (const invitation of invitations.slice(2)) {
    assert.equal(
      await rsvpService.create({ code: invitation.code, attendance: "yes", guestCount: 2 }),
      null,
    );
    assert.equal(
      await wishService.create({ code: invitation.code, content: "Blocked wish" }),
      null,
    );
    const record = await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } });
    assert.equal(record.status, "pending");
    assert.equal(record.guest_count, 0);
    assert.equal(record.updated_at.toISOString(), invitation.updated_at.toISOString());
    assert.equal(await prisma.wish.count({ where: { invitation_id: invitation.id } }), 0);
  }
});

test("local HTTP response writes persist and guest keys never grant admin wish access", {
  skip: !process.env.AUTH_TEST_BASE_URL,
}, async () => {
  const baseUrl = process.env.AUTH_TEST_BASE_URL;
  const code = invitations[1].code;
  const send = (path: string, body: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { ...guestApiHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const rsvp = await send("/api/rsvps", {
    code,
    attendance: "yes",
    guestCount: 4,
    guestName: "Spoofed",
  });
  assert.equal(rsvp.status, 200);
  assert.equal(rsvp.headers.get("cache-control"), "no-store");
  assert.equal(rsvp.headers.get("set-cookie"), null);
  assert.equal((await rsvp.json()).data.guestName, "Response test guest 1");
  const wish = await send("/api/wishes", { code, content: "HTTP wish ❤️" });
  assert.equal(wish.status, 200);
  const wishData = (await wish.json()).data;
  const read = await fetch(`${baseUrl}/api/invitations/${code}`, { headers: guestApiHeaders });
  assert.equal(read.status, 200);
  const readData = (await read.json()).data;
  assert.equal(readData.status, "accepted");
  assert.equal(readData.guestCount, 4);
  assert.deepEqual(readData.wishes, [wishData]);
  const denied = await fetch(`${baseUrl}/api/wishes?code=${code}`, { headers: guestApiHeaders });
  assert.equal(denied.status, 401);
  for (const path of ["/api/rsvps", "/api/wishes"]) {
    const expired = await send(path, {
      code: invitations[2].code,
      attendance: "yes",
      guestCount: 1,
      content: "Cannot save",
    });
    assert.equal(expired.status, 404);
  }
});

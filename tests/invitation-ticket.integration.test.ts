import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { prisma } from "@/server/db/prisma";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { invitationTicketService } from "@/server/features/invitations/invitation-ticket.service";
import { issueInvitationTicketToken } from "@/server/features/invitations/invitation-ticket.token";
import type { CreatedInvitationDto } from "@/shared/contracts/invitation";
import { generateId } from "@/shared/utils/id";

const runId = generateId();
const emails: string[] = [];
let addressId: string;
let saved: CreatedInvitationDto;

async function createInvitation(label: string): Promise<CreatedInvitationDto> {
  const email = `ticket-${label}-${runId}@example.invalid`;
  emails.push(email);
  return invitationService.create({
    guestName: `Ticket guest ${label}`,
    email,
    phoneNumber: null,
    addressId,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    personalMessage: "Hẹn gặp bạn ở tầng 3A!",
  });
}

before(async () => {
  const venue = await prisma.address.create({
    data: {
      name: "Ticket test venue",
      address_text: "12 Đường Mẫu, TP. Hồ Chí Minh",
      address_line_1: "12 Đường Mẫu",
      address_line_2: "Sảnh Hoa Sen",
      postal_code: "00123",
      city: "TP. Hồ Chí Minh",
      country: "Việt Nam",
      floor: "3A",
      entrance: "Cổng B",
      instructions: "Dùng thang máy bên phải.",
      event_at: new Date("2027-06-12T11:00:00Z"),
      event_time_zone: "Asia/Ho_Chi_Minh",
    },
  });
  addressId = venue.id;
  saved = await createInvitation("active");
});

after(async () => {
  try {
    const guests = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = guests.map((guest) => guest.id);
    await prisma.wish.deleteMany({ where: { invitation: { user_id: { in: ids } } } });
    await prisma.invitation.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    if (addressId) await prisma.address.delete({ where: { id: addressId } });
  } finally {
    await prisma.$disconnect();
  }
});

test("a real invitation produces a stable ticket and verifies against its current database record", async () => {
  const ticket = await invitationTicketService.getByCode(saved.code.toLowerCase());
  assert.ok(ticket);
  assert.equal(ticket.invitation.id, saved.id);
  assert.equal(ticket.invitation.guest.fullName, saved.guestName);
  assert.equal(ticket.invitation.address.floor, "3A");
  const reloaded = await invitationTicketService.getByCode(saved.code);
  assert.equal(reloaded?.qrValue, ticket.qrValue);
  assert.deepEqual(await invitationTicketService.verify(ticket.qrValue), ticket.invitation);
  const forged = `${ticket.qrValue.slice(0, -1)}${ticket.qrValue.endsWith("A") ? "B" : "A"}`;
  assert.equal(await invitationTicketService.verify(forged), null);
  assert.equal(await invitationTicketService.verify(saved.code), null);
  assert.equal(await invitationTicketService.getByCode(saved.id), null);
});

test("ticket verification rejects deadline changes, expired invitations and soft-deleted invitations or guests", async () => {
  for (const state of ["deadline-changed", "expired", "invitation-deleted", "guest-deleted"]) {
    const created = await createInvitation(state);
    const qrValue = issueInvitationTicketToken(created);
    if (state === "guest-deleted")
      await prisma.user.update({
        where: { email: created.email },
        data: { deleted_at: new Date() },
      });
    else {
      const data =
        state === "invitation-deleted"
          ? { deleted_at: new Date() }
          : {
              expires_at: new Date(
                state === "expired" ? Date.now() - 1000 : Date.parse(created.expiresAt) + 1000,
              ),
            };
      await prisma.invitation.update({ where: { id: created.id }, data });
    }
    assert.equal(await invitationTicketService.verify(qrValue), null, state);
    const ticket = await invitationTicketService.getByCode(created.code);
    if (state === "deadline-changed") {
      assert.ok(ticket);
      assert.notEqual(ticket.qrValue, qrValue);
      assert.ok(await invitationTicketService.verify(ticket.qrValue));
    } else assert.equal(ticket, null, state);
  }
});

test("a copied code or reused code on another invitation cannot reuse an old signed ticket", async () => {
  const first = await createInvitation("identity-first");
  const second = await createInvitation("identity-second");
  const token = issueInvitationTicketToken(first);
  assert.equal(await invitationTicketService.verify(token.replace(first.code, second.code)), null);
  await prisma.invitation.delete({ where: { id: first.id } });
  await prisma.invitation.update({
    where: { id: second.id },
    data: { code: first.code, expires_at: new Date(first.expiresAt) },
  });
  assert.equal(await invitationTicketService.verify(token), null);
  const newTicket = await invitationTicketService.getByCode(first.code);
  assert.ok(newTicket);
  assert.ok(await invitationTicketService.verify(newTicket.qrValue));
});

test("HTTP ticket displays the real guest, venue, QR and return links without exposing contact details", {
  skip: !process.env.AUTH_TEST_BASE_URL,
}, async () => {
  const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
  const response = await fetch(`${baseUrl}/ticket/${saved.code}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of [
    saved.guestName,
    saved.code,
    "Ticket test venue",
    "12 Đường Mẫu",
    "Sảnh Hoa Sen",
    "00123",
    "3A",
    "Cổng B",
    "18:00",
    "12/06/2027",
    "Hẹn gặp bạn ở tầng 3A!",
    "data:image/png;base64,",
  ])
    assert.ok(html.includes(text), text);
  assert.ok(html.includes(`href="/invitation/${saved.code}"`));
  assert.ok(html.includes(`download="invitation-${saved.code}-qr.png"`));
  assert.ok(html.includes(`href="/api/invitations/${saved.code}/ticket/qr"`));
  assert.ok(html.includes('content="noindex, nofollow"'));
  assert.ok(!html.includes(saved.email));
  const invitationHtml = await fetch(`${baseUrl}/invitation/${saved.code}`).then((result) =>
    result.text(),
  );
  assert.ok(invitationHtml.includes(`href="/ticket/${saved.code}"`));
  const missing = await fetch(`${baseUrl}/ticket/${saved.id}`);
  assert.equal(missing.status, 404);
});

test("HTTP QR download returns a readable signed PNG and excludes unavailable invitations", {
  skip: !process.env.AUTH_TEST_BASE_URL,
}, async () => {
  const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
  const qrUrl = `${baseUrl}/api/invitations/${saved.code}/ticket/qr`;
  const response = await fetch(qrUrl);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(
    response.headers.get("content-disposition"),
    `attachment; filename="invitation-${saved.code}-qr.png"`,
  );
  const png = PNG.sync.read(Buffer.from(await response.arrayBuffer()));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded);
  const verified = await invitationTicketService.verify(decoded.data);
  assert.equal(verified?.id, saved.id);
  assert.equal(verified?.guest.fullName, saved.guestName);
  assert.equal((await fetch(`${baseUrl}/api/invitations/${saved.id}/ticket/qr`)).status, 404);
  const expired = await createInvitation("expired-download");
  await prisma.invitation.update({
    where: { id: expired.id },
    data: { expires_at: new Date(Date.now() - 1000) },
  });
  assert.equal((await fetch(`${baseUrl}/api/invitations/${expired.code}/ticket/qr`)).status, 404);
});

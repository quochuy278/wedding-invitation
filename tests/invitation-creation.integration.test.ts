import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma } from "@/server/db/prisma";
import { addressService } from "@/server/features/addresses/address.service";
import { issueTokens } from "@/server/features/auth/token";
import { InvitationCreationError } from "@/server/features/invitations/invitation.errors";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { invitationCodeGenerator } from "@/server/features/invitations/invitation-code";
import type { AddressDto, CreateAddressInput } from "@/shared/contracts/address";
import { UserLevel } from "@/shared/contracts/auth";
import type { CreatedInvitationDto, CreateInvitationInput } from "@/shared/contracts/invitation";
import { now } from "@/shared/utils/date";
import { generateId } from "@/shared/utils/id";

const runId = generateId();
const emails: string[] = [];
const userIds: string[] = [];
const addressIds: string[] = [];
let venue: AddressDto;
let legacyId: string;
let adminCookie: string;
let guestCookie: string;
const venueInput: CreateAddressInput = {
  name: `Creation venue ${runId}`,
  addressText: "Địa chỉ giữ nguyên\n12 Nguyễn Du, TP. Hồ Chí Minh",
  addressLine1: "12 Nguyễn Du",
  addressLine2: "Sảnh Hoa Sen",
  locationType: "hotel",
  postalCode: "00123",
  city: "TP. Hồ Chí Minh",
  region: null,
  country: "Việt Nam",
  instructions: "Đi cổng B, dùng thang máy bên phải.",
  floor: "3A",
  entrance: "Cổng B",
  latitude: 10.78,
  longitude: 106.69,
  eventAt: "2027-06-12T18:00:00+07:00",
  eventTimeZone: "Asia/Ho_Chi_Minh",
};

function invitationInput(label: string): CreateInvitationInput {
  const email = `create-${label}-${runId}@example.invalid`;
  emails.push(email);
  return {
    guestName: `Creation guest ${label}`,
    email,
    phoneNumber: null,
    addressId: venue.id,
    expiresAt: now().add(1, "day").toISOString(),
    personalMessage: "Hẹn gặp bạn ở sảnh Hoa Sen!",
  };
}

async function createCookie(level: UserLevel): Promise<string> {
  const user = await prisma.user.create({
    data: {
      full_name: "Creation auth fixture",
      email: `create-auth-${level}-${runId}@example.invalid`,
      level,
    },
  });
  userIds.push(user.id);
  const session = await prisma.session.create({
    data: {
      user_id: user.id,
      refresh_token_hash: "creation-test-only",
      expires_at: now().add(1, "hour").toDate(),
    },
  });
  const tokens = await issueTokens(session);
  const name = process.env.AUTH_TEST_PRODUCTION === "true" ? "__Host-access_token" : "access_token";
  return `${name}=${tokens.accessToken}`;
}

before(async () => {
  venue = await addressService.create(venueInput);
  addressIds.push(venue.id);
  const legacy = await prisma.address.create({
    data: {
      name: `Legacy venue ${runId}`,
      address_text: "Original legacy text",
      event_at: new Date("2027-06-12T11:00:00Z"),
    },
  });
  legacyId = legacy.id;
  addressIds.push(legacy.id);
  adminCookie = await createCookie(UserLevel.Admin);
  guestCookie = await createCookie(UserLevel.Guest);
});

after(async () => {
  try {
    const guests = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = [...userIds, ...guests.map((guest) => guest.id)];
    await prisma.wish.deleteMany({ where: { invitation: { user_id: { in: ids } } } });
    await prisma.invitation.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.session.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.address.deleteMany({ where: { id: { in: addressIds } } });
  } finally {
    await prisma.$disconnect();
  }
});

test("saved venues round trip structured details and legacy addresses remain readable", async () => {
  const addresses = await addressService.list();
  const saved = addresses.items.find((address) => address.id === venue.id);
  assert.deepEqual(saved, { ...venueInput, id: venue.id, eventAt: "2027-06-12T11:00:00.000Z" });
  const legacy = addresses.items.find((address) => address.id === legacyId);
  assert.ok(legacy);
  assert.equal(legacy.addressText, "Original legacy text");
  assert.equal(legacy.city, null);
  assert.equal(legacy.latitude, null);
});

test("creating an invitation persists a unique code and exposes the selected venue and message", async () => {
  const input = invitationInput("roundtrip");
  const created = await invitationService.create(input);
  assert.match(created.code, /^[A-Z0-9]{6}$/);
  assert.notEqual(created.id, created.code);
  assert.equal(created.status, "pending");
  assert.equal(created.email, input.email);
  assert.deepEqual(created.address, venue);
  const publicInvitation = await invitationService.getByCode(created.code);
  assert.ok(publicInvitation);
  assert.equal(publicInvitation.guest.fullName, input.guestName);
  assert.deepEqual(Object.keys(publicInvitation.guest), ["fullName"]);
  assert.equal(publicInvitation.guestCount, 0);
  assert.equal(publicInvitation.personalMessage, input.personalMessage);
  assert.deepEqual(publicInvitation.address, venue);
  assert.equal((await invitationService.validateCode(created.code)).isValid, true);
  assert.deepEqual(await invitationService.getByCode(created.code.toLowerCase()), publicInvitation);
  assert.equal(await invitationService.getByCode(created.id), null);
  assert.equal((await invitationService.validateCode("ABC-12")).isValid, false);
});

test("a code collision retries atomically without creating an extra guest", async (context) => {
  const existing = await invitationService.create(invitationInput("collision-existing"));
  const nextCode = invitationCodeGenerator.generate();
  const generate = context.mock.method(invitationCodeGenerator, "generate", () => nextCode);
  generate.mock.mockImplementationOnce(() => existing.code);
  try {
    const input = invitationInput("collision-retry");
    const created = await invitationService.create(input);
    assert.equal(created.code, nextCode);
    assert.equal(generate.mock.callCount(), 2);
    assert.equal(await prisma.user.count({ where: { email: input.email } }), 1);
    assert.equal(await prisma.invitation.count({ where: { user: { email: input.email } } }), 1);
  } finally {
    generate.mock.restore();
  }
});

test("repeated code collisions stop retrying and roll back the guest", async (context) => {
  const existing = await invitationService.create(invitationInput("collision-exhausted-existing"));
  const generate = context.mock.method(invitationCodeGenerator, "generate", () => existing.code);
  try {
    const input = invitationInput("collision-exhausted");
    await assert.rejects(invitationService.create(input), /unique invitation code/);
    assert.equal(generate.mock.callCount(), 5);
    assert.equal(await prisma.user.count({ where: { email: input.email } }), 0);
  } finally {
    generate.mock.restore();
  }
});

test("invalid venue or past deadline leaves the contact available for a valid creation", async () => {
  const input = invitationInput("rollback");
  await assert.rejects(
    invitationService.create({ ...input, addressId: "missing-venue" }),
    (error: unknown) =>
      error instanceof InvitationCreationError && error.reason === "addressNotFound",
  );
  await assert.rejects(
    invitationService.create({ ...input, expiresAt: "2000-01-01T00:00:00Z" }),
    (error: unknown) =>
      error instanceof InvitationCreationError && error.reason === "expiredDeadline",
  );
  const created = await invitationService.create(input);
  assert.equal(created.email, input.email);
});

test("duplicate contact and concurrent creation produce only one invitation", async () => {
  const input = invitationInput("concurrent");
  const beforeList = await invitationService.list({ page: 1, pageSize: 100 });
  const results = await Promise.allSettled([
    invitationService.create(input),
    invitationService.create(input),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected?.status === "rejected");
  assert.ok(rejected.reason instanceof InvitationCreationError);
  assert.equal(rejected.reason.reason, "contactConflict");
  const afterList = await invitationService.list({ page: 1, pageSize: 100 });
  assert.equal(afterList.pagination.totalItems, beforeList.pagination.totalItems + 1);
});

test("HTTP creation requires an admin session and trusted origin, and validates bodies", {
  skip: !process.env.AUTH_TEST_BASE_URL,
}, async () => {
  const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
  for (const endpoint of ["/api/addresses", "/api/invitations"]) {
    const url = `${baseUrl}${endpoint}`;
    assert.equal((await fetch(url, { method: "POST" })).status, 401);
    assert.equal(
      (await fetch(url, { method: "POST", headers: { Cookie: guestCookie } })).status,
      401,
    );
    assert.equal(
      (await fetch(url, { method: "POST", headers: { Cookie: adminCookie } })).status,
      403,
    );
    const headers = {
      Cookie: adminCookie,
      Origin: new URL(baseUrl).origin,
      "Content-Type": "application/json",
    };
    assert.equal((await fetch(url, { method: "POST", headers, body: "bad-json" })).status, 400);
    assert.equal((await fetch(url, { method: "POST", headers, body: "{}" })).status, 400);
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: { ...headers, Origin: "https://untrusted.example.invalid" },
          body: "{}",
        })
      ).status,
      403,
    );
  }
  const listUrl = `${baseUrl}/api/addresses`;
  assert.equal((await fetch(listUrl)).status, 401);
  assert.equal((await fetch(listUrl, { headers: { Cookie: guestCookie } })).status, 401);
  const response = await fetch(listUrl, { headers: { Cookie: adminCookie } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(response.headers.get("vary")?.includes("Cookie"));
});

test("HTTP creates a venue then invitation and renders its real address and guest", {
  skip: !process.env.AUTH_TEST_BASE_URL,
}, async () => {
  const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
  const headers = {
    Cookie: adminCookie,
    Origin: new URL(baseUrl).origin,
    "Content-Type": "application/json",
  };
  const addressResponse = await fetch(`${baseUrl}/api/addresses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...venueInput,
      name: "HTTP creation venue",
      latitude: null,
      longitude: null,
    }),
  });
  assert.equal(addressResponse.status, 201);
  const { data: address }: { data: AddressDto } = await addressResponse.json();
  addressIds.push(address.id);
  assert.equal(address.latitude, null);
  const input = { ...invitationInput("http"), addressId: address.id };
  const response = await fetch(`${baseUrl}/api/invitations`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(response.headers.get("vary")?.includes("Cookie"));
  const { data: created }: { data: CreatedInvitationDto } = await response.json();
  assert.match(created.code, /^[A-Z0-9]{6}$/);
  assert.equal(created.guestName, input.guestName);
  assert.deepEqual(created.address, address);
  const duplicate = await fetch(`${baseUrl}/api/invitations`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  assert.equal(duplicate.status, 409);
  const html = await fetch(`${baseUrl}/invitation/${created.code}`).then((result) => result.text());
  for (const text of [
    input.guestName,
    address.name,
    "Sảnh Hoa Sen",
    "3A",
    "Cổng B",
    input.personalMessage ?? "",
  ])
    assert.ok(html.includes(text), text);
  assert.ok(!html.includes(input.email), "Public invitation does not expose the guest email.");
  const publicUrl = `${baseUrl}/api/invitations`;
  const lookup = await fetch(`${publicUrl}/${created.code}`);
  assert.equal(lookup.status, 200);
  const { data: publicInvitation } = await lookup.json();
  assert.equal(publicInvitation.code, created.code);
  assert.equal(publicInvitation.guest.fullName, input.guestName);
  assert.equal((await fetch(`${publicUrl}/${created.id}`)).status, 404);
  for (const code of [created.code, created.code.toLowerCase()]) {
    const validation = await fetch(`${publicUrl}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    assert.equal(validation.status, 200);
    assert.deepEqual(await validation.json(), { data: { isValid: true } });
  }
  for (const code of ["ABC12", "ABC1234", "ABC-12", "ß1234"]) {
    const validation = await fetch(`${publicUrl}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    assert.equal(validation.status, 400, code);
    const body = await validation.json();
    assert.equal(body.error.details[0].field, "code");
  }
});

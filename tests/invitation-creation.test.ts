import assert from "node:assert/strict";
import test from "node:test";
import { formZonedTimestamp } from "@/components/admin/form-values";
import { parseCreateAddressInput } from "@/server/features/addresses/address.schema";
import { parseCreateInvitationInput } from "@/server/features/invitations/invitation.schema";
import type { CreateAddressInput } from "@/shared/contracts/address";

const address: CreateAddressInput = {
  name: "Nhà hàng Sen",
  addressText: "12 Nguyễn Du\nTP. Hồ Chí Minh",
  addressLine1: "12 Nguyễn Du",
  addressLine2: null,
  locationType: "restaurant",
  postalCode: "00123",
  city: "TP. Hồ Chí Minh",
  region: null,
  country: "Việt Nam",
  instructions: null,
  floor: "B1",
  entrance: "Cổng B",
  latitude: null,
  longitude: null,
  eventAt: "2027-06-12T18:00:00+07:00",
  eventTimeZone: "Asia/Ho_Chi_Minh",
};

test("venue validation preserves full text, postal zeroes and nonnumeric floor names", () => {
  assert.deepEqual(parseCreateAddressInput(address), { success: true, data: address });
  const atOrigin = { ...address, latitude: 0, longitude: 0 };
  assert.deepEqual(parseCreateAddressInput(atOrigin), { success: true, data: atOrigin });
  assert.equal(
    parseCreateAddressInput({ ...address, latitude: -90, longitude: 180 }).success,
    true,
  );
});

test("venue validation rejects incomplete, nonfinite and out of range coordinates", () => {
  const cases = [
    { latitude: 12, longitude: null },
    { latitude: null, longitude: 12 },
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: -181 },
    { latitude: NaN, longitude: 0 },
    { latitude: 0, longitude: Infinity },
    { latitude: "12", longitude: 0 },
  ];
  for (const coordinates of cases)
    assert.equal(parseCreateAddressInput({ ...address, ...coordinates }).success, false);
});

test("venue validation requires structured details and valid calendar dates and time zones", () => {
  for (const field of [
    "name",
    "addressText",
    "addressLine1",
    "postalCode",
    "city",
    "country",
    "locationType",
    "eventAt",
    "eventTimeZone",
  ]) {
    const parsed = parseCreateAddressInput({ ...address, [field]: "" });
    assert.equal(parsed.success, false, field);
    if (!parsed.success) assert.ok(parsed.errors.some((error) => error.field === field));
  }
  for (const eventAt of [
    "2027-02-29T18:00:00Z",
    "2027-06-31T18:00:00Z",
    "2027-06-12T18:00:00",
    "2027-06-12T25:00:00Z",
    "2027-06-12T24:00:00Z",
  ]) {
    assert.equal(parseCreateAddressInput({ ...address, eventAt }).success, false, eventAt);
  }
  assert.equal(parseCreateAddressInput({ ...address, locationType: "spaceship" }).success, false);
  assert.equal(
    parseCreateAddressInput({ ...address, eventTimeZone: "not/a/timezone" }).success,
    false,
  );
  assert.equal(parseCreateAddressInput({ ...address, instructions: 123 }).success, false);
  assert.equal(
    parseCreateAddressInput({ ...address, addressLine1: "a".repeat(301) }).success,
    false,
  );
  assert.equal(parseCreateAddressInput([]).success, false);
});

test("invitation validation normalizes email and rejects missing contacts, venue and deadline", () => {
  const input = {
    guestName: "  An  ",
    email: " AN@EXAMPLE.COM ",
    phoneNumber: "",
    addressId: "venue-1",
    expiresAt: "2027-06-01T12:00:00Z",
    personalMessage: "",
  };
  assert.deepEqual(parseCreateInvitationInput(input), {
    success: true,
    data: {
      guestName: "An",
      email: "an@example.com",
      phoneNumber: null,
      addressId: "venue-1",
      expiresAt: "2027-06-01T12:00:00Z",
      personalMessage: null,
    },
  });
  for (const invalid of [
    { guestName: "" },
    { email: "a@" },
    { addressId: "" },
    { expiresAt: "2027-02-30T12:00:00Z" },
    { phoneNumber: 123 },
    { personalMessage: "a".repeat(2001) },
  ]) {
    assert.equal(parseCreateInvitationInput({ ...input, ...invalid }).success, false);
  }
  assert.equal(parseCreateInvitationInput(null).success, false);
});

test("venue time conversion uses the selected zone and rejects nonexistent DST times", () => {
  const data = new FormData();
  data.set("eventAt", "2027-06-12T18:00");
  assert.equal(formZonedTimestamp(data, "eventAt", "Asia/Ho_Chi_Minh"), "2027-06-12T11:00:00.000Z");
  assert.equal(formZonedTimestamp(data, "eventAt", "Europe/Berlin"), "2027-06-12T16:00:00.000Z");
  data.set("eventAt", "2027-03-28T02:30");
  assert.equal(formZonedTimestamp(data, "eventAt", "Europe/Berlin"), "2027-03-28T02:30");
});

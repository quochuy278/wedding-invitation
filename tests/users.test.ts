import assert from "node:assert/strict";
import test from "node:test";
import { parseCreateUserInput } from "@/server/features/users/user.schema";
import { UserLevel } from "@/shared/contracts/auth";

const admin = {
  fullName: " Quản trị viên ",
  email: " ADMIN@example.com ",
  phoneNumber: " 0123456789 ",
  level: UserLevel.Admin,
  password: " password with spaces ",
};

test("user creation normalizes contacts and preserves password whitespace", () => {
  const result = parseCreateUserInput(admin);
  assert.ok(result.success);
  assert.equal(result.data.fullName, "Quản trị viên");
  assert.equal(result.data.email, "admin@example.com");
  assert.equal(result.data.phoneNumber, "0123456789");
  assert.equal(result.data.password, admin.password);
});

test("admin creation requires a strong bounded password and an explicit valid role", () => {
  for (const patch of [
    { password: undefined },
    { password: "short" },
    { password: "a".repeat(1025) },
    { level: -1 },
    { level: "0" },
    { level: undefined },
  ]) {
    assert.equal(parseCreateUserInput({ ...admin, ...patch }).success, false);
  }
});

test("guests never receive login passwords", () => {
  const result = parseCreateUserInput({ ...admin, level: UserLevel.Guest, phoneNumber: " " });
  assert.ok(result.success);
  assert.equal(result.data.phoneNumber, null);
  assert.equal(result.data.password, undefined);
});

test("invalid user profile values are rejected", () => {
  for (const value of [
    null,
    [],
    { ...admin, fullName: " " },
    { ...admin, fullName: "a".repeat(201) },
    { ...admin, email: "invalid" },
    { ...admin, phoneNumber: 123 },
    { ...admin, phoneNumber: "1".repeat(51) },
  ]) {
    assert.equal(parseCreateUserInput(value).success, false);
  }
});

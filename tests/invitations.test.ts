import assert from "node:assert/strict";
import test from "node:test";
import {
  parseInvitationListQuery,
  validateInvitationCodeInputSchema,
} from "@/server/features/invitations/invitation.schema";
import { invitationCodeGenerator } from "@/server/features/invitations/invitation-code";
import type { InvitationListParams } from "@/shared/contracts/invitation";
import { isInvitationCodeInput, normalizeInvitationCode } from "@/shared/utils/invitation-code";

test("invitation codes contain exactly six uppercase ASCII letters or digits", () => {
  for (let index = 0; index < 100; index += 1)
    assert.match(invitationCodeGenerator.generate(), /^[A-Z0-9]{6}$/);
  for (const code of ["ABC123", "abc123", "  aB7k2q  ", "000000", "ZZZZZZ"])
    assert.deepEqual(validateInvitationCodeInputSchema({ code }), {
      success: true,
      data: { code: code.trim().toUpperCase() },
    });
});

test("invitation code validation rejects lengths, symbols and Unicode lookalikes", () => {
  const invalidCodes: unknown[] = [
    undefined,
    null,
    123456,
    "",
    "ABC12",
    "ABC1234",
    "ABC 12",
    "ABC-12",
    "ABC_12",
    "ÁBC123",
    "ＡBC123",
    "ß1234",
    "😀1234",
    "ABC12\n3",
  ];
  for (const code of invalidCodes) {
    const result = validateInvitationCodeInputSchema({ code });
    assert.equal(result.success, false, String(code));
    if (!result.success) assert.equal(result.errors[0].field, "code");
  }
  assert.equal(validateInvitationCodeInputSchema(null).success, false);
});

test("partial code input uppercases ASCII and rejects invalid or overlong pastes", () => {
  assert.equal(normalizeInvitationCode("  ab7k2q  "), "AB7K2Q");
  assert.equal(normalizeInvitationCode("ß1234"), "ß1234");
  for (const code of ["", "A", "A7", "AB7K2Q"]) assert.equal(isInvitationCodeInput(code), true);
  for (const code of ["AB7K2Q9", "AB-123", "ab1234", "ß1234"])
    assert.equal(isInvitationCodeInput(code), false);
});

test("invitation pagination defaults to the first five records", () => {
  assert.deepEqual(parseInvitationListQuery(new URLSearchParams()), {
    success: true,
    data: { page: 1, pageSize: 5 },
  });
  assert.deepEqual(parseInvitationListQuery(new URLSearchParams("page=2&pageSize=100")), {
    success: true,
    data: { page: 2, pageSize: 100 },
  });
});

test("invitation pagination rejects malformed, repeated and unsafe numbers by field", () => {
  const invalid: string[] = [
    "",
    "0",
    "-1",
    "1.5",
    "1e2",
    " 2 ",
    "2x",
    "Infinity",
    "NaN",
    "9007199254740992",
  ];
  for (const field of ["page", "pageSize"]) {
    for (const value of invalid) {
      const parsed = parseInvitationListQuery(new URLSearchParams({ [field]: value }));
      assert.equal(parsed.success, false, `${field}=${value}`);
      if (!parsed.success) assert.equal(parsed.errors[0].field, field);
    }
    assert.equal(
      parseInvitationListQuery(new URLSearchParams(`${field}=1&${field}=2`)).success,
      false,
    );
  }
  const invalidSize = parseInvitationListQuery(new URLSearchParams("page=0&pageSize=101"));
  assert.equal(invalidSize.success, false);
  if (!invalidSize.success)
    assert.deepEqual(
      invalidSize.errors.map((error) => error.field),
      ["page", "pageSize"],
    );
});

test("safe page numbers remain valid so the repository can clamp them", () => {
  const input: InvitationListParams = { page: Number.MAX_SAFE_INTEGER, pageSize: 1 };
  assert.deepEqual(
    parseInvitationListQuery(
      new URLSearchParams({
        page: String(input.page),
        pageSize: String(input.pageSize),
      }),
    ),
    { success: true, data: input },
  );
});

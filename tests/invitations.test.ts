import assert from "node:assert/strict";
import test from "node:test";
import { parseInvitationListQuery } from "@/server/features/invitations/invitation.schema";
import type { InvitationListParams } from "@/shared/contracts/invitation";

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

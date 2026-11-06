import assert from "node:assert/strict";
import test from "node:test";
import type { AxiosAdapter } from "axios";
import { apiClient } from "@/lib/api/client";
import {
  parseInvitationListQuery,
  parseUpdateInvitationNoteInput,
  validateInvitationCodeInputSchema,
} from "@/server/features/invitations/invitation.schema";
import { invitationCodeGenerator } from "@/server/features/invitations/invitation-code";
import { invitationService as clientInvitations } from "@/services/invitations/invitation.service";
import {
  type InvitationListParams,
  invitationAdminNoteMaxLength,
  invitationTimeZoneHeader,
} from "@/shared/contracts/invitation";
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

test("invitation pagination defaults to the first twenty records", () => {
  assert.deepEqual(parseInvitationListQuery(new URLSearchParams()), {
    success: true,
    data: { page: 1, pageSize: 20 },
  });
  assert.deepEqual(parseInvitationListQuery(new URLSearchParams("page=2&pageSize=100")), {
    success: true,
    data: { page: 2, pageSize: 100 },
  });
});

test("invitation list accepts one optional address filter", () => {
  assert.deepEqual(parseInvitationListQuery(new URLSearchParams("page=2&addressId=venue-id")), {
    success: true,
    data: { page: 2, pageSize: 20, addressId: "venue-id" },
  });
  assert.deepEqual(parseInvitationListQuery(new URLSearchParams("addressId=")), {
    success: true,
    data: { page: 1, pageSize: 20 },
  });
  for (const query of ["addressId=one&addressId=two", `addressId=${"a".repeat(129)}`]) {
    const result = parseInvitationListQuery(new URLSearchParams(query));
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.errors[0].field, "addressId");
  }
});

test("an admin note accepts trimmed text or null and rejects invalid updates", () => {
  assert.deepEqual(parseUpdateInvitationNoteInput({ adminNote: "  First line\nSecond line  " }), {
    success: true,
    data: { adminNote: "First line\nSecond line" },
  });
  for (const adminNote of [null, "   "]) {
    assert.deepEqual(parseUpdateInvitationNoteInput({ adminNote }), {
      success: true,
      data: { adminNote: null },
    });
  }
  for (const adminNote of [undefined, 1, "note\0", "a".repeat(invitationAdminNoteMaxLength + 1)]) {
    const result = parseUpdateInvitationNoteInput({ adminNote });
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.errors[0].field, "adminNote");
  }
});

test("invitation date filters cover the complete local day across clock changes", () => {
  const days = [
    ["2026-03-29", "Europe/Berlin", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z"],
    ["2026-10-25", "Europe/Berlin", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"],
    ["2026-11-01", "America/Havana", "2026-11-01T04:00:00Z", "2026-11-02T05:00:00Z"],
  ];
  for (const [day, zone, start, end] of days) {
    const query = new URLSearchParams({ status: "pending", updatedFrom: day, updatedTo: day });
    assert.deepEqual(parseInvitationListQuery(query, zone), {
      success: true,
      data: {
        page: 1,
        pageSize: 20,
        status: "pending",
        updatedAt: { gte: new Date(start), lt: new Date(end) },
      },
    });
  }
});

test("invitation date filters accept either boundary and validate dates and the time zone", () => {
  const zone = "Asia/Ho_Chi_Minh";
  const from = new URLSearchParams("updatedFrom=2026-11-06");
  const to = new URLSearchParams("updatedTo=2026-11-06");
  assert.deepEqual(parseInvitationListQuery(from, zone), {
    success: true,
    data: { page: 1, pageSize: 20, updatedAt: { gte: new Date("2026-11-05T17:00:00Z") } },
  });
  assert.deepEqual(parseInvitationListQuery(to, zone), {
    success: true,
    data: { page: 1, pageSize: 20, updatedAt: { lt: new Date("2026-11-06T17:00:00Z") } },
  });
  const invalidQueries = [
    ["updatedFrom=2026-02-29", zone, "updatedFrom"],
    ["updatedFrom=2026-11-07&updatedTo=2026-11-06", zone, "updatedTo"],
    ["updatedTo=2026-11-06", null, "timeZone"],
    ["updatedTo=2026-11-06", "Invalid/Zone", "timeZone"],
    ["status=pending&status=attended", null, "status"],
  ] as const;
  for (const [query, timeZone, field] of invalidQueries) {
    const result = parseInvitationListQuery(new URLSearchParams(query), timeZone);
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.errors[0].field, field);
  }
});

test("the invitation client sends its time zone as a header", async () => {
  const params: InvitationListParams = { page: 1, pageSize: 5, updatedFrom: "2026-11-06" };
  const originalAdapter = apiClient.defaults.adapter;
  const adapter: AxiosAdapter = async (config) => {
    assert.equal(config.url, "/invitations");
    assert.deepEqual(config.params, params);
    assert.equal(config.headers.get(invitationTimeZoneHeader), "Europe/Berlin");
    return { data: { data: {} }, status: 200, statusText: "OK", headers: {}, config };
  };
  apiClient.defaults.adapter = adapter;
  try {
    await clientInvitations.list(params, undefined, "Europe/Berlin");
  } finally {
    apiClient.defaults.adapter = originalAdapter;
  }
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

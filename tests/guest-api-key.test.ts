import "dotenv/config";

import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import type { AxiosAdapter } from "axios";
import { GET as getInvitation } from "@/app/api/invitations/[code]/route";
import { GET as getQr } from "@/app/api/invitations/[code]/ticket/qr/route";
import { POST as validateCode } from "@/app/api/invitations/validate/route";
import { apiClient } from "@/lib/api/client";
import { ApiErrorCode } from "@/lib/api/types";
import { invitationService } from "@/server/features/invitations/invitation.service";
import { invitationTicketService } from "@/server/features/invitations/invitation-ticket.service";
import { invitationService as clientInvitations } from "@/services/invitations/invitation.service";
import { guestApiHeaders, guestApiKey, guestApiKeyHeader } from "@/shared/contracts/guest-api";

afterEach(() => mock.restoreAll());

function request(headers?: HeadersInit): Request {
  return new Request(`https://wedding.example/api/invitations/ABC123?apiKey=${guestApiKey}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "ABC123" }),
  });
}

test("all guest APIs reject missing or wrong keys before lookup, body parsing or QR work", async () => {
  const lookup = mock.method(invitationService, "getByCode", async () => {
    throw new Error("Unexpected database lookup");
  });
  const validation = mock.method(invitationService, "validateCode", async () => {
    throw new Error("Unexpected database validation");
  });
  const qr = mock.method(invitationTicketService, "getByCode", async () => {
    throw new Error("Unexpected QR generation");
  });
  const invalidHeaders: (HeadersInit | undefined)[] = [
    undefined,
    { [guestApiKeyHeader]: "wrong-key" },
    { Authorization: `Bearer ${guestApiKey}`, Cookie: "wedding_access=fake" },
    { [guestApiKeyHeader]: `${guestApiKey},wrong-key` },
  ];
  for (const headers of invalidHeaders) {
    const input = request(headers);
    const read = mock.method(input, "text", async () => {
      throw new Error("Unexpected body parsing");
    });
    const responses = [
      await getInvitation(input, { params: Promise.resolve({ code: "ABC123" }) }),
      await validateCode(input),
      await getQr(input, { params: Promise.resolve({ code: "ABC123" }) }),
    ];
    for (const response of responses) {
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
      assert.equal(response.headers.get("set-cookie"), null);
      assert.deepEqual(await response.json(), {
        error: { code: ApiErrorCode.Forbidden, message: "A valid guest API key is required." },
      });
    }
    assert.equal(read.mock.callCount(), 0);
  }
  for (const operation of [lookup, validation, qr]) assert.equal(operation.mock.callCount(), 0);
});

test("a valid guest key still requires an available invitation and issues no session", async () => {
  const lookup = mock.method(invitationService, "getByCode", async () => null);
  const validation = mock.method(invitationService, "validateCode", async () => ({
    isValid: false,
  }));
  const qr = mock.method(invitationTicketService, "getByCode", async () => null);
  // HTTP header names are case-insensitive.
  const input = request({ [guestApiKeyHeader.toLowerCase()]: guestApiKey });
  for (const response of [
    await getInvitation(input, { params: Promise.resolve({ code: "ABC123" }) }),
    await getQr(input, { params: Promise.resolve({ code: "ABC123" }) }),
  ]) {
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, ApiErrorCode.NotFound);
    assert.equal(response.headers.get("set-cookie"), null);
  }
  const result = await validateCode(input);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { data: { isValid: false } });
  assert.equal(result.headers.get("set-cookie"), null);
  for (const operation of [lookup, validation, qr]) assert.equal(operation.mock.callCount(), 1);
});

test("browser invitation services attach the guest key only to public API requests", async () => {
  const calls: { url: string | undefined; key: unknown }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push({ url: config.url, key: config.headers.get(guestApiKeyHeader) });
    return { data: { data: {} }, status: 200, statusText: "OK", headers: {}, config };
  };
  const originalAdapter = apiClient.defaults.adapter;
  apiClient.defaults.adapter = adapter;
  try {
    await clientInvitations.validateCode({ code: "ABC123" });
    await clientInvitations.getByCode("ABC123");
    await clientInvitations.list({ page: 1, pageSize: 5 });
    await clientInvitations.create({
      guestName: "Test guest",
      email: "guest@example.invalid",
      phoneNumber: null,
      addressId: "test-address",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      personalMessage: null,
    });
    assert.deepEqual(calls, [
      { url: "/invitations/validate", key: guestApiHeaders[guestApiKeyHeader] },
      { url: "/invitations/ABC123", key: guestApiKey },
      { url: "/invitations", key: undefined },
      { url: "/invitations", key: undefined },
    ]);
  } finally {
    apiClient.defaults.adapter = originalAdapter;
  }
});

import "dotenv/config";

import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import type { AxiosAdapter } from "axios";
import { POST as postRsvp } from "@/app/api/rsvps/route";
import { POST as postWish } from "@/app/api/wishes/route";
import { apiClient } from "@/lib/api/client";
import { ApiErrorCode } from "@/lib/api/types";
import { createRsvpInputSchema } from "@/server/features/rsvps/rsvp.schema";
import { rsvpService } from "@/server/features/rsvps/rsvp.service";
import { createWishInputSchema } from "@/server/features/wishes/wish.schema";
import { wishService } from "@/server/features/wishes/wish.service";
import { rsvpService as clientRsvps } from "@/services/rsvps/rsvp.service";
import { wishService as clientWishes } from "@/services/wishes/wish.service";
import { guestApiHeaders, guestApiKey, guestApiKeyHeader } from "@/shared/contracts/guest-api";

afterEach(() => mock.restoreAll());

test("RSVP requires an invitation code and a consistent integer attendee count", () => {
  for (const guestCount of [1, 2, 11, 100, 2_147_483_647]) {
    const input = { code: " abc123 ", attendance: "yes", guestCount, guestName: "Spoofed name" };
    assert.deepEqual(createRsvpInputSchema(input), {
      success: true,
      data: { code: "ABC123", attendance: "yes", guestCount },
    });
  }
  assert.equal(
    createRsvpInputSchema({ code: "ABC123", attendance: "no", guestCount: 0 }).success,
    true,
  );
  for (const change of [
    { code: "" },
    { code: "12345" },
    { code: "ＡBC123" },
    { attendance: "maybe" },
    { guestCount: 0 },
    { guestCount: -1 },
    { guestCount: 1.5 },
    { guestCount: "2" },
    { guestCount: null },
    { guestCount: 2_147_483_648 },
    { attendance: "no", guestCount: 2 },
  ]) {
    assert.equal(
      createRsvpInputSchema({ code: "ABC123", attendance: "yes", guestCount: 2, ...change })
        .success,
      false,
    );
  }
  for (const input of [
    null,
    [],
    "invalid",
    { guestName: "Old demo guest", attendance: "yes", guestCount: 2 },
  ]) {
    assert.equal(createRsvpInputSchema(input).success, false);
  }
});

test("wishes trim text, require a valid invitation and enforce the content limit", () => {
  assert.deepEqual(createWishInputSchema({ code: " abc123 ", content: "  Chúc hạnh phúc!\n  " }), {
    success: true,
    data: { code: "ABC123", content: "Chúc hạnh phúc!" },
  });
  assert.equal(createWishInputSchema({ code: "ABC123", content: "a".repeat(500) }).success, true);
  for (const change of [
    { code: "" },
    { content: " \n " },
    { content: 123 },
    { content: "a".repeat(501) },
  ]) {
    assert.equal(
      createWishInputSchema({ code: "ABC123", content: "A wish", ...change }).success,
      false,
    );
  }
});

function request(body: string, headers: HeadersInit = guestApiHeaders): Request {
  return new Request("https://wedding.example/api/responses", { method: "POST", headers, body });
}

test("response APIs reject missing/wrong keys before reading bodies or touching storage", async () => {
  const rsvp = mock.method(rsvpService, "create", async () => {
    throw new Error("Unexpected write");
  });
  const wish = mock.method(wishService, "create", async () => {
    throw new Error("Unexpected write");
  });
  const invalidHeaders: HeadersInit[] = [{}, { [guestApiKeyHeader]: "wrong" }];
  for (const handler of [postRsvp, postWish]) {
    for (const headers of invalidHeaders) {
      const input = request("invalid JSON", headers);
      const read = mock.method(input, "text", async () => {
        throw new Error("Unexpected parsing");
      });
      const response = await handler(input);
      assert.equal(response.status, 403);
      assert.equal((await response.json()).error.code, ApiErrorCode.Forbidden);
      assert.equal(read.mock.callCount(), 0);
    }
  }
  assert.equal(rsvp.mock.callCount(), 0);
  assert.equal(wish.mock.callCount(), 0);
});

test("response APIs reject malformed/oversized bodies and invalid fields without writes", async () => {
  const rsvp = mock.method(rsvpService, "create", async () => {
    throw new Error("Unexpected write");
  });
  const wish = mock.method(wishService, "create", async () => {
    throw new Error("Unexpected write");
  });
  for (const handler of [postRsvp, postWish]) {
    for (const body of ["{", "a".repeat(4097), JSON.stringify({})]) {
      const response = await handler(request(body));
      assert.equal(response.status, 400);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).error.code, ApiErrorCode.BadRequest);
    }
  }
  assert.equal(rsvp.mock.callCount(), 0);
  assert.equal(wish.mock.callCount(), 0);
});

test("unavailable invitations return 404 and storage failures return a safe retryable error", async () => {
  const operations = [
    {
      handler: postRsvp,
      service: rsvpService,
      body: { code: "ABC123", attendance: "yes", guestCount: 2 },
    },
    { handler: postWish, service: wishService, body: { code: "ABC123", content: "A wish" } },
  ];
  for (const operation of operations) {
    const write = mock.method(operation.service, "create", async () => null);
    const missing = await operation.handler(request(JSON.stringify(operation.body)));
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, ApiErrorCode.NotFound);
    write.mock.mockImplementation(async () => {
      throw new Error("Private database detail");
    });
    const unavailable = await operation.handler(request(JSON.stringify(operation.body)));
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get("set-cookie"), null);
    const text = await unavailable.text();
    assert.equal(JSON.parse(text).error.code, ApiErrorCode.Unavailable);
    assert.ok(!text.includes("Private database detail"));
  }
});

test("client sends guest key for response writes and leaves admin reads protected", async () => {
  const calls: { url: string | undefined; key: unknown }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push({ url: config.url, key: config.headers.get(guestApiKeyHeader) });
    return { data: { data: {} }, status: 200, statusText: "OK", headers: {}, config };
  };
  const original = apiClient.defaults.adapter;
  apiClient.defaults.adapter = adapter;
  try {
    await clientRsvps.create({ code: "ABC123", attendance: "yes", guestCount: 2 });
    await clientWishes.create({ code: "ABC123", content: "A wish" });
    await clientRsvps.list();
    await clientWishes.list("ABC123");
    assert.deepEqual(calls, [
      { url: "/rsvps", key: guestApiKey },
      { url: "/wishes", key: guestApiKey },
      { url: "/rsvps", key: undefined },
      { url: "/wishes", key: undefined },
    ]);
  } finally {
    apiClient.defaults.adapter = original;
  }
});

import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { BrevoEmailError, brevoService } from "@/server/features/invitations/brevo.service";
import { invitationEmailContent } from "@/server/features/invitations/invitation-email.template";
import type { CreatedInvitationDto } from "@/shared/contracts/invitation";

const invitation: CreatedInvitationDto = {
  id: "testinvitation",
  code: "ABC123",
  status: "pending",
  guestName: "An & Bình",
  email: "guest@example.invalid",
  phoneNumber: null,
  expiresAt: "2027-06-01T11:00:00Z",
  personalMessage: "Hẹn gặp bạn!",
  address: {
    id: "testvenue",
    name: "Nhà hàng Sen",
    addressText: "12 Nguyễn Du\nTP. Hồ Chí Minh",
    addressLine1: "12 Nguyễn Du",
    addressLine2: "Sảnh Hoa Sen",
    locationType: "restaurant",
    postalCode: "00123",
    city: "TP. Hồ Chí Minh",
    region: null,
    country: "Việt Nam",
    floor: "3A",
    entrance: "Cổng B",
    instructions: "Dùng thang máy bên phải.",
    latitude: 10.78,
    longitude: 106.69,
    eventAt: "2027-06-12T11:00:00Z",
    eventTimeZone: "Asia/Ho_Chi_Minh",
  },
};

const settings = {
  BREVO_API_KEY: "brevo-test-secret",
  BREVO_SENDER_EMAIL: "sender@example.invalid",
  BREVO_SENDER_NAME: "noreply",
  APP_URL: "https://wedding.example.invalid",
  AUTH_ORIGIN: "http://localhost:3000",
};
const originalSettings: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const [name, value] of Object.entries(settings)) {
    originalSettings[name] = process.env[name];
    process.env[name] = value;
  }
});

afterEach(() => {
  for (const [name, value] of Object.entries(originalSettings)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("Brevo sends a private HTTP payload with the canonical invitation URL and message ID", async (context) => {
  const request = context.mock.method(globalThis, "fetch", async () =>
    Response.json({ messageId: "<test-message@brevo>" }, { status: 201 }),
  );
  const timeout = context.mock.method(AbortSignal, "timeout");
  const messageId = await brevoService.sendInvitation(invitation);
  assert.equal(messageId, "<test-message@brevo>");
  assert.equal(request.mock.callCount(), 1);
  const [url, options] = request.mock.calls[0].arguments;
  assert.equal(url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(options?.method, "POST");
  assert.equal(options?.cache, "no-store");
  assert.equal(options?.redirect, "error");
  assert.equal(new Headers(options?.headers).get("api-key"), settings.BREVO_API_KEY);
  assert.equal(timeout.mock.calls[0].arguments[0], 8_000);
  assert.equal(typeof options?.body, "string");
  const body = JSON.parse(String(options?.body));
  assert.deepEqual(body.sender, { email: settings.BREVO_SENDER_EMAIL, name: "noreply" });
  assert.deepEqual(body.to, [{ email: invitation.email, name: invitation.guestName }]);
  assert.ok(body.htmlContent.includes("https://wedding.example.invalid/invitation/ABC123"));
  assert.ok(body.textContent.includes("Hẹn gặp bạn!"));
  assert.ok(!JSON.stringify(body).includes(settings.BREVO_API_KEY));
});

test("email content escapes personal data, preserves the venue and uses its time zone", () => {
  const malicious = {
    ...invitation,
    guestName: '<img src=x onerror="alert(1)"> $&',
    personalMessage: "<script>alert('x')</script>",
  };
  const content = invitationEmailContent(
    malicious,
    "https://wedding.example.invalid/invitation/ABC123",
  );
  assert.ok(!content.htmlContent.includes("<img src=x"));
  assert.ok(!content.htmlContent.includes("<script>"));
  assert.ok(content.htmlContent.includes("&lt;script&gt;"));
  assert.ok(content.htmlContent.includes("$&amp;"));
  assert.ok(content.htmlContent.includes("18:00"));
  for (const text of ["Địa chỉ:", "Sảnh Hoa Sen", "3A", "Cổng B", "Dùng thang máy"])
    assert.ok(content.htmlContent.includes(text), text);
  assert.ok(!content.htmlContent.includes("Asia/Ho_Chi_Minh"));
  assert.ok(!content.textContent.includes("Asia/Ho_Chi_Minh"));
  assert.ok(content.htmlContent.includes("12 Nguyễn Du, TP. Hồ Chí Minh"));
  assert.ok(content.textContent.includes("Địa chỉ: 12 Nguyễn Du, TP. Hồ Chí Minh"));
  assert.ok(content.textContent.includes(malicious.guestName));
  assert.ok(content.textContent.includes("https://wedding.example.invalid/invitation/ABC123"));
});

test("configuration fails before calling Brevo for missing credentials or unsafe URL schemes", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  const invalidSettings: [keyof typeof settings, string][] = [
    ["BREVO_API_KEY", ""],
    ["BREVO_SENDER_EMAIL", "not-an-email"],
    ["APP_URL", "javascript:alert(1)"],
    ["APP_URL", "https://username:password@example.com"],
    ["APP_URL", "https://example.com?redirect=elsewhere"],
  ];
  for (const [name, value] of invalidSettings) {
    process.env[name] = value;
    await assert.rejects(
      brevoService.sendInvitation(invitation),
      (error: unknown) => error instanceof BrevoEmailError && error.code === "configuration",
    );
    process.env[name] = settings[name];
  }
  assert.equal(request.mock.callCount(), 0);
});

test("local email links can use AUTH_ORIGIN when APP_URL is not configured", async (context) => {
  process.env.APP_URL = "";
  const request = context.mock.method(globalThis, "fetch", async () =>
    Response.json({ messageId: "<local-message>" }, { status: 201 }),
  );
  await brevoService.sendInvitation(invitation);
  const options = request.mock.calls[0].arguments[1];
  assert.ok(String(options?.body).includes("http://localhost:3000/invitation/ABC123"));
});

test("provider failures are sanitized and a send is never automatically retried", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  for (const status of [400, 401, 403, 429, 500, 503]) {
    request.mock.mockImplementation(async () => new Response(settings.BREVO_API_KEY, { status }));
    const count = request.mock.callCount();
    await assert.rejects(brevoService.sendInvitation(invitation), (error: unknown): boolean => {
      assert.ok(error instanceof BrevoEmailError);
      assert.equal(error.code, status === 401 || status === 403 ? "configuration" : "provider");
      assert.ok(!error.message.includes(settings.BREVO_API_KEY));
      assert.equal(error.cause, undefined);
      return true;
    });
    assert.equal(request.mock.callCount(), count + 1);
  }
});

test("timeouts, network failures and malformed success responses are unconfirmed", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  for (const failure of [
    new DOMException("Timeout", "TimeoutError"),
    new Error(settings.BREVO_API_KEY),
  ]) {
    request.mock.mockImplementation(async () => {
      throw failure;
    });
    await assert.rejects(
      brevoService.sendInvitation(invitation),
      (error: unknown) => error instanceof BrevoEmailError && error.code === "unconfirmed",
    );
  }
  for (const body of [{}, null, { messageId: "" }, { messageId: 123 }]) {
    request.mock.mockImplementation(async () => Response.json(body, { status: 201 }));
    await assert.rejects(
      brevoService.sendInvitation(invitation),
      (error: unknown) => error instanceof BrevoEmailError && error.code === "unconfirmed",
    );
  }
});

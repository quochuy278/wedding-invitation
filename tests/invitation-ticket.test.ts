import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { issueTokens, TokenPurpose, verifyToken } from "@/server/features/auth/token";
import { renderInvitationTicketQr } from "@/server/features/invitations/invitation-ticket.qr";
import {
  issueInvitationTicketToken,
  readInvitationTicketCode,
  verifyInvitationTicketToken,
} from "@/server/features/invitations/invitation-ticket.token";

process.env.AUTH_SECRET = randomBytes(48).toString("base64url");

function invitation() {
  return {
    id: "ticket-test-invitation",
    code: "AB7K2Q",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
}

test("ticket tokens are stable and bind the code, internal identity and deadline", () => {
  const saved = invitation();
  const token = issueInvitationTicketToken(saved);
  assert.equal(issueInvitationTicketToken(saved), token);
  assert.equal(readInvitationTicketCode(token), saved.code);
  assert.equal(verifyInvitationTicketToken(token, saved), true);
  assert.equal(
    verifyInvitationTicketToken(token, { ...saved, id: "replacement-invitation" }),
    false,
  );
  assert.equal(verifyInvitationTicketToken(token, { ...saved, code: "ZY9X8W" }), false);
  assert.equal(
    verifyInvitationTicketToken(token, {
      ...saved,
      expiresAt: new Date(Date.parse(saved.expiresAt) + 1000).toISOString(),
    }),
    false,
  );
});

test("ticket tokens reject forged signatures, changed payloads and malformed QR data", () => {
  const saved = invitation();
  const token = issueInvitationTicketToken(saved);
  const changedSignature = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  const invalid = [
    changedSignature,
    token.replace(saved.code, "ZY9X8W"),
    token.replace("WIT1.", "WIT2."),
    `${token}\n`,
    `${token} `,
    ` ${token}`,
    `${token}.extra`,
    "",
    saved.code,
    "https://fake.example/ticket/AB7K2Q",
    "x".repeat(10000),
  ];
  for (const value of invalid) assert.equal(verifyInvitationTicketToken(value, saved), false);
  for (const value of ["", saved.code, `${token}\n`, token.replace("WIT1.", "WIT2.")])
    assert.equal(readInvitationTicketCode(value), null);
});

test("ticket signatures stop validating at the deadline and after secret rotation", (context) => {
  const saved = invitation();
  const token = issueInvitationTicketToken(saved);
  const secret = process.env.AUTH_SECRET;
  try {
    process.env.AUTH_SECRET = randomBytes(48).toString("base64url");
    assert.equal(verifyInvitationTicketToken(token, saved), false);
  } finally {
    process.env.AUTH_SECRET = secret;
  }
  context.mock.timers.enable({ apis: ["Date"], now: Date.parse(saved.expiresAt) });
  assert.equal(verifyInvitationTicketToken(token, saved), false);
});

test("admin tokens and ticket tokens cannot authenticate each other", async () => {
  const saved = invitation();
  const ticketToken = issueInvitationTicketToken(saved);
  const adminTokens = await issueTokens({
    id: "admin-test-session",
    user_id: "admin-test-user",
    expires_at: new Date(saved.expiresAt),
  });
  assert.equal(await verifyToken(ticketToken, TokenPurpose.Access), null);
  assert.equal(await verifyToken(ticketToken, TokenPurpose.Refresh), null);
  assert.equal(verifyInvitationTicketToken(adminTokens.accessToken, saved), false);
  assert.equal(verifyInvitationTicketToken(adminTokens.refreshToken, saved), false);
});

test("the rendered PNG QR decodes to the complete signed ticket token", async () => {
  const saved = invitation();
  const token = issueInvitationTicketToken(saved);
  const image = await renderInvitationTicketQr(token);
  const png = PNG.sync.read(Buffer.from(image.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded, "The actual QR image must be readable.");
  assert.equal(decoded.data, token);
  assert.equal(verifyInvitationTicketToken(decoded.data, saved), true);
});

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { ApiErrorCode } from "@/lib/api/types";
import { prisma } from "@/server/db/prisma";
import { invitationCodeGenerator } from "@/server/features/invitations/invitation-code";

const baseUrl = process.env.INVITATION_RATE_LIMIT_TEST_BASE_URL;
const identityHeader = process.env.INVITATION_RATE_LIMIT_TEST_IP_HEADER;

after(async () => {
  await prisma.$disconnect();
});

test("production HTTP pages, RSC, validation and QR share one lookup budget", {
  skip: !baseUrl || !identityHeader,
}, async () => {
  assert.ok(baseUrl);
  assert.ok(identityHeader);
  const runId = randomUUID();
  // Direct fixture creation avoids calling email or geocoding providers.
  const fixture = await prisma.$transaction(async (database) => {
    const address = await database.address.create({
      data: {
        name: "Lookup limit venue",
        address_text: "Temporary test venue",
        event_at: new Date(Date.now() + 86_400_000),
      },
    });
    const user = await database.user.create({
      data: { full_name: `Lookup guest ${runId}`, email: `lookup-${runId}@example.invalid` },
    });
    const invitation = await database.invitation.create({
      data: {
        user_id: user.id,
        address_id: address.id,
        code: invitationCodeGenerator.generate(),
        status: "pending",
        expires_at: new Date(Date.now() + 86_400_000),
      },
    });
    return { address, user, invitation };
  });

  async function send(
    path: string,
    identity: string,
    extraHeaders?: HeadersInit,
  ): Promise<Response> {
    const headers = new Headers(extraHeaders);
    headers.set(identityHeader ?? "", identity);
    const validate = path.startsWith("/api/invitations/validate");
    if (validate) headers.set("Content-Type", "application/json");
    return fetch(`${baseUrl}${path}`, {
      method: validate ? "POST" : "GET",
      headers,
      ...(validate ? { body: JSON.stringify({ code: "BAD" }) } : {}),
    });
  }

  try {
    const code = fixture.invitation.code;
    const normalClient = randomUUID();
    const validPaths = [
      `/api/invitations/${code}`,
      `/invitation/${code}`,
      `/ticket/${code}`,
      `/api/invitations/${code}/ticket/qr`,
    ];
    for (const path of validPaths) {
      const response = await send(path, normalClient);
      assert.equal(response.status, 200, path);
      if (path.endsWith("/qr")) {
        assert.equal(response.headers.get("content-type"), "image/png");
        await response.arrayBuffer();
      } else assert.ok((await response.text()).includes(fixture.user.full_name), path);
    }

    const burstClient = randomUUID();
    const unknownPaths = [
      "/api/invitations/BAD",
      "/api/invitations/validate",
      "/invitation/BAD",
      "/ticket/BAD",
      "/api/invitations/BAD/ticket/qr",
    ];
    for (let index = 0; index < 60; index += 1) {
      const path = unknownPaths[index % unknownPaths.length];
      const response = await send(path, burstClient);
      assert.equal(response.status, path.endsWith("/validate") ? 400 : 404, `request ${index + 1}`);
      await response.arrayBuffer();
    }

    for (const path of [...validPaths, "/api/invitations/validate"]) {
      for (const headers of [
        undefined,
        {
          rsc: "1",
          "next-router-prefetch": "1",
          purpose: "prefetch",
          "x-forwarded-for": randomUUID(),
          "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy",
        },
      ]) {
        const response = await send(`${path}?_rsc=${runId}`, burstClient, headers);
        assert.equal(response.status, 429, path);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal(response.headers.get("referrer-policy"), "no-referrer");
        const retryAfter = Number(response.headers.get("retry-after"));
        assert.ok(retryAfter >= 1 && retryAfter <= 60);
        const body = await response.text();
        assert.equal(JSON.parse(body).error.code, ApiErrorCode.RateLimited);
        assert.ok(!body.includes(fixture.user.full_name));
        assert.ok(!body.includes("data:image/png"));
      }
    }
    const otherClient = await send(validPaths[0], randomUUID());
    assert.equal(otherClient.status, 200);
    await otherClient.arrayBuffer();
    const homepage = await send("/", burstClient);
    assert.equal(homepage.status, 200);
    await homepage.arrayBuffer();
    const adminList = await send("/api/invitations", burstClient);
    assert.equal(adminList.status, 401);
    await adminList.arrayBuffer();
  } finally {
    await prisma.invitation.delete({ where: { id: fixture.invitation.id } });
    await prisma.user.delete({ where: { id: fixture.user.id } });
    await prisma.address.delete({ where: { id: fixture.address.id } });
  }
});

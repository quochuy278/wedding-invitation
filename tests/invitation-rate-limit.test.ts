import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, test } from "node:test";
import nextTesting from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { ApiErrorCode } from "@/lib/api/types";
import { config, proxy } from "@/proxy";

const originalHeader = process.env.TRUSTED_CLIENT_IP_HEADER;
// The installed Next.js package still exports this test helper under its legacy name.
const { unstable_doesMiddlewareMatch: doesProxyMatch } = nextTesting;
const testHeader = "x-test-client-ip";
const paths = [
  "/api/invitations/ABC123",
  "/api/invitations/validate",
  "/invitation/ABC123",
  "/ticket/ABC123",
  "/api/invitations/ABC123/ticket/qr",
];

afterEach(() => {
  if (originalHeader === undefined) delete process.env.TRUSTED_CLIENT_IP_HEADER;
  else process.env.TRUSTED_CLIENT_IP_HEADER = originalHeader;
});

function request(path: string, identity: string, headers?: HeadersInit): NextRequest {
  const input = new Headers(headers);
  input.set(testHeader, identity);
  return new NextRequest(`https://wedding.example${path}`, {
    method: path === "/api/invitations/validate" ? "POST" : "GET",
    headers: input,
  });
}

test("proxy covers all public lookup paths including RSC, prefetch and trailing slashes", () => {
  for (const path of paths) {
    for (const suffix of ["", "/", "?_rsc=probe"]) {
      assert.equal(
        doesProxyMatch({
          config,
          nextConfig: {},
          url: `${path}${suffix}`,
          headers: { rsc: "1", "next-router-prefetch": "1", purpose: "prefetch" },
        }),
        true,
        `${path}${suffix}`,
      );
    }
  }
  for (const path of [
    "/",
    "/login",
    "/dashboard",
    "/api/invitations",
    "/api/invitations/",
    "/api/invitation-tickets/verify",
    "/_next/static/app.js",
  ]) {
    assert.equal(doesProxyMatch({ config, nextConfig: {}, url: path }), false, path);
  }
});

test("changing codes, entry points or RSC/prefetch headers does not renew the lookup budget", async () => {
  process.env.TRUSTED_CLIENT_IP_HEADER = testHeader;
  const identity = randomUUID();
  for (let index = 0; index < 60; index += 1) {
    const path = paths[index % paths.length].replace("ABC123", index % 2 ? "ABC123" : "XYZ987");
    const response = proxy(request(path, identity));
    assert.equal(response.headers.get("x-middleware-next"), "1", `request ${index + 1}`);
  }
  for (const path of paths) {
    const response = proxy(
      request(`${path}?_rsc=probe`, identity, {
        rsc: "1",
        "next-router-prefetch": "1",
        purpose: "prefetch",
        "x-forwarded-for": randomUUID(),
        "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy",
      }),
    );
    assert.equal(response.status, 429, path);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    const retryAfter = Number(response.headers.get("retry-after"));
    assert.ok(retryAfter >= 1 && retryAfter <= 60);
    assert.equal((await response.json()).error.code, ApiErrorCode.RateLimited);
  }
  assert.equal(proxy(request(paths[0], randomUUID())).headers.get("x-middleware-next"), "1");
});

test("caller-controlled forwarded headers cannot split the fallback budget", () => {
  delete process.env.TRUSTED_CLIENT_IP_HEADER;
  for (let index = 0; index < 60; index += 1) {
    const response = proxy(
      request(paths[index % paths.length], randomUUID(), {
        "x-forwarded-for": randomUUID(),
        "x-real-ip": randomUUID(),
      }),
    );
    assert.equal(response.headers.get("x-middleware-next"), "1");
  }
  assert.equal(
    proxy(request(paths[2], randomUUID(), { "x-forwarded-for": randomUUID() })).status,
    429,
  );
});

test("the lookup budget recovers when its window expires", (context) => {
  process.env.TRUSTED_CLIENT_IP_HEADER = testHeader;
  const identity = randomUUID();
  const start = Date.now();
  context.mock.timers.enable({ apis: ["Date"], now: start });
  for (let index = 0; index < 60; index += 1) proxy(request(paths[0], identity));
  assert.equal(proxy(request(paths[1], identity)).status, 429);
  context.mock.timers.tick(60_000);
  assert.equal(proxy(request(paths[2], identity)).headers.get("x-middleware-next"), "1");
});

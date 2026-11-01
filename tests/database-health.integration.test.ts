import "dotenv/config";

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer, type Socket } from "node:net";
import { afterEach, beforeEach, mock, test } from "node:test";
import pg from "pg";
import { GET } from "@/app/api/cron/database-health/route";
import {
  databaseHealthRepository,
  databaseHealthTimeoutMs,
} from "@/server/features/health/database-health.repository";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must be configured for integration tests.");
const httpBaseUrl = process.env.DATABASE_HEALTH_TEST_BASE_URL;
const httpSecret = process.env.CRON_SECRET;
const secret = randomBytes(32).toString("base64url");
const unreachableUrl = "postgresql://health:private-test-password@127.0.0.1:1/postgres";
const originalSettings: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const name of ["CRON_SECRET", "DATABASE_URL", "KEEP_ALIVE_DATABASE_URL"]) {
    originalSettings[name] = process.env[name];
  }
  process.env.CRON_SECRET = secret;
  process.env.DATABASE_URL = databaseUrl;
  process.env.KEEP_ALIVE_DATABASE_URL = databaseUrl;
});

afterEach(() => {
  mock.restoreAll();
  for (const [name, value] of Object.entries(originalSettings)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function request(): Request {
  return new Request("https://wedding.example/api/cron/database-health", {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

test("HTTP cron enforces authentication, executes uncached probes and rejects unsupported methods", {
  skip: !httpBaseUrl,
}, async () => {
  assert.ok(httpSecret, "CRON_SECRET must match the isolated HTTP test server.");
  const url = `${httpBaseUrl}/api/cron/database-health`;
  const invalidHeaders: HeadersInit[] = [{}, { Authorization: "Bearer incorrect" }];
  for (const headers of invalidHeaders) {
    const response = await fetch(url, { headers });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("set-cookie"), null);
  }

  const headers = { Authorization: `Bearer ${httpSecret}` };
  for (let run = 0; run < 2; run++) {
    const response = await fetch(url, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.data.status, "ok");
    assert.deepEqual(body.data.databases, { primary: "ok", development: "ok" });
  }

  const unsupported = await fetch(url, { method: "POST", headers });
  assert.equal(unsupported.status, 405);
});

test("real Prisma probes succeed repeatedly and release every dedicated pool", async () => {
  const close = mock.method(pg.Pool.prototype, "end");
  for (let run = 0; run < 2; run++) {
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.data.status, "ok");
    assert.deepEqual(body.data.databases, { primary: "ok", development: "ok" });
  }
  assert.equal(close.mock.callCount(), 4);
});

test("a real refused connection is isolated, sanitized and closed for either target", async () => {
  const close = mock.method(pg.Pool.prototype, "end");
  const log = mock.method(console, "error", () => {});
  for (const failed of ["DATABASE_URL", "KEEP_ALIVE_DATABASE_URL"] as const) {
    process.env.DATABASE_URL = databaseUrl;
    process.env.KEEP_ALIVE_DATABASE_URL = databaseUrl;
    process.env[failed] = unreachableUrl;
    const response = await GET(request());
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.deepEqual(JSON.parse(body).data.databases, {
      primary: failed === "DATABASE_URL" ? "unavailable" : "ok",
      development: failed === "KEEP_ALIVE_DATABASE_URL" ? "unavailable" : "ok",
    });
    assert.ok(!body.includes(unreachableUrl));
    assert.ok(!body.includes("private-test-password"));
  }
  assert.equal(close.mock.callCount(), 4);
  const logged = JSON.stringify(log.mock.calls.map((call) => call.arguments));
  assert.ok(!logged.includes(unreachableUrl));
  assert.ok(!logged.includes("private-test-password"));
});

test("a stalled connection times out and releases its pool instead of hanging the cron", {
  timeout: 15_000,
}, async () => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const stalledUrl = `postgresql://health:private-test-password@127.0.0.1:${address.port}/postgres`;
  const close = mock.method(pg.Pool.prototype, "end");
  const started = performance.now();

  try {
    await assert.rejects(databaseHealthRepository.check(stalledUrl));
    const elapsed = performance.now() - started;
    assert.ok(elapsed >= databaseHealthTimeoutMs - 500);
    assert.ok(elapsed < databaseHealthTimeoutMs + 5_000);
    assert.equal(close.mock.callCount(), 1);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

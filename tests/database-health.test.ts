import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, mock, test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { GET, maxDuration } from "@/app/api/cron/database-health/route";
import { ApiErrorCode } from "@/lib/api/types";
import { databaseHealthRepository } from "@/server/features/health/database-health.repository";
import { databaseHealthService } from "@/server/features/health/database-health.service";

const settings = {
  CRON_SECRET: "test-cron-secret-with-at-least-32-characters",
  DATABASE_URL: "postgresql://primary:private-password@production.invalid/postgres",
  KEEP_ALIVE_DATABASE_URL: "postgresql://development:other-password@development.invalid/postgres",
};
const originalSettings: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const [name, value] of Object.entries(settings)) {
    originalSettings[name] = process.env[name];
    process.env[name] = value;
  }
});

afterEach(() => {
  mock.restoreAll();
  for (const [name, value] of Object.entries(originalSettings)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function request(authorization?: string): Request {
  const headers: HeadersInit = authorization ? { authorization } : {};
  return new Request("https://wedding.example/api/cron/database-health", { headers });
}

function authorizedRequest(): Request {
  return request(`Bearer ${settings.CRON_SECRET}`);
}

function assertPrivate(response: Response): void {
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("set-cookie"), null);
}

test("cron rejects missing, forged, malformed and query-string credentials before database access", async () => {
  const check = mock.method(databaseHealthService, "check", async () => {
    throw new Error("Unexpected database access");
  });
  const invalidHeaders: (string | undefined)[] = [
    undefined,
    "Bearer wrong-secret",
    settings.CRON_SECRET,
    `Basic ${settings.CRON_SECRET}`,
    `bearer ${settings.CRON_SECRET}`,
    `Bearer  ${settings.CRON_SECRET}`,
    `Bearer ${settings.CRON_SECRET}, Bearer wrong-secret`,
  ];
  const queryRequest = new Request(
    `https://wedding.example/api/cron/database-health?secret=${settings.CRON_SECRET}`,
    { headers: { "user-agent": "vercel-cron/1.0", "x-api-key": settings.CRON_SECRET } },
  );
  const requests = [...invalidHeaders.map(request), queryRequest];

  for (const input of requests) {
    const response = await GET(input);
    assert.equal(response.status, 401);
    assertPrivate(response);
    assert.deepEqual(await response.json(), {
      error: { code: ApiErrorCode.Unauthorized, message: "A valid cron secret is required." },
    });
  }
  assert.equal(check.mock.callCount(), 0);
});

test("unset, empty and whitespace cron secrets fail closed even without database configuration", async () => {
  const check = mock.method(databaseHealthService, "check");
  delete process.env.DATABASE_URL;
  delete process.env.KEEP_ALIVE_DATABASE_URL;

  for (const secret of [undefined, "", "   "]) {
    if (secret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = secret;
    const response = await GET(request(`Bearer ${secret}`));
    assert.equal(response.status, 401);
    assertPrivate(response);
  }
  assert.equal(check.mock.callCount(), 0);
});

test("an authorized cron checks both databases on every invocation and exposes only health metadata", async () => {
  const check = mock.method(databaseHealthRepository, "check", async () => {});
  const log = mock.method(console, "error", () => {});

  for (let run = 0; run < 2; run++) {
    const response = await GET(authorizedRequest());
    assert.equal(response.status, 200);
    assertPrivate(response);
    const body = await response.json();
    assert.equal(body.data.status, "ok");
    assert.deepEqual(body.data.databases, { primary: "ok", development: "ok" });
    assert.ok(Number.isFinite(Date.parse(body.data.timestamp)));
    assert.deepEqual(Object.keys(body.data).sort(), ["databases", "status", "timestamp"]);
    for (const value of Object.values(settings)) assert.ok(!JSON.stringify(body).includes(value));
  }
  assert.deepEqual(
    check.mock.calls.map((call) => call.arguments[0]),
    [
      settings.DATABASE_URL,
      settings.KEEP_ALIVE_DATABASE_URL,
      settings.DATABASE_URL,
      settings.KEEP_ALIVE_DATABASE_URL,
    ],
  );
  assert.equal(log.mock.callCount(), 0);
});

test("either or both database failures return 503 while still checking the other target", async () => {
  let failing: Set<string> = new Set();
  const check = mock.method(databaseHealthRepository, "check", async (url: string) => {
    if (failing.has(url)) throw new Error(`Driver failure containing ${url}`);
  });
  const log = mock.method(console, "error", () => {});
  const cases = [
    { urls: [settings.DATABASE_URL], primary: "unavailable", development: "ok" },
    { urls: [settings.KEEP_ALIVE_DATABASE_URL], primary: "ok", development: "unavailable" },
    {
      urls: [settings.DATABASE_URL, settings.KEEP_ALIVE_DATABASE_URL],
      primary: "unavailable",
      development: "unavailable",
    },
  ];

  for (const scenario of cases) {
    failing = new Set(scenario.urls);
    const count = check.mock.callCount();
    const response = await GET(authorizedRequest());
    assert.equal(response.status, 503);
    assertPrivate(response);
    const body = await response.json();
    assert.equal(body.data.status, "degraded");
    assert.deepEqual(body.data.databases, {
      primary: scenario.primary,
      development: scenario.development,
    });
    assert.equal(check.mock.callCount() - count, 2);
  }
  const logged = JSON.stringify(log.mock.calls.map((call) => call.arguments));
  for (const value of Object.values(settings)) assert.ok(!logged.includes(value));
  assert.equal(log.mock.callCount(), 4);
});

test("missing and blank connection strings cannot silently report success or skip a healthy peer", async () => {
  const check = mock.method(databaseHealthRepository, "check", async () => {});
  mock.method(console, "error", () => {});

  for (const absent of [undefined, "", "   "]) {
    for (const missing of ["DATABASE_URL", "KEEP_ALIVE_DATABASE_URL"] as const) {
      process.env.DATABASE_URL = settings.DATABASE_URL;
      process.env.KEEP_ALIVE_DATABASE_URL = settings.KEEP_ALIVE_DATABASE_URL;
      if (absent === undefined) delete process.env[missing];
      else process.env[missing] = absent;
      const count = check.mock.callCount();
      const response = await GET(authorizedRequest());
      assert.equal(response.status, 503);
      assertPrivate(response);
      const body = await response.json();
      assert.equal(body.data.status, "degraded");
      assert.deepEqual(body.data.databases, {
        primary: missing === "DATABASE_URL" ? "unconfigured" : "ok",
        development: missing === "KEEP_ALIVE_DATABASE_URL" ? "unconfigured" : "ok",
      });
      assert.equal(check.mock.callCount() - count, 1);
    }
  }

  delete process.env.DATABASE_URL;
  delete process.env.KEEP_ALIVE_DATABASE_URL;
  const count = check.mock.callCount();
  const response = await GET(authorizedRequest());
  assert.equal(response.status, 503);
  assert.deepEqual((await response.json()).data.databases, {
    primary: "unconfigured",
    development: "unconfigured",
  });
  assert.equal(check.mock.callCount(), count);
});

test("both checks start independently and the response waits for both outcomes", async () => {
  const started: string[] = [];
  const releases: (() => void)[] = [];
  mock.method(databaseHealthRepository, "check", (url: string) => {
    started.push(url);
    return new Promise<void>((resolve) => releases.push(resolve));
  });
  let completed = false;
  const result = GET(authorizedRequest()).then((response) => {
    completed = true;
    return response;
  });
  assert.deepEqual(started, [settings.DATABASE_URL, settings.KEEP_ALIVE_DATABASE_URL]);
  releases[1]();
  await setImmediate();
  assert.equal(completed, false);
  releases[0]();
  const response = await result;
  assert.equal(response.status, 200);
});

test("unexpected failures and non-Error rejections are sanitized", async () => {
  const log = mock.method(console, "error", () => {});
  mock.method(databaseHealthRepository, "check", () => Promise.reject(settings.DATABASE_URL));
  const degraded = await GET(authorizedRequest());
  assert.equal(degraded.status, 503);

  mock.method(databaseHealthService, "check", async () => {
    throw new Error(settings.CRON_SECRET);
  });
  const response = await GET(authorizedRequest());
  assert.equal(response.status, 503);
  assertPrivate(response);
  assert.deepEqual(await response.json(), {
    error: { code: ApiErrorCode.Unavailable, message: "Database health check is unavailable." },
  });
  const logged = JSON.stringify(log.mock.calls.map((call) => call.arguments));
  for (const value of Object.values(settings)) assert.ok(!logged.includes(value));
});

test("Vercel Schedules calls the protected endpoint daily with GET and replaces the legacy cron", async () => {
  const file = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
  const config = JSON.parse(file);
  assert.equal(config.crons, undefined);
  assert.deepEqual(config.schedules["database-health"], {
    path: "/api/cron/database-health",
    schedule: "0 6 * * *",
    requestMethod: "GET",
  });
  assert.equal(maxDuration, 30);
});

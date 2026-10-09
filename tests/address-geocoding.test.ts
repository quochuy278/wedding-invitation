import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { AddressGeocodingError } from "@/server/features/addresses/address.errors";
import { geoapifyService } from "@/server/features/addresses/geoapify.service";

const originalApiKey = process.env.GEOAPIFY_API_KEY;
const testApiKey = "geocoding-test-key";
const buildingResult = { lat: 51.5201601, lon: -0.1603064, result_type: "building" };

beforeEach(() => {
  process.env.GEOAPIFY_API_KEY = testApiKey;
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEOAPIFY_API_KEY;
  else process.env.GEOAPIFY_API_KEY = originalApiKey;
});

function hasReason(reason: AddressGeocodingError["reason"]): (error: unknown) => boolean {
  return (error: unknown): boolean =>
    error instanceof AddressGeocodingError && error.reason === reason;
}

test("Geoapify encodes the full address, avoids host-country bias and maps lat/lon correctly", async (context) => {
  const request = context.mock.method(globalThis, "fetch", async () =>
    Response.json({ results: [buildingResult] }),
  );
  const timeout = context.mock.method(AbortSignal, "timeout");
  const address = "  12 Nguyễn Du & Phố Huế\nHà Nội, Việt Nam  ";
  const coordinates = await geoapifyService.geocode(address);
  assert.deepEqual(coordinates, { latitude: 51.5201601, longitude: -0.1603064 });
  assert.equal(request.mock.callCount(), 1);
  const [url, options] = request.mock.calls[0].arguments;
  assert.ok(url instanceof URL);
  assert.equal(url.origin + url.pathname, "https://api.geoapify.com/v1/geocode/search");
  assert.equal(url.searchParams.get("text"), "12 Nguyễn Du & Phố Huế Hà Nội, Việt Nam");
  assert.equal(url.searchParams.get("apiKey"), testApiKey);
  assert.equal(url.searchParams.get("format"), "json");
  assert.equal(url.searchParams.get("limit"), "1");
  assert.equal(url.searchParams.get("bias"), "countrycode:none");
  assert.equal(options?.cache, "no-store");
  assert.equal(options?.redirect, "error");
  assert.ok(options?.signal instanceof AbortSignal);
  assert.equal(timeout.mock.calls[0].arguments[0], 8_000);
});

test("geocoding accepts zero coordinates and bounded street or amenity locations", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  for (const result_type of ["building", "street", "amenity"]) {
    request.mock.mockImplementation(async () =>
      Response.json({ results: [{ lat: 0, lon: 0, result_type }] }),
    );
    assert.deepEqual(await geoapifyService.geocode("Venue"), { latitude: 0, longitude: 0 });
  }
  request.mock.mockImplementation(async () =>
    Response.json({ results: [{ lat: -90, lon: 180, result_type: "building" }] }),
  );
  assert.deepEqual(await geoapifyService.geocode("Venue"), { latitude: -90, longitude: 180 });
});

test("empty results and administrative fallbacks are reported without returning their coordinates", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  request.mock.mockImplementation(async () => Response.json({ results: [] }));
  await assert.rejects(geoapifyService.geocode("Unknown venue"), hasReason("notFound"));
  for (const result_type of ["city", "country", "state", "postcode", "unknown"]) {
    request.mock.mockImplementation(async () =>
      Response.json({ results: [{ ...buildingResult, result_type }] }),
    );
    await assert.rejects(geoapifyService.geocode("Unknown venue"), hasReason("notFound"));
  }
});

test("malformed provider responses and invalid coordinates are treated as unavailable", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  const invalidBodies = [
    null,
    {},
    { results: {} },
    { results: [null] },
    { results: [{ ...buildingResult, lat: "51.52" }] },
    { results: [{ ...buildingResult, lat: null }] },
    { results: [{ ...buildingResult, lat: 91 }] },
    { results: [{ ...buildingResult, lon: -181 }] },
    { results: [{ lat: 51.52, result_type: "building" }] },
  ];
  for (const body of invalidBodies) {
    request.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(geoapifyService.geocode("Venue"), hasReason("unavailable"));
  }
  request.mock.mockImplementation(async () => new Response("not-json", { status: 200 }));
  await assert.rejects(geoapifyService.geocode("Venue"), hasReason("unavailable"));
});

test("rate limits and HTTP failures do not expose the provider body or API key", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  for (const status of [401, 403, 429, 500, 503]) {
    request.mock.mockImplementation(async () => new Response(testApiKey, { status }));
    await assert.rejects(geoapifyService.geocode("Venue"), (error: unknown): boolean => {
      assert.ok(error instanceof AddressGeocodingError);
      assert.equal(error.reason, "unavailable");
      assert.ok(!error.message.includes(testApiKey));
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test("timeouts and network failures become sanitized geocoding errors", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  for (const failure of [
    new DOMException("Timed out", "TimeoutError"),
    new Error(`Fetch failed at https://api.geoapify.com/?apiKey=${testApiKey}`),
  ]) {
    request.mock.mockImplementation(async () => {
      throw failure;
    });
    await assert.rejects(geoapifyService.geocode("Venue"), (error: unknown): boolean => {
      assert.ok(error instanceof AddressGeocodingError);
      assert.equal(error.reason, "unavailable");
      assert.ok(!error.message.includes(testApiKey));
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test("missing configuration fails before making a provider request", async (context) => {
  const request = context.mock.method(globalThis, "fetch");
  for (const apiKey of [undefined, "", "   "]) {
    if (apiKey === undefined) delete process.env.GEOAPIFY_API_KEY;
    else process.env.GEOAPIFY_API_KEY = apiKey;
    await assert.rejects(geoapifyService.geocode("Venue"), hasReason("unavailable"));
  }
  assert.equal(request.mock.callCount(), 0);
});

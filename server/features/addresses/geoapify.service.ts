import "server-only";

import { isRecord } from "@/server/shared/validation/schema";
import { AddressGeocodingError } from "./address.errors";

export type AddressCoordinates = {
  latitude: number;
  longitude: number;
};

const supportedResultTypes = new Set(["building", "amenity", "street"]);
const requestTimeoutMs = 8_000;

function parseCoordinates(value: unknown): AddressCoordinates {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new AddressGeocodingError("unavailable");
  }
  if (value.results.length === 0) throw new AddressGeocodingError("notFound");
  const result: unknown = value.results[0];
  if (!isRecord(result)) throw new AddressGeocodingError("unavailable");
  const latitude = result.lat;
  const longitude = result.lon;
  const validCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  if (!validCoordinates) throw new AddressGeocodingError("unavailable");
  const specificLocation =
    typeof result.result_type === "string" && supportedResultTypes.has(result.result_type);
  if (!specificLocation) throw new AddressGeocodingError("notFound");
  return { latitude, longitude };
}

export const geoapifyService = {
  async geocode(addressText: string): Promise<AddressCoordinates> {
    const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
    if (!apiKey) throw new AddressGeocodingError("unavailable");
    const url = new URL("https://api.geoapify.com/v1/geocode/search");
    url.searchParams.set("text", addressText.trim().replace(/\s+/g, " "));
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    // Hosting region must not bias a venue search towards the server's country.
    url.searchParams.set("bias", "countrycode:none");
    url.searchParams.set("apiKey", apiKey);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (!response.ok) throw new AddressGeocodingError("unavailable");
      const body: unknown = await response.json();
      return parseCoordinates(body);
    } catch (error: unknown) {
      if (error instanceof AddressGeocodingError) throw error;
      // Never propagate a provider error that might contain the API key or URL.
      throw new AddressGeocodingError("unavailable");
    }
  },
};

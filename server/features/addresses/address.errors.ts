import "server-only";

export class AddressGeocodingError extends Error {
  constructor(public readonly reason: "notFound" | "unavailable") {
    super("Address coordinates could not be resolved.");
    this.name = "AddressGeocodingError";
  }
}

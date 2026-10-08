import "server-only";

import { textField, timestampField } from "@/server/shared/validation/fields";
import {
  isRecord,
  type ParseResult,
  type ValidationError,
} from "@/server/shared/validation/schema";
import {
  type CreateAddressInput,
  type LocationType,
  locationTypes,
} from "@/shared/contracts/address";

function coordinateField(
  value: Record<string, unknown>,
  field: string,
  maximum: number,
  errors: ValidationError[],
): number | null {
  const coordinate = value[field];
  if (coordinate === undefined || coordinate === null) return null;
  const invalid =
    typeof coordinate !== "number" ||
    !Number.isFinite(coordinate) ||
    Math.abs(coordinate) > maximum;
  if (invalid) {
    errors.push({ field, message: `Must be a finite number between -${maximum} and ${maximum}.` });
    return null;
  }
  return coordinate;
}

function isLocationType(value: string): value is LocationType {
  return locationTypes.some((locationType) => locationType === value);
}

export function parseCreateAddressInput(value: unknown): ParseResult<CreateAddressInput> {
  if (!isRecord(value))
    return { success: false, errors: [{ field: "body", message: "Must be a JSON object." }] };
  const errors: ValidationError[] = [];
  const name = textField(value, "name", errors, 200);
  const addressText = textField(value, "addressText", errors, 2000);
  const addressLine1 = textField(value, "addressLine1", errors, 300);
  const addressLine2 = textField(value, "addressLine2", errors, 300, false) || null;
  const locationType = textField(value, "locationType", errors, 40);
  const postalCode = textField(value, "postalCode", errors, 32);
  const city = textField(value, "city", errors, 150);
  const region = textField(value, "region", errors, 150, false) || null;
  const country = textField(value, "country", errors, 150);
  const instructions = textField(value, "instructions", errors, 2000, false) || null;
  const floor = textField(value, "floor", errors, 100, false) || null;
  const entrance = textField(value, "entrance", errors, 200, false) || null;
  const latitude = coordinateField(value, "latitude", 90, errors);
  const longitude = coordinateField(value, "longitude", 180, errors);
  const eventAt = timestampField(value, "eventAt", errors);
  const eventTimeZone = textField(value, "eventTimeZone", errors, 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone: eventTimeZone });
  } catch {
    errors.push({ field: "eventTimeZone", message: "Must be a valid IANA time zone." });
  }
  const hasCoordinatePair = (latitude === null) === (longitude === null);
  if (!hasCoordinatePair) {
    errors.push({
      field: "latitude",
      message: "Latitude and longitude must be supplied together.",
    });
    errors.push({
      field: "longitude",
      message: "Latitude and longitude must be supplied together.",
    });
  }
  if (!isLocationType(locationType)) {
    errors.push({ field: "locationType", message: "Unknown location type." });
    return { success: false, errors };
  }
  if (errors.length > 0) return { success: false, errors };
  return {
    success: true,
    data: {
      name,
      addressText,
      addressLine1,
      addressLine2,
      locationType,
      postalCode,
      city,
      region,
      country,
      instructions,
      floor,
      entrance,
      latitude,
      longitude,
      eventAt,
      eventTimeZone,
    },
  };
}

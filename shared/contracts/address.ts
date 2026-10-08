export const locationTypes = [
  "building",
  "hotel",
  "restaurant",
  "house",
  "eventVenue",
  "other",
] as const;

export type LocationType = (typeof locationTypes)[number];

export type CreateAddressInput = {
  name: string;
  addressText: string;
  addressLine1: string;
  addressLine2: string | null;
  locationType: LocationType;
  postalCode: string;
  city: string;
  region: string | null;
  country: string;
  instructions: string | null;
  floor: string | null;
  entrance: string | null;
  latitude: number | null;
  longitude: number | null;
  eventAt: string;
  eventTimeZone: string;
};

// Existing venues retain their original addressText when structured fields are absent.
export type AddressDto = Omit<
  CreateAddressInput,
  "addressLine1" | "locationType" | "postalCode" | "city" | "country" | "eventTimeZone"
> & {
  id: string;
  addressLine1: string | null;
  locationType: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  eventTimeZone: string | null;
};

export type AddressListDto = { items: AddressDto[] };

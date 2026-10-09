import "server-only";

import type { Address } from "@/generated/prisma/client";
import type { AddressDto, AddressListDto, CreateAddressInput } from "@/shared/contracts/address";
import { addressRepository } from "./address.repository";
import { geoapifyService } from "./geoapify.service";

export function toAddressDto(address: Address): AddressDto {
  return {
    id: address.id,
    name: address.name,
    addressText: address.address_text,
    addressLine1: address.address_line_1,
    addressLine2: address.address_line_2,
    locationType: address.location_type,
    postalCode: address.postal_code,
    city: address.city,
    region: address.region,
    country: address.country,
    instructions: address.instructions,
    floor: address.floor,
    entrance: address.entrance,
    latitude: address.latitude,
    longitude: address.longitude,
    eventAt: address.event_at.toISOString(),
    eventTimeZone: address.event_time_zone,
  };
}

export const addressService = {
  async list(): Promise<AddressListDto> {
    const addresses = await addressRepository.list();
    const items = addresses.map(toAddressDto);
    return { items };
  },
  async create(input: CreateAddressInput): Promise<AddressDto> {
    const hasCoordinates = input.latitude !== null && input.longitude !== null;
    const coordinates = hasCoordinates
      ? { latitude: input.latitude, longitude: input.longitude }
      : await geoapifyService.geocode(input.addressText);
    const data = {
      name: input.name,
      address_text: input.addressText,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2,
      location_type: input.locationType,
      postal_code: input.postalCode,
      city: input.city,
      region: input.region,
      country: input.country,
      instructions: input.instructions,
      floor: input.floor,
      entrance: input.entrance,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      event_at: new Date(input.eventAt),
      event_time_zone: input.eventTimeZone,
    };
    const address = await addressRepository.create(data);
    return toAddressDto(address);
  },
};

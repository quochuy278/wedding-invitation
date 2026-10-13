import type { AddressDto } from "@/shared/contracts/address";

export function addressMapUrl(address: Pick<AddressDto, "latitude" | "longitude">): string | null {
  const { latitude, longitude } = address;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  const query = `${latitude},${longitude}`;
  const parameters = new URLSearchParams({ api: "1", query });
  return `https://www.google.com/maps/search/?${parameters}`;
}

export function addressDisplayLines(
  address: Pick<AddressDto, "addressText" | "addressLine2">,
): string[] {
  const fullAddress = address.addressText.trim();
  const detail = address.addressLine2?.trim();
  const normalize = (text: string): string => text.toLocaleLowerCase("vi").replace(/\s+/g, " ");
  const hasSeparateDetail = detail && !normalize(fullAddress).includes(normalize(detail));
  return hasSeparateDetail ? [fullAddress, detail] : [fullAddress];
}

import type { AddressDto } from "@/shared/contracts/address";

export function addressMapUrl(address: Pick<AddressDto, "name" | "addressText">): string | null {
  const name = address.name.trim().replace(/\s+/g, " ");
  const fullAddress = address.addressText.trim().replace(/\s+/g, " ");
  if (!name || !fullAddress) return null;
  const query = `${name}, ${fullAddress}`;
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

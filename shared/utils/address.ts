import type { AddressDto } from "@/shared/contracts/address";

export function addressDisplayLines(
  address: Pick<AddressDto, "addressText" | "addressLine2">,
): string[] {
  const fullAddress = address.addressText.trim();
  const detail = address.addressLine2?.trim();
  const normalize = (text: string): string => text.toLocaleLowerCase("vi").replace(/\s+/g, " ");
  const hasSeparateDetail = detail && !normalize(fullAddress).includes(normalize(detail));
  return hasSeparateDetail ? [fullAddress, detail] : [fullAddress];
}

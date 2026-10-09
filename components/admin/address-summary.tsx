import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import type { AddressDto } from "@/shared/contracts/address";
import { addressDisplayLines } from "@/shared/utils/address";

export function AddressSummary({ address }: { address: AddressDto }): ReactElement {
  const t = useTranslations("Admin.addresses");
  const addressLines = addressDisplayLines(address);
  const floor = address.floor ? t("floorValue", { value: address.floor }) : null;
  const entrance = address.entrance ? t("entranceValue", { value: address.entrance }) : null;
  const access = [floor, entrance].filter(Boolean).join(" · ");
  const timeZone = address.eventTimeZone ?? "Asia/Ho_Chi_Minh";
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  };
  const eventAt = new Date(address.eventAt).toLocaleString("vi-VN", dateOptions);
  const hasCoordinates = address.latitude !== null && address.longitude !== null;
  const coordinates = hasCoordinates ? `${address.latitude}, ${address.longitude}` : null;
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{address.name}</p>
      {addressLines.map((line) => (
        <p key={line} className="whitespace-pre-line text-muted-foreground">
          {line}
        </p>
      ))}
      {access && <p>{access}</p>}
      {address.instructions && <p className="whitespace-pre-line">{address.instructions}</p>}
      <p>
        <time dateTime={address.eventAt}>{eventAt}</time> · {timeZone}
      </p>
      {coordinates && <p className="text-muted-foreground">{coordinates}</p>}
    </div>
  );
}

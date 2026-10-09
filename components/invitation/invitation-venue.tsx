import Image from "next/image";
import { useTranslations } from "next-intl";
import venueGardenImage from "@/public/assets/images/illustration-venue-garden.png";
import type { AddressDto } from "@/shared/contracts/address";
import { addressDisplayLines } from "@/shared/utils/address";
import { HeartDivider } from "./heart-divider";
import { InvitationButton } from "./invitation-button";
import { LocationPinIcon } from "./invitation-icons";

export function InvitationVenue({ venue }: { venue: AddressDto }) {
  const t = useTranslations("Invitation.venue");
  const hasCoordinates = venue.latitude !== null && venue.longitude !== null;
  const mapQuery = hasCoordinates ? `${venue.latitude},${venue.longitude}` : venue.addressText;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const addressLines = addressDisplayLines(venue);
  const floor = venue.floor ? t("floor", { value: venue.floor }) : null;
  const entrance = venue.entrance ? t("entrance", { value: venue.entrance }) : null;
  const access = [floor, entrance].filter(Boolean).join(" · ");

  return (
    <section
      id="venue"
      className="mx-auto grid w-[calc(100%-40px)] max-w-5xl items-center gap-1 pt-3 pb-9 sm:min-h-[280px] sm:w-[calc(100%-64px)] sm:grid-cols-[1.12fr_1fr] sm:gap-5 sm:py-1"
      aria-labelledby="venue-heading"
    >
      <div className="relative -mx-3 sm:-my-4 sm:-ml-6">
        <div
          className="absolute inset-0 -z-10 rounded-[44%_56%_39%_61%] bg-[radial-gradient(ellipse_at_center,#eab8a447,transparent_70%)]"
          aria-hidden="true"
        />
        <Image
          src={venueGardenImage}
          alt={t("imageAlt")}
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 55vw, 550px"
          className="h-auto w-full mix-blend-multiply brightness-[1.04] contrast-[1.2]"
          loading="eager"
        />
      </div>
      <div className="text-center">
        <h2
          id="venue-heading"
          className="font-heading text-[21px] font-normal text-wedding-wine uppercase sm:text-[23px]"
        >
          {t("heading")}
        </h2>
        <HeartDivider />
        <h3 className="mt-3 mb-1 font-heading text-[27px] font-normal text-wedding-wine sm:text-[clamp(23px,2.8vw,29px)]">
          {venue.name}
        </h3>
        <address className="mb-4 space-y-1 whitespace-pre-line text-[15px] leading-[1.5] not-italic lg:text-[17px]">
          {addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {access && <p>{access}</p>}
          {venue.instructions && <p>{venue.instructions}</p>}
        </address>
        <InvitationButton
          nativeButton={false}
          render={<a href={mapUrl} target="_blank" rel="noopener noreferrer" />}
          leadingIcon={<LocationPinIcon className="[&_img]:brightness-0 [&_img]:invert" />}
          className="min-w-[230px] gap-4"
        >
          {t("viewMap")}
        </InvitationButton>
      </div>
    </section>
  );
}

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import type { InvitationScheduleEvent } from "@/lib/dummy-invitation";
import { cn } from "@/lib/utils";
import cakeImage from "@/public/assets/icons/cake-heart.png";
import champagneImage from "@/public/assets/icons/champagne-glasses.png";
import envelopeImage from "@/public/assets/icons/envelope-heart.png";
import locationPinImage from "@/public/assets/icons/location-pin-heart.png";
import { Botanical } from "./invitation-decorations";

type IconProps = { className?: string };

export function InvitationArrowIcon({ className }: IconProps) {
  return (
    <ChevronRight strokeWidth={1.2} className={cn("size-[19px]", className)} aria-hidden="true" />
  );
}

export function LocationPinIcon({ className }: IconProps) {
  return (
    <span className={cn("relative size-5 shrink-0 overflow-hidden", className)} aria-hidden="true">
      <Image
        src={locationPinImage}
        alt=""
        sizes="32px"
        className="absolute top-1/2 left-1/2 size-8 max-w-none -translate-x-1/2 -translate-y-1/2"
      />
    </span>
  );
}

export function EnvelopeIllustration({ className }: IconProps) {
  return (
    <div className={cn("relative h-[100px] w-[115px] shrink-0", className)} aria-hidden="true">
      <Botanical className="absolute top-0 -left-1 z-10 h-[105px] w-11 -rotate-[30deg]" />
      <Image
        src={envelopeImage}
        alt=""
        sizes="150px"
        className="absolute -top-5 -left-2 size-[140px] max-w-none -rotate-[17deg]"
      />
    </div>
  );
}

function DinnerIcon() {
  return (
    <div className="relative h-[55px] w-[76px]" aria-hidden="true">
      <svg
        viewBox="0 0 76 55"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        className="h-full w-full"
        aria-hidden="true"
      >
        <circle cx="38" cy="27" r="18" />
        <circle cx="38" cy="27" r="13" />
        <path d="M9 7v12m4-12v12m4-12v12M9 16h8v5c0 4-8 4-8 0ZM13 25v24M65 7c-5 5-5 20 0 20V7Zm0 20v22" />
      </svg>
    </div>
  );
}

const scheduleImages = { champagne: champagneImage, cake: cakeImage };

export function ScheduleIcon({ name }: { name: InvitationScheduleEvent["icon"] }) {
  return name === "dinner" ? (
    <DinnerIcon />
  ) : (
    <Image
      src={scheduleImages[name]}
      alt=""
      sizes="110px"
      className="size-[108px] max-w-none object-contain"
    />
  );
}

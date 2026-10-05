import Image from "next/image";
import { cn } from "@/lib/utils";
import dividerHeartImage from "@/public/assets/images/divider-heart.png";

export function HeartDivider({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={cn(
        "relative mx-auto my-2 h-5 overflow-hidden mix-blend-multiply",
        wide ? "w-48" : "w-28",
      )}
      aria-hidden="true"
    >
      <Image
        src={dividerHeartImage}
        alt=""
        sizes={wide ? "300px" : "250px"}
        className={cn(
          "absolute top-1/2 left-1/2 h-auto max-w-none -translate-x-1/2 -translate-y-1/2 mix-blend-multiply brightness-110 contrast-125",
          wide ? "w-[300px]" : "w-[250px]",
        )}
      />
    </div>
  );
}

export function InvitationHeartIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative inline-block size-4 overflow-hidden align-middle", className)}
      aria-hidden="true"
    >
      <Image
        src={dividerHeartImage}
        alt=""
        sizes="280px"
        className="absolute top-1/2 left-1/2 h-auto w-[280px] max-w-none -translate-x-1/2 -translate-y-1/2 mix-blend-multiply brightness-110 contrast-125"
      />
    </span>
  );
}

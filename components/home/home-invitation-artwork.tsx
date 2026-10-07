import { Heart } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Botanical } from "@/components/invitation/invitation-decorations";
import ribbonBowImage from "@/public/assets/images/ornament-ribbon-bow.png";

export function HomeInvitationArtwork() {
  const t = useTranslations("HomePage.artwork");
  const couple = useTranslations("Invitation.couple");

  return (
    <div className="relative hidden h-[470px] w-full md:block" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 bottom-7 rounded-t-full border border-wedding-warm-beige/35" />
      <div className="absolute inset-4 rounded-t-full bg-[radial-gradient(ellipse_at_50%_55%,#e8c1c34d,transparent_70%)]" />
      <Botanical className="absolute bottom-12 -left-4 h-52 w-24 -rotate-[28deg] opacity-55" />
      <Botanical className="absolute top-7 right-0 h-44 w-20 rotate-[27deg] opacity-40" />

      <div className="absolute inset-x-[12%] top-10 flex h-[310px] -rotate-[7deg] flex-col items-center rounded-t-[140px] border border-wedding-warm-beige/45 bg-[#fffaf4] px-4 pt-6 text-center shadow-[0_12px_40px_#72554712]">
        <Image
          src={ribbonBowImage}
          alt=""
          sizes="96px"
          className="mb-2 h-auto w-24 mix-blend-multiply brightness-110 contrast-125"
          preload
        />
        <p className="font-label text-[9px] tracking-[0.2em] text-wedding-soft-brown uppercase">
          {t("eyebrow")}
        </p>
        <p className="mt-3 font-heading text-[clamp(27px,3.6vw,46px)] leading-tight tracking-[-0.04em] whitespace-nowrap text-wedding-wine">
          {couple("groom")}
          <span className="mx-2 text-[30px] italic">&</span>
          {couple("bride")}
        </p>
      </div>

      <div className="absolute inset-x-[5%] bottom-14 h-[170px] rotate-[3deg] overflow-hidden rounded-b-lg border border-[#cda6a0] bg-[#e5c4bc] shadow-[0_16px_35px_#7255471c]">
        <div className="absolute inset-0 bg-[#efd6cd] [clip-path:polygon(0_0,50%_65%,0_100%)]" />
        <div className="absolute inset-0 bg-[#e9cbc2] [clip-path:polygon(100%_0,50%_65%,100%_100%)]" />
        <div className="absolute inset-0 bg-[#f0d8cf] [clip-path:polygon(0_100%,50%_32%,100%_100%)]" />
        <div className="absolute top-12 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#8a2638] bg-wedding-wine text-wedding-cream shadow-md">
          <Heart className="size-5" strokeWidth={1.3} />
        </div>
      </div>

      <p className="absolute inset-x-0 bottom-0 text-center text-sm text-wedding-soft-brown italic">
        {t("caption")}
      </p>
    </div>
  );
}

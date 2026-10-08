import Image from "next/image";
import { useTranslations } from "next-intl";
import ribbonBowImage from "@/public/assets/images/ornament-ribbon-bow.png";
import { HeartDivider, InvitationHeartIcon } from "./heart-divider";
import { InvitationButton } from "./invitation-button";
import { Botanical } from "./invitation-decorations";

type HeroInvitation = { date: string; displayDate: string; guestName: string };

export function InvitationHero({ invitation }: { invitation: HeroInvitation }) {
  const t = useTranslations("Invitation.hero");
  const couple = useTranslations("Invitation.couple");

  return (
    <section
      id="home"
      className="mx-auto grid w-[calc(100%-40px)] max-w-5xl items-center pt-7 pb-3 sm:min-h-[355px] sm:w-[calc(100%-64px)] sm:grid-cols-2 sm:pt-4 sm:pb-8"
      aria-labelledby="couple-names"
    >
      <div className="relative text-center">
        <p className="mb-2 font-label text-[10px] tracking-[0.3em] text-wedding-wine uppercase sm:text-[11px]">
          {t("eyebrow")}
        </p>
        <h1
          id="couple-names"
          className="font-heading text-[clamp(46px,12vw,68px)] leading-[1.3] font-normal tracking-[-0.065em] whitespace-nowrap text-wedding-wine sm:text-[clamp(43px,6.3vw,73px)]"
        >
          {couple("groom")} <span className="mx-1 italic">&</span> {couple("bride")}
        </h1>
        <HeartDivider wide />
        <time
          className="mb-4 block font-label text-[27px] tracking-[0.18em] text-wedding-wine"
          dateTime={invitation.date}
        >
          {invitation.displayDate}
        </time>
        <p className="mb-4 text-base font-medium">{t("guest", { name: invitation.guestName })}</p>
        <InvitationButton id="rsvp">{t("rsvp")}</InvitationButton>
        <p className="mt-3 text-[14px] leading-[1.5] sm:text-[15px]">
          {t("welcomeLineOne")}
          <br />
          {t("welcomeLineTwo")}
        </p>
      </div>
      <HeroArtwork />
    </section>
  );
}

function HeroArtwork() {
  const t = useTranslations("Invitation.hero");
  const couple = useTranslations("Invitation.couple");

  return (
    <div
      className="relative mx-auto mt-4 h-[290px] w-full max-w-[400px] text-wedding-wine sm:mt-0 sm:h-[330px] sm:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute -inset-3 -z-10 rounded-[44%_56%_39%_61%/60%_45%_55%_40%] bg-[radial-gradient(ellipse_at_45%_40%,#eab8a44d,transparent_66%),radial-gradient(ellipse_at_75%_65%,#f0c7b447,transparent_60%)]" />
      <div className="absolute top-2 left-[28%] font-heading text-[115px] leading-[1.1] sm:text-[135px]">
        <span>{couple("groom").charAt(0)}</span>
        <span className="absolute top-[52px] left-[65px] sm:top-[57px] sm:left-[70px]">
          {couple("bride").charAt(0)}
        </span>
      </div>
      <Botanical className="absolute top-[105px] left-[2%] h-28 w-12 -rotate-[53deg] sm:top-[120px] sm:h-32 sm:w-[61px]" />
      <Botanical className="absolute top-7 right-[9%] h-[150px] w-12 rotate-[33deg] sm:top-10 sm:right-[12%] sm:h-[171px] sm:w-16" />
      <Image
        src={ribbonBowImage}
        alt=""
        sizes="(max-width: 600px) 260px, 360px"
        className="absolute top-[135px] left-0 h-auto w-[70%] rotate-[8deg] mix-blend-multiply brightness-110 contrast-125 sm:top-[153px]"
        preload
      />
      <p className="absolute right-0 bottom-2 -rotate-12 text-center font-body text-[17px] leading-[1.4] italic mix-blend-multiply sm:right-[3%] sm:text-[19px]">
        {t("artworkLineOne")}
        <br />
        {t("artworkLineTwo")}
        <br />
        {t("artworkLineThree")} <InvitationHeartIcon />
      </p>
    </div>
  );
}

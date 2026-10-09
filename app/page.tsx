import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { HomeAuthLink } from "@/components/home/home-auth-link";
import { HomeInvitationArtwork } from "@/components/home/home-invitation-artwork";
import { InvitationCodeForm } from "@/components/home/invitation-code-form";
import { PaperTexture } from "@/components/invitation/invitation-decorations";
import ribbonBowImage from "@/public/assets/images/ornament-ribbon-bow.png";

export default function HomePage() {
  const t = useTranslations("HomePage");
  const couple = useTranslations("Invitation.couple");

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-clip bg-[#fbf7ef] font-body text-foreground">
      <PaperTexture />
      <a
        href="#home-content"
        className="absolute top-3 left-4 z-20 -translate-y-[200%] rounded-md bg-card px-4 py-2 text-wedding-wine focus:translate-y-0"
      >
        {t("skipToContent")}
      </a>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10 sm:py-8">
        <Link
          href="/"
          aria-label={t("brandAriaLabel")}
          className="flex items-center gap-3 rounded-sm text-wedding-wine outline-offset-4 focus-visible:outline-2 focus-visible:outline-wedding-dusty-rose"
        >
          <span className="relative block h-12 w-11 shrink-0 font-heading text-[33px] leading-none">
            <span>{couple("groom").charAt(0)}</span>
            <span className="absolute top-4 left-4 text-[29px]">{couple("bride").charAt(0)}</span>
          </span>
          <span className="hidden font-label text-[11px] tracking-[0.18em] uppercase sm:block">
            {couple("groom")} & {couple("bride")}
          </span>
        </Link>

        <HomeAuthLink />
      </header>

      <main
        id="home-content"
        className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 pt-6 pb-12 sm:px-10 md:grid-cols-[1fr_1fr] md:gap-16 md:py-14 lg:gap-24"
      >
        <HomeInvitationArtwork />

        <section aria-labelledby="home-heading" className="mx-auto w-full max-w-md">
          <Image
            src={ribbonBowImage}
            alt=""
            sizes="128px"
            className="mx-auto mb-6 h-auto w-32 mix-blend-multiply brightness-110 contrast-125 md:hidden"
          />
          <p className="mb-4 font-label text-[10px] tracking-[0.24em] text-wedding-wine uppercase sm:text-[11px]">
            {t("eyebrow")}
          </p>
          <h1
            id="home-heading"
            className="font-heading text-[clamp(36px,8.5vw,50px)] leading-[1.24] tracking-[-0.035em] text-wedding-wine"
          >
            {t("titleLineOne")}
            <br />
            <span className="italic">{t("titleLineTwo")}</span>
          </h1>
          <p className="mt-5 max-w-sm text-[14px] leading-7 text-muted-foreground sm:text-[15px]">
            {t("description")}
          </p>

          <InvitationCodeForm />

          <div className="mt-8 flex items-start gap-3 border-t border-wedding-warm-beige/35 pt-5">
            <Heart
              className="mt-1 size-4 shrink-0 text-wedding-dusty-rose"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-xs leading-6 text-muted-foreground">{t("help")}</p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-[calc(100%-48px)] max-w-[1072px] flex-col items-center justify-between gap-2 border-t border-wedding-warm-beige/35 py-5 text-center text-[11px] text-muted-foreground sm:w-[calc(100%-80px)] sm:flex-row sm:py-6 sm:text-left">
        <p className="font-label tracking-[0.12em]">
          {couple("groom")} <span className="px-1 text-wedding-dusty-rose">&</span>{" "}
          {couple("bride")}
        </p>
        <p className="italic">{t("footer")}</p>
      </footer>
    </div>
  );
}

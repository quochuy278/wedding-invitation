import { cn } from "cn";
import { ArrowLeft, CalendarDays, Clock3, Heart, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AddressDto } from "@/shared/contracts/address";
import type { InvitationTicketDto } from "@/shared/contracts/invitation";
import { PaperTexture } from "./invitation-decorations";
import styles from "./invitation-ticket.module.css";
import { TicketLiveMarker } from "./ticket-live-marker";

export function InvitationTicket({ ticket }: { ticket: InvitationTicketDto }) {
  const t = useTranslations("InvitationTicket");
  const couple = useTranslations("Invitation.couple");
  const home = useTranslations("HomePage");
  const { invitation, qrDataUrl } = ticket;
  const venue = invitation.address;
  const timeZone = venue.eventTimeZone ?? "Asia/Ho_Chi_Minh";
  const eventDate = new Date(venue.eventAt);
  const expiryDate = new Date(invitation.expiresAt);
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  const weekdayOptions: Intl.DateTimeFormatOptions = { timeZone, weekday: "long" };
  const expiryOptions: Intl.DateTimeFormatOptions = { ...dateOptions, ...timeOptions };
  const eventDay = new Intl.DateTimeFormat("vi-VN", dateOptions).format(eventDate);
  const eventTime = new Intl.DateTimeFormat("vi-VN", timeOptions).format(eventDate);
  const eventWeekday = new Intl.DateTimeFormat("vi-VN", weekdayOptions).format(eventDate);
  const expiry = new Intl.DateTimeFormat("vi-VN", expiryOptions).format(expiryDate);
  const expiryLabel = t("validUntil", { date: expiry });
  const invitationHref = `/invitation/${encodeURIComponent(invitation.code)}`;
  const qrAlt = t("qrAlt");
  const ticketClassName = cn(
    styles.ticketEntry,
    "overflow-hidden rounded-2xl border border-wedding-warm-beige/50 bg-[#fffdf8] shadow-[0_18px_60px_-30px_#7a102635]",
  );
  const heartClassName = cn(styles.heart, "size-8 shrink-0 text-wedding-blush sm:size-10");
  const qrFrameClassName = cn(styles.qrFrame, "w-60 max-w-full");

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-clip bg-[#fbf7ef] font-body text-foreground">
      <PaperTexture />
      <a
        href="#ticket-content"
        className="absolute top-3 left-4 z-20 -translate-y-[200%] rounded-md bg-card px-4 py-2 text-wedding-wine focus:translate-y-0"
      >
        {t("skipToContent")}
      </a>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-6 sm:px-8 sm:py-8">
        <Link
          href="/"
          aria-label={home("brandAriaLabel")}
          className="relative block h-12 w-11 shrink-0 font-heading text-[33px] leading-none text-wedding-wine outline-offset-4 focus-visible:outline-2 focus-visible:outline-wedding-dusty-rose"
        >
          <span>{couple("groom").charAt(0)}</span>
          <span className="absolute top-4 left-4 text-[29px]">{couple("bride").charAt(0)}</span>
        </Link>
        <Link
          href={invitationHref}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-wedding-wine/20 px-4 font-label text-xs text-wedding-wine transition-colors hover:bg-wedding-wine/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wedding-dusty-rose"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t("backToInvitation")}
        </Link>
      </header>

      <main
        id="ticket-content"
        className="mx-auto w-full max-w-5xl flex-1 px-5 pt-5 pb-12 sm:px-8 sm:pt-8"
      >
        <div className="mb-8 text-center sm:mb-10">
          <p className="mb-3 font-label text-[10px] tracking-[0.24em] text-wedding-dusty-rose uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="font-heading text-4xl leading-tight text-wedding-wine sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <article aria-labelledby="ticket-guest" className={ticketClassName}>
          <div className="flex items-center justify-between gap-4 bg-wedding-wine px-6 py-6 text-wedding-cream sm:px-9">
            <div>
              <p className="mb-2 font-label text-[9px] tracking-[0.2em] uppercase sm:text-[10px]">
                {t("celebration")}
              </p>
              <p className="font-heading text-3xl sm:text-4xl">
                {couple("groom")} <span className="italic">&</span> {couple("bride")}
              </p>
            </div>
            <Heart className={heartClassName} strokeWidth={1} aria-hidden="true" />
          </div>

          <div className="grid md:grid-cols-[1fr_300px]">
            <div className="min-w-0 px-6 py-7 sm:px-9 sm:py-9">
              <p className="mb-2 font-label text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                {t("guestLabel")}
              </p>
              <h2
                id="ticket-guest"
                className="font-heading text-3xl leading-snug break-words text-wedding-wine sm:text-4xl"
              >
                {invitation.guest.fullName}
              </h2>

              <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="flex items-center gap-2 font-label text-[10px] text-muted-foreground">
                    <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                    {t("eventDate")}
                  </dt>
                  <dd className="mt-2 text-base font-medium sm:text-lg">
                    <time dateTime={venue.eventAt}>{eventDay}</time>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground capitalize">
                      {eventWeekday}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 font-label text-[10px] text-muted-foreground">
                    <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
                    {t("eventTime")}
                  </dt>
                  <dd className="mt-2 text-base font-medium sm:text-lg">
                    {eventTime}
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {t("localTime")}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="mt-7">
                <p className="flex items-center gap-2 font-label text-[10px] text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  {t("venueLabel")}
                </p>
                <h3 className="mt-2 font-heading text-xl break-words text-wedding-wine">
                  {venue.name}
                </h3>
                <TicketVenue venue={venue} />
              </div>

              {invitation.personalMessage && (
                <p className="mt-6 border-t border-wedding-warm-beige/30 pt-5 text-sm leading-7 whitespace-pre-line italic">
                  {invitation.personalMessage}
                </p>
              )}

              <p className="mt-7 border-t border-wedding-warm-beige/35 pt-5 text-[11px] leading-5 text-muted-foreground">
                {expiryLabel}
              </p>
            </div>

            <div className="relative flex flex-col items-center justify-center border-t border-dashed border-wedding-warm-beige/60 bg-wedding-cream/45 px-5 py-8 md:border-t-0 md:border-l">
              <span
                aria-hidden="true"
                className="absolute -top-3 -left-3 size-6 rounded-full border border-wedding-warm-beige/40 bg-[#fbf7ef] md:top-auto md:bottom-[-12px]"
              />
              <span
                aria-hidden="true"
                className="absolute -top-3 -right-3 size-6 rounded-full border border-wedding-warm-beige/40 bg-[#fbf7ef] md:right-auto md:left-[-12px]"
              />
              <h3 className="mb-4 font-label text-xs text-wedding-wine">{t("qrTitle")}</h3>
              <div className={qrFrameClassName}>
                <Image
                  src={qrDataUrl}
                  alt={qrAlt}
                  width={224}
                  height={224}
                  unoptimized
                  className="relative block h-auto w-full rounded-lg bg-white [image-rendering:pixelated]"
                />
              </div>
              <TicketLiveMarker timeZone={timeZone} />
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-wedding-wine">
                <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                {t("issuedBy")}
              </p>
              <p className="mt-2 max-w-52 text-center text-xs leading-6 text-muted-foreground">
                {t("qrHint")}
              </p>
            </div>
          </div>
        </article>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href={invitationHref}
            prefetch={false}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-wedding-wine/20 px-6 font-label text-xs text-wedding-wine transition-colors hover:bg-wedding-wine/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wedding-dusty-rose sm:w-auto"
          >
            {t("viewInvitation")}
          </Link>
        </div>
        <p className="mx-auto mt-5 max-w-md text-center text-xs leading-6 text-muted-foreground">
          {t("liveHint")}
        </p>
      </main>
      <footer className="px-5 pb-6 text-center text-xs text-wedding-dusty-rose italic">
        {t("footer")}
      </footer>
    </div>
  );
}

function TicketVenue({ venue }: { venue: AddressDto }) {
  const t = useTranslations("Invitation.venue");
  const locality = [venue.postalCode, venue.city, venue.region, venue.country]
    .filter(Boolean)
    .join(", ");
  const floor = venue.floor ? t("floor", { value: venue.floor }) : null;
  const entrance = venue.entrance ? t("entrance", { value: venue.entrance }) : null;
  const access = [floor, entrance].filter(Boolean).join(" · ");
  const showAddressLine1 =
    venue.addressLine1 !== null && !venue.addressText.includes(venue.addressLine1);
  const showAddressLine2 =
    venue.addressLine2 !== null && !venue.addressText.includes(venue.addressLine2);
  const showLocality = Boolean(locality) && !venue.addressText.includes(locality);
  return (
    <address className="mt-2 space-y-1 text-sm leading-6 whitespace-pre-line not-italic [overflow-wrap:anywhere]">
      <p>{venue.addressText}</p>
      {showAddressLine1 && <p>{venue.addressLine1}</p>}
      {showAddressLine2 && <p>{venue.addressLine2}</p>}
      {showLocality && <p>{locality}</p>}
      {access && <p className="text-wedding-wine">{access}</p>}
      {venue.instructions && <p className="text-muted-foreground">{venue.instructions}</p>}
    </address>
  );
}

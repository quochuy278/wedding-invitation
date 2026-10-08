import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { InvitationHero } from "@/components/invitation/invitation-hero";
import { InvitationNote } from "@/components/invitation/invitation-note";
import { InvitationSchedule } from "@/components/invitation/invitation-schedule";
import { InvitationVenue } from "@/components/invitation/invitation-venue";
import { InvitationWishes } from "@/components/invitation/invitation-wishes";
import { invitationService } from "@/server/features/invitations/invitation.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invitation.metadata");

  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: code } = await params;
  const invitation = await invitationService.getByCode(code);
  if (!invitation) notFound();
  const timeZone = invitation.address.eventTimeZone ?? "Asia/Ho_Chi_Minh";
  const date = new Date(invitation.address.eventAt);
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  const displayDate = new Intl.DateTimeFormat("en-GB", dateOptions)
    .format(date)
    .replaceAll("/", ".");
  const hero = {
    date: invitation.address.eventAt,
    displayDate,
    guestName: invitation.guest.fullName,
  };
  const ticketHref = `/ticket/${encodeURIComponent(invitation.code)}`;

  return (
    <>
      <InvitationHero invitation={hero} ticketHref={ticketHref} />
      <InvitationSchedule eventAt={invitation.address.eventAt} timeZone={timeZone} />
      <InvitationVenue venue={invitation.address} />
      <InvitationNote personalMessage={invitation.personalMessage} />
      <InvitationWishes />
    </>
  );
}

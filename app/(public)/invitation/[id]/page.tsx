import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InvitationHero } from "@/components/invitation/invitation-hero";
import { InvitationNote } from "@/components/invitation/invitation-note";
import { InvitationSchedule } from "@/components/invitation/invitation-schedule";
import { InvitationVenue } from "@/components/invitation/invitation-venue";
import { InvitationWishes } from "@/components/invitation/invitation-wishes";
import { dummyInvitation } from "@/lib/dummy-invitation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invitation.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

// Every invitation ID uses the same fixture during the UI prototype.
export default function InvitationPage() {
  const invitation = dummyInvitation;

  return (
    <>
      <InvitationHero invitation={invitation} />
      <InvitationSchedule date={invitation.date} events={invitation.schedule} />
      <InvitationVenue venue={invitation.venue} />
      <InvitationNote />
      <InvitationWishes />
    </>
  );
}

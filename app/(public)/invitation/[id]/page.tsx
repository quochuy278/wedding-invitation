import type { Metadata } from "next";
import { InvitationHero } from "@/components/invitation/invitation-hero";
import { InvitationNote } from "@/components/invitation/invitation-note";
import { InvitationSchedule } from "@/components/invitation/invitation-schedule";
import { InvitationVenue } from "@/components/invitation/invitation-venue";
import { InvitationWishes } from "@/components/invitation/invitation-wishes";
import { dummyInvitation } from "@/lib/dummy-invitation";

export const metadata: Metadata = {
  title: "Thiệp mời cưới · Huy & Phụng",
  description:
    "Cùng Huy & Phụng viết nên một chương mới. Trân trọng mời bạn chung vui ngày 19.09.2026.",
};

// Every invitation ID uses the same fixture during the UI prototype.
export default function InvitationPage() {
  const invitation = dummyInvitation;

  return (
    <>
      <InvitationHero invitation={invitation} />
      <InvitationSchedule date={invitation.date} events={invitation.schedule} />
      <InvitationVenue venue={invitation.venue} />
      <InvitationNote />
      <InvitationWishes groom={invitation.groom} bride={invitation.bride} />
    </>
  );
}

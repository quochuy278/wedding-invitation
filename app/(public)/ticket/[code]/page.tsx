import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { InvitationTicket } from "@/components/invitation/invitation-ticket";
import { invitationTicketService } from "@/server/features/invitations/invitation-ticket.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InvitationTicket");
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  const ticket = await invitationTicketService.getByCode(code);
  if (!ticket) notFound();
  return <InvitationTicket ticket={ticket} />;
}

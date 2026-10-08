import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { InvitationList } from "@/components/admin/invitation-list";
import { getAdminSession } from "@/server/features/auth/auth.http";

export default async function InvitationListPage(): Promise<ReactElement> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <InvitationList />;
}

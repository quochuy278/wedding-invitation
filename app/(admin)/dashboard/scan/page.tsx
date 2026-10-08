import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { InvitationScanner } from "@/components/admin/invitation-scanner";
import { getAdminSession } from "@/server/features/auth/auth.http";

export default async function ScanInvitationPage(): Promise<ReactElement> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <InvitationScanner />;
}

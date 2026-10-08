import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { CreateInvitationForm } from "@/components/admin/create-invitation-form";
import { getAdminSession } from "@/server/features/auth/auth.http";

export default async function CreateInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ addressId?: string | string[] }>;
}): Promise<ReactElement> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  const query = await searchParams;
  const initialAddressId = typeof query.addressId === "string" ? query.addressId : "";
  return <CreateInvitationForm initialAddressId={initialAddressId} />;
}

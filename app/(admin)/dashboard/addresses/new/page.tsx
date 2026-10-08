import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { AddressForm } from "@/components/admin/address-form";
import { getAdminSession } from "@/server/features/auth/auth.http";

export default async function CreateAddressPage(): Promise<ReactElement> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AddressForm />;
}

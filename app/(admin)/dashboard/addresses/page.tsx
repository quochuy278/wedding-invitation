import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { AddressList } from "@/components/admin/address-list";
import { getAdminSession } from "@/server/features/auth/auth.http";

export default async function AddressListPage(): Promise<ReactElement> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AddressList />;
}

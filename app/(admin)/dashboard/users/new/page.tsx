import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { getAdminSession } from "@/server/features/auth/auth.http";

export default async function CreateUserPage(): Promise<ReactElement> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <CreateUserForm />;
}

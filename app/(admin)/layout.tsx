import { redirect } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/server/features/auth/auth.http";
import type { AuthSessionDto } from "@/shared/contracts/auth";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps): Promise<ReactElement> {
  const session: AuthSessionDto | null = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return <AdminShell fullName={session.user.fullName}>{children}</AdminShell>;
}

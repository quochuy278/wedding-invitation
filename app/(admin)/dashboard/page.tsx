import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { getAdminSession } from "@/server/features/auth/auth.http";
import type { AuthSessionDto } from "@/shared/contracts/auth";

export default async function DashboardPage(): Promise<ReactElement> {
  const session: AuthSessionDto | null = await getAdminSession();
  if (!session) redirect("/login");
  const t: Awaited<ReturnType<typeof getTranslations>> = await getTranslations("DashboardPage");

  return (
    <main className="mx-auto flex w-full max-w-5xl items-start justify-between gap-6 p-6 md:p-10">
      <div>
        <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("welcome", { name: session.user.fullName })}
        </p>
      </div>
      <LogoutButton />
    </main>
  );
}

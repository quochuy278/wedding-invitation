import { ArrowRightIcon, ListChecksIcon, MailPlusIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { DashboardOverviewStats } from "@/components/admin/dashboard-overview-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSession } from "@/server/features/auth/auth.http";

export default async function DashboardPage(): Promise<ReactElement> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  const t: Awaited<ReturnType<typeof getTranslations>> = await getTranslations("Admin.overview");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/dashboard/invitations/new" />}>
          <MailPlusIcon />
          {t("createAction")}
        </Button>
      </div>

      <DashboardOverviewStats />

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="transition-colors hover:border-wedding-wine/35">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-wedding-blush text-wedding-wine">
              <MailPlusIcon className="size-5" />
            </div>
            <CardTitle>{t("createTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-5 text-sm text-muted-foreground">{t("createDescription")}</p>
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/invitations/new" />}
              variant="outline"
            >
              {t("openCreate")}
              <ArrowRightIcon />
            </Button>
          </CardContent>
        </Card>
        <Card className="transition-colors hover:border-wedding-wine/35">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-wedding-blush text-wedding-wine">
              <ListChecksIcon className="size-5" />
            </div>
            <CardTitle>{t("listTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-5 text-sm text-muted-foreground">{t("listDescription")}</p>
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/invitations" />}
              variant="outline"
            >
              {t("openList")}
              <ArrowRightIcon />
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

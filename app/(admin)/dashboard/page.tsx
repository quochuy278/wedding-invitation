import { ArrowRightIcon, ListChecksIcon, MailPlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage(): Promise<ReactElement> {
  const t: Awaited<ReturnType<typeof getTranslations>> = await getTranslations("Admin.overview");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
            <Badge variant="outline">{t("demo")}</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/dashboard/invitations/new" />}>
          <MailPlusIcon />
          {t("createAction")}
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalInvitations")}</CardTitle>
            <ListChecksIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">48</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("totalHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("acceptedInvitations")}</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">31</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("acceptedHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("guestCount")}</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">67</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("guestHint")}</p>
          </CardContent>
        </Card>
      </section>

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

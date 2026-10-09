"use client";

import { ListChecksIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvitations } from "@/hooks/queries/use-invitations";
import { invitationPaginationDefaults } from "@/shared/contracts/invitation";

const summaryCards = [
  {
    key: "totalInvitations",
    title: "totalInvitations",
    hint: "totalHint",
    icon: ListChecksIcon,
  },
  {
    key: "acceptedInvitations",
    title: "acceptedInvitations",
    hint: "acceptedHint",
    icon: UsersIcon,
  },
  { key: "acceptedGuests", title: "guestCount", hint: "guestHint", icon: UsersIcon },
] as const;

export function DashboardOverviewStats(): ReactElement {
  const t = useTranslations("Admin.overview");
  const errorT = useTranslations("ApiErrors");
  const { data, error, isPending, isFetching, isError, refetch } = useInvitations({
    page: invitationPaginationDefaults.page,
    pageSize: invitationPaginationDefaults.pageSize,
  });
  const summary = isError ? undefined : data?.summary;

  function handleRetry(): void {
    void refetch();
  }

  return (
    <div className="space-y-4" aria-busy={isFetching}>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("statsLabel")}>
        {summaryCards.map(({ key, title, hint, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t(title)}</CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              {isPending ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-semibold">{summary?.[key] ?? "—"}</p>
              )}
              {hint === "acceptedHint" && !summary ? (
                isPending ? (
                  <Skeleton className="mt-1 h-4 w-40" />
                ) : null
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(hint, { count: summary?.pendingInvitations ?? 0 })}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
      {isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : null}
      {isError && error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-destructive">{errorT(error.code)}</p>
          <Button type="button" variant="outline" onClick={handleRetry} disabled={isFetching}>
            {t("retry")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

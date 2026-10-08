"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddresses } from "@/hooks/queries/use-addresses";
import type { AddressDto } from "@/shared/contracts/address";
import { AddressSummary } from "./address-summary";

export function AddressList(): ReactElement {
  const t = useTranslations("Admin.addresses");
  const apiErrors = useTranslations("ApiErrors");
  const { data, error, isPending, isError, isFetching, refetch } = useAddresses();
  const items = data?.items ?? [];
  const empty = !isPending && !isError && items.length === 0;
  const errorMessage = error ? apiErrors(error.code) : null;
  function handleRetry(): void {
    void refetch();
  }
  function renderAddress(address: AddressDto): ReactElement {
    const href = `/dashboard/invitations/new?addressId=${encodeURIComponent(address.id)}`;
    return (
      <Card key={address.id}>
        <CardContent className="space-y-4">
          <AddressSummary address={address} />
          <Button variant="outline" nativeButton={false} render={<Link href={href} />}>
            {t("useForInvitation")}
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/dashboard/addresses/new" />}>
          {t("createTitle")}
        </Button>
      </div>
      {isPending && (
        <div role="status" aria-label={t("loading")} className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      )}
      {isError && (
        <Card>
          <CardContent className="space-y-4">
            <p role="alert">{errorMessage}</p>
            <Button type="button" onClick={handleRetry} disabled={isFetching}>
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      )}
      {empty && (
        <Card>
          <CardContent>
            <p>{t("empty")}</p>
          </CardContent>
        </Card>
      )}
      {!isError && <div className="grid gap-4 sm:grid-cols-2">{items.map(renderAddress)}</div>}
    </main>
  );
}

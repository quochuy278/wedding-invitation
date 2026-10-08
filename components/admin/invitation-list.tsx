"use client";

import dayjs from "dayjs";
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  ListChecksIcon,
  LoaderCircleIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactElement, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvitations } from "@/hooks/queries/use-invitations";
import {
  type InvitationListItemDto,
  type InvitationListParams,
  invitationPaginationDefaults,
} from "@/shared/contracts/invitation";

const loadingRowKeys = Array.from(
  { length: invitationPaginationDefaults.pageSize },
  (_, index) => `loading-row-${index}`,
);
const columnKeys = ["guest", "code", "status", "guestCount", "updatedAt"] as const;

function visiblePageNumbers(page: number, totalPages: number): number[] {
  const shouldShowAllPages: boolean = totalPages <= 7;
  if (shouldShowAllPages) {
    const allPages: number[] = Array.from({ length: totalPages }, (_, index) => index + 1);
    return allPages;
  }
  const start: number = Math.max(2, Math.min(page - 1, totalPages - 3));
  const end: number = Math.min(totalPages - 1, Math.max(page + 1, 4));
  return [1, ...Array.from({ length: end - start + 1 }, (_, index) => start + index), totalPages];
}

export function InvitationList(): ReactElement {
  const t = useTranslations("Admin.invitations");
  const errorT = useTranslations("ApiErrors");
  const paginationT = useTranslations("Ui.pagination");
  const [page, setPage] = useState<number>(invitationPaginationDefaults.page);
  const queryParams: InvitationListParams = {
    page,
    pageSize: invitationPaginationDefaults.pageSize,
  };
  const { data, error, isPending, isFetching, isError, refetch } = useInvitations(queryParams);
  const busy: boolean = isFetching;
  const currentPage: number = data?.pagination.page ?? page;
  const totalPages: number = data?.pagination.totalPages ?? 1;
  const totalItems: number = data?.pagination.totalItems ?? 0;
  const pageNumbers: number[] = visiblePageNumbers(currentPage, totalPages);
  const shouldNormalizePage: boolean =
    data !== undefined && !isError && !isFetching && currentPage !== page;
  const hasData: boolean = data !== undefined;
  const shouldShowError: boolean = isError && error !== null;
  const errorMessage: string = error ? errorT(error.code) : "";
  const isListEmpty: boolean = data?.items.length === 0;
  const previousPage: number = Math.max(1, currentPage - 1);
  const nextPage: number = Math.min(totalPages, currentPage + 1);
  const isPreviousPageDisabled: boolean = busy || currentPage === 1;
  const isNextPageDisabled: boolean = busy || currentPage === totalPages;
  const previousPageLabel: string = paginationT("previous");
  const nextPageLabel: string = paginationT("next");
  const previousPageAriaLabel: string = paginationT("goToPrevious");
  const nextPageAriaLabel: string = paginationT("goToNext");
  const pageSize: number = data?.pagination.pageSize ?? invitationPaginationDefaults.pageSize;
  const rangeFrom: number = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeTo: number = Math.min(currentPage * pageSize, totalItems);
  const rangeValues = { from: rangeFrom, to: rangeTo, total: totalItems };
  const rangeLabel: string = t("range", rangeValues);

  useEffect(() => {
    if (!shouldNormalizePage) return;

    setPage(currentPage);
  }, [currentPage, shouldNormalizePage]);

  function changePage(targetPage: number): void {
    const isCurrentPage: boolean = targetPage === currentPage;
    const isPageOutOfRange: boolean = targetPage < 1 || targetPage > totalPages;
    const shouldBlockPageChange: boolean = busy || isCurrentPage || isPageOutOfRange;
    if (shouldBlockPageChange) return;

    setPage(targetPage);
  }

  function handlePreviousPageClick(): void {
    changePage(previousPage);
  }

  function handleNextPageClick(): void {
    changePage(nextPage);
  }

  function handleRetry(): void {
    void refetch();
  }

  function renderStatus(status: string): ReactElement {
    const isAccepted: boolean = status === "accepted";
    const isPending: boolean = status === "pending";
    const isDeclined: boolean = status === "declined";
    const statusLabel: string = isDeclined ? t("declined") : status;
    if (isAccepted) {
      return <Badge className="bg-emerald-100 text-emerald-800">{t("accepted")}</Badge>;
    }
    if (isPending) return <Badge variant="secondary">{t("pending")}</Badge>;
    return <Badge variant="outline">{statusLabel}</Badge>;
  }

  const summaryCards = [
    { key: "totalInvitations", icon: ListChecksIcon, iconClass: "text-muted-foreground" },
    { key: "acceptedInvitations", icon: CheckCircle2Icon, iconClass: "text-emerald-700" },
    { key: "acceptedGuests", icon: UsersIcon, iconClass: "text-muted-foreground" },
    { key: "pendingInvitations", icon: Clock3Icon, iconClass: "text-amber-700" },
  ] as const;

  function renderSummaryCard({
    key,
    icon: Icon,
    iconClass,
  }: (typeof summaryCards)[number]): ReactElement {
    const title: string = t(key);
    const iconClassName: string = `size-4 ${iconClass}`;
    const summaryValue: number | string = isError ? "—" : (data?.summary[key] ?? "—");
    const content: ReactElement = isPending ? (
      <Skeleton className="h-9 w-16" />
    ) : (
      <p className="text-3xl font-semibold">{summaryValue}</p>
    );

    return (
      <Card key={key}>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={iconClassName} />
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  function renderInvitation(invitation: InvitationListItemDto): ReactElement {
    const phoneNumber: string = invitation.phoneNumber ?? "—";
    const statusBadge: ReactElement = renderStatus(invitation.status);
    const updatedAt: string = dayjs(invitation.updatedAt).format("DD/MM/YYYY");

    return (
      <TableRow key={invitation.id}>
        <TableCell>
          <p className="font-medium">{invitation.guestName}</p>
          <p className="text-xs text-muted-foreground">{phoneNumber}</p>
        </TableCell>
        <TableCell className="font-mono text-xs">{invitation.code}</TableCell>
        <TableCell>{statusBadge}</TableCell>
        <TableCell className="text-center">{invitation.guestCount}</TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">{updatedAt}</TableCell>
      </TableRow>
    );
  }

  function renderPageNumber(pageNumber: number, index: number): ReactElement {
    const shouldShowEllipsis: boolean = index > 0 && pageNumber - pageNumbers[index - 1] > 1;
    const isActive: boolean = pageNumber === currentPage;
    const variant: "outline" | "ghost" = isActive ? "outline" : "ghost";
    const ariaCurrent: "page" | undefined = isActive ? "page" : undefined;

    function handlePageClick(): void {
      changePage(pageNumber);
    }

    return (
      <PaginationItem key={pageNumber} className="flex items-center">
        {shouldShowEllipsis && <PaginationEllipsis />}
        <Button
          type="button"
          size="icon"
          variant={variant}
          aria-current={ariaCurrent}
          disabled={busy}
          onClick={handlePageClick}
        >
          {pageNumber}
        </Button>
      </PaginationItem>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy={busy}>
      <div>
        <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(renderSummaryCard)}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>{t("tableTitle")}</CardTitle>
          <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
            {busy && (
              <>
                <LoaderCircleIcon className="size-4 animate-spin" />
                {t("loading")}
              </>
            )}
          </span>
        </CardHeader>
        <CardContent className="space-y-6">
          {shouldShowError ? (
            <div role="alert" className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button onClick={handleRetry} disabled={isFetching} variant="outline">
                {t("retry")}
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("guest")}</TableHead>
                    <TableHead>{t("code")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-center">{t("guestCount")}</TableHead>
                    <TableHead>{t("updatedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending ? (
                    loadingRowKeys.map((rowKey) => (
                      <TableRow key={rowKey}>
                        {columnKeys.map((columnKey) => (
                          <TableCell key={columnKey}>
                            <Skeleton className="h-5 w-full min-w-16" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : isListEmpty ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        {t("empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map(renderInvitation)
                  )}
                </TableBody>
              </Table>

              {hasData && (
                <div className="flex flex-col items-center justify-between gap-4 border-t pt-5 sm:flex-row">
                  <p className="text-sm text-muted-foreground">{rangeLabel}</p>
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          type="button"
                          variant="ghost"
                          className="pl-1.5!"
                          aria-label={previousPageAriaLabel}
                          disabled={isPreviousPageDisabled}
                          onClick={handlePreviousPageClick}
                        >
                          <ChevronLeftIcon data-icon="inline-start" />
                          <span className="hidden sm:block">{previousPageLabel}</span>
                        </Button>
                      </PaginationItem>
                      {pageNumbers.map(renderPageNumber)}
                      <PaginationItem>
                        <Button
                          type="button"
                          variant="ghost"
                          className="pr-1.5!"
                          aria-label={nextPageAriaLabel}
                          disabled={isNextPageDisabled}
                          onClick={handleNextPageClick}
                        >
                          <span className="hidden sm:block">{nextPageLabel}</span>
                          <ChevronRightIcon data-icon="inline-end" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

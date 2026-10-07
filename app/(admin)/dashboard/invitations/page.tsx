import { CheckCircle2Icon, Clock3Icon, ListChecksIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InvitationStatus = "accepted" | "pending" | "declined";

type InvitationListItem = {
  code: string;
  guestCount: number;
  guestName: string;
  id: string;
  phone: string;
  respondedAt: string;
  status: InvitationStatus;
};

type InvitationListSearchParams = {
  page?: string | string[];
};

type InvitationListPageProps = {
  searchParams: Promise<InvitationListSearchParams>;
};

const PAGE_SIZE: number = 5;

const INVITATIONS: InvitationListItem[] = [
  {
    id: "inv-01",
    code: "HUY-AN-2026",
    guestName: "Nguyễn Văn An",
    phone: "090 123 4567",
    status: "accepted",
    guestCount: 2,
    respondedAt: "07/10/2026",
  },
  {
    id: "inv-02",
    code: "HUY-LINH-2026",
    guestName: "Trần Mỹ Linh",
    phone: "091 234 5678",
    status: "accepted",
    guestCount: 3,
    respondedAt: "06/10/2026",
  },
  {
    id: "inv-03",
    code: "HUY-MINH-2026",
    guestName: "Lê Hoàng Minh",
    phone: "093 345 6789",
    status: "pending",
    guestCount: 0,
    respondedAt: "—",
  },
  {
    id: "inv-04",
    code: "HUY-THAO-2026",
    guestName: "Phạm Ngọc Thảo",
    phone: "098 456 7890",
    status: "accepted",
    guestCount: 2,
    respondedAt: "05/10/2026",
  },
  {
    id: "inv-05",
    code: "HUY-DUNG-2026",
    guestName: "Võ Anh Dũng",
    phone: "097 567 8901",
    status: "declined",
    guestCount: 0,
    respondedAt: "04/10/2026",
  },
  {
    id: "inv-06",
    code: "HUY-HAN-2026",
    guestName: "Đỗ Thu Hân",
    phone: "096 678 9012",
    status: "accepted",
    guestCount: 4,
    respondedAt: "04/10/2026",
  },
  {
    id: "inv-07",
    code: "HUY-NAM-2026",
    guestName: "Bùi Thành Nam",
    phone: "094 789 0123",
    status: "pending",
    guestCount: 0,
    respondedAt: "—",
  },
  {
    id: "inv-08",
    code: "HUY-MAI-2026",
    guestName: "Ngô Thanh Mai",
    phone: "092 890 1234",
    status: "accepted",
    guestCount: 2,
    respondedAt: "03/10/2026",
  },
  {
    id: "inv-09",
    code: "HUY-KHOA-2026",
    guestName: "Huỳnh Đăng Khoa",
    phone: "090 901 2345",
    status: "accepted",
    guestCount: 1,
    respondedAt: "02/10/2026",
  },
  {
    id: "inv-10",
    code: "HUY-NHU-2026",
    guestName: "Phan Quỳnh Như",
    phone: "091 012 3456",
    status: "pending",
    guestCount: 0,
    respondedAt: "—",
  },
  {
    id: "inv-11",
    code: "HUY-TUAN-2026",
    guestName: "Đặng Minh Tuấn",
    phone: "093 123 4567",
    status: "accepted",
    guestCount: 2,
    respondedAt: "01/10/2026",
  },
  {
    id: "inv-12",
    code: "HUY-VY-2026",
    guestName: "Tạ Khánh Vy",
    phone: "098 234 5678",
    status: "declined",
    guestCount: 0,
    respondedAt: "30/09/2026",
  },
];

function invitationListHref(pageNumber: number): string {
  if (pageNumber === 1) {
    return "/dashboard/invitations";
  }

  return `/dashboard/invitations?page=${pageNumber}`;
}

export default async function InvitationListPage({
  searchParams,
}: InvitationListPageProps): Promise<ReactElement> {
  const t: Awaited<ReturnType<typeof getTranslations>> = await getTranslations("Admin.invitations");
  const resolvedSearchParams: InvitationListSearchParams = await searchParams;
  const pageParameter: string | string[] | undefined = resolvedSearchParams.page;
  const rawPage: string | undefined = Array.isArray(pageParameter)
    ? pageParameter[0]
    : pageParameter;
  const parsedPage: number = Number.parseInt(rawPage ?? "1", 10);
  const totalPages: number = Math.ceil(INVITATIONS.length / PAGE_SIZE);
  const safePage: number = Number.isNaN(parsedPage) ? 1 : parsedPage;
  const currentPage: number = Math.min(Math.max(safePage, 1), totalPages);
  const startIndex: number = (currentPage - 1) * PAGE_SIZE;
  const endIndex: number = startIndex + PAGE_SIZE;
  const visibleInvitations: InvitationListItem[] = INVITATIONS.slice(startIndex, endIndex);
  const acceptedInvitations: InvitationListItem[] = INVITATIONS.filter(
    (invitation: InvitationListItem): boolean => invitation.status === "accepted",
  );
  const pendingInvitations: InvitationListItem[] = INVITATIONS.filter(
    (invitation: InvitationListItem): boolean => invitation.status === "pending",
  );
  const acceptedGuestCount: number = acceptedInvitations.reduce(
    (total: number, invitation: InvitationListItem): number => total + invitation.guestCount,
    0,
  );
  const previousPage: number = Math.max(currentPage - 1, 1);
  const nextPage: number = Math.min(currentPage + 1, totalPages);
  const pageNumbers: number[] = Array.from(
    { length: totalPages },
    (_value: undefined, index: number): number => index + 1,
  );

  function renderStatus(status: InvitationStatus): ReactElement {
    if (status === "accepted") {
      return <Badge className="bg-emerald-100 text-emerald-800">{t("accepted")}</Badge>;
    }

    if (status === "declined") {
      return <Badge variant="outline">{t("declined")}</Badge>;
    }

    return <Badge variant="secondary">{t("pending")}</Badge>;
  }

  function renderInvitation(invitation: InvitationListItem): ReactElement {
    return (
      <TableRow key={invitation.id}>
        <TableCell>
          <p className="font-medium">{invitation.guestName}</p>
          <p className="text-xs text-muted-foreground">{invitation.phone}</p>
        </TableCell>
        <TableCell className="font-mono text-xs">{invitation.code}</TableCell>
        <TableCell>{renderStatus(invitation.status)}</TableCell>
        <TableCell className="text-center">{invitation.guestCount || "—"}</TableCell>
        <TableCell className="text-muted-foreground">{invitation.respondedAt}</TableCell>
      </TableRow>
    );
  }

  function renderPageNumber(pageNumber: number): ReactElement {
    const isActive: boolean = pageNumber === currentPage;

    return (
      <PaginationItem key={pageNumber}>
        <PaginationLink href={invitationListHref(pageNumber)} isActive={isActive}>
          {pageNumber}
        </PaginationLink>
      </PaginationItem>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
          <Badge variant="outline">{t("demo")}</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalInvitations")}</CardTitle>
            <ListChecksIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{INVITATIONS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("acceptedInvitations")}</CardTitle>
            <CheckCircle2Icon className="size-4 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{acceptedInvitations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("acceptedGuests")}</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{acceptedGuestCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingInvitations")}</CardTitle>
            <Clock3Icon className="size-4 text-amber-700" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{pendingInvitations.length}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("tableTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("guest")}</TableHead>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-center">{t("guestCount")}</TableHead>
                <TableHead>{t("respondedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{visibleInvitations.map(renderInvitation)}</TableBody>
          </Table>

          <div className="flex flex-col items-center justify-between gap-4 border-t pt-5 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              {t("range", {
                from: startIndex + 1,
                to: Math.min(endIndex, INVITATIONS.length),
                total: INVITATIONS.length,
              })}
            </p>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                    href={invitationListHref(previousPage)}
                  />
                </PaginationItem>
                {pageNumbers.map(renderPageNumber)}
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages ? "pointer-events-none opacity-50" : undefined
                    }
                    href={invitationListHref(nextPage)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

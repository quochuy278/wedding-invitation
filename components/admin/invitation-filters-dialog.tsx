"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactElement, type SubmitEvent, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useAddresses } from "@/hooks/queries/use-addresses";
import type { InvitationListParams } from "@/shared/contracts/invitation";
import { localTimeZone, parseCalendarDate } from "@/shared/utils/date";
import { invitationStatuses } from "@/shared/utils/invitation-status";

type FilterValues = Pick<
  InvitationListParams,
  "addressId" | "status" | "updatedFrom" | "updatedTo"
>;

export type InvitationFilters = FilterValues & { timeZone?: string };

type InvitationFiltersDialogProps = {
  filters: InvitationFilters;
  onApply: (filters: InvitationFilters) => void;
};

type DateError = "invalidFilterDate" | "invalidDateRange";

const defaultOpenSections = ["address"];
const dateFields = ["updatedFrom", "updatedTo"] as const;

export function InvitationFiltersDialog({
  filters,
  onApply,
}: InvitationFiltersDialogProps): ReactElement {
  const t = useTranslations("Admin.invitations");
  const [open, setOpen] = useState<boolean>(false);
  const [draft, setDraft] = useState<FilterValues>({});
  const [openSections, setOpenSections] = useState<string[]>(defaultOpenSections);
  const [dateError, setDateError] = useState<DateError>();
  const addresses = useAddresses(open);
  const addressOptions = addresses.data?.items ?? [];
  const allAddressesLabel: string = addresses.isPending ? t("loadingAddresses") : t("allAddresses");
  const activeCount: number = [
    filters.addressId,
    filters.status,
    filters.updatedFrom || filters.updatedTo,
  ].filter(Boolean).length;
  const buttonLabel: string = activeCount
    ? t("filtersActive", { count: activeCount })
    : t("filters");
  const timeZone: string = localTimeZone();
  const dateDescriptionId: string = dateError
    ? "invitation-filter-date-error"
    : "invitation-filter-time-zone";

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) {
      const { addressId, status, updatedFrom, updatedTo } = filters;
      setDraft({ addressId, status, updatedFrom, updatedTo });
      setOpenSections(defaultOpenSections);
      setDateError(undefined);
    }
    setOpen(nextOpen);
  }

  function changeFilter(field: keyof FilterValues, value: string): void {
    setDraft((previous) => ({ ...previous, [field]: value || undefined }));
    if (field === "updatedFrom" || field === "updatedTo") setDateError(undefined);
  }

  function handleClear(): void {
    setDraft({});
    setDateError(undefined);
  }

  function handleRetryAddresses(): void {
    void addresses.refetch();
  }

  function handleApply(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const { updatedFrom, updatedTo } = draft;
    const invalidDate: boolean = Boolean(
      (updatedFrom && !parseCalendarDate(updatedFrom)) ||
        (updatedTo && !parseCalendarDate(updatedTo)),
    );
    const invalidRange: boolean = Boolean(updatedFrom && updatedTo && updatedFrom > updatedTo);
    if (invalidDate || invalidRange) {
      setDateError(invalidDate ? "invalidFilterDate" : "invalidDateRange");
      setOpenSections(["updatedAt"]);
      return;
    }

    onApply({ ...draft, timeZone: updatedFrom || updatedTo ? timeZone : undefined });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger aria-label={buttonLabel} render={<Button variant="outline" />}>
        <SlidersHorizontalIcon data-icon="inline-start" />
        {t("filters")}
        {activeCount > 0 && (
          <Badge aria-hidden="true" variant="secondary">
            {activeCount}
          </Badge>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("filters")}</DialogTitle>
          <DialogDescription className="sr-only">{t("filterDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleApply}>
          <Accordion value={openSections} onValueChange={setOpenSections}>
            <AccordionItem value="address">
              <AccordionTrigger>{t("address")}</AccordionTrigger>
              <AccordionContent className="space-y-2">
                <NativeSelect
                  aria-label={t("address")}
                  value={draft.addressId ?? ""}
                  onChange={(event) => changeFilter("addressId", event.currentTarget.value)}
                  disabled={addressOptions.length === 0}
                  className="w-full"
                >
                  <NativeSelectOption value="">{allAddressesLabel}</NativeSelectOption>
                  {addressOptions.map((address) => (
                    <NativeSelectOption key={address.id} value={address.id}>
                      {`${address.name} · ${address.addressText}`}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {addresses.isError && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span role="alert" className="text-xs text-destructive">
                      {t("addressLoadError")}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetryAddresses}
                    >
                      {t("retry")}
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="status">
              <AccordionTrigger>{t("status")}</AccordionTrigger>
              <AccordionContent>
                <NativeSelect
                  aria-label={t("status")}
                  value={draft.status ?? ""}
                  onChange={(event) => changeFilter("status", event.currentTarget.value)}
                  className="w-full"
                >
                  <NativeSelectOption value="">{t("allStatuses")}</NativeSelectOption>
                  {invitationStatuses.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {t(status)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="updatedAt">
              <AccordionTrigger>{t("updatedAt")}</AccordionTrigger>
              <AccordionContent className="space-y-3">
                {dateFields.map((field) => (
                  <div className="space-y-1" key={field}>
                    <label htmlFor={`invitation-filter-${field}`}>{t(field)}</label>
                    <Input
                      id={`invitation-filter-${field}`}
                      type="date"
                      max="9999-12-31"
                      value={draft[field] ?? ""}
                      onChange={(event) => changeFilter(field, event.currentTarget.value)}
                      aria-invalid={Boolean(dateError)}
                      aria-describedby={dateDescriptionId}
                    />
                  </div>
                ))}
                {dateError && (
                  <p
                    id="invitation-filter-date-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {t(dateError)}
                  </p>
                )}
                <p id="invitation-filter-time-zone" className="text-xs text-muted-foreground">
                  {t("appliedTimeZone", { timeZone })}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClear}>
              {t("clearFilters")}
            </Button>
            <Button type="submit">{t("applyFilters")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

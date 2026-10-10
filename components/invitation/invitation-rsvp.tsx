"use client";

import { Ticket } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateRsvp } from "@/hooks/queries/use-rsvps";
import { ApiErrorCode } from "@/lib/api/types";
import { type Attendance, guestResponseLimits } from "@/shared/contracts/guest-response";
import { isConfirmedInvitationStatus } from "@/shared/utils/invitation-status";
import { InvitationButton } from "./invitation-button";

type RsvpState = { status: string; guestCount: number };

export function InvitationRsvp({
  code,
  guestName,
  status,
  guestCount,
  ticketHref,
}: RsvpState & { code: string; guestName: string; ticketHref: string }) {
  const t = useTranslations("Invitation.rsvp");
  const hero = useTranslations("Invitation.hero");
  const errors = useTranslations("ApiErrors");
  const id = useId();
  const mutation = useCreateRsvp();
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<RsvpState>({ status, guestCount });
  const [attendance, setAttendance] = useState<Attendance>(status === "declined" ? "no" : "yes");
  const [guestCountInput, setGuestCountInput] = useState(String(Math.max(1, guestCount)));
  const busy = mutation.isPending;
  const confirmed = isConfirmedInvitationStatus(response.status);
  const hasResponded = confirmed || response.status === "declined";
  const errorMessage = mutation.error
    ? mutation.error.code === ApiErrorCode.NotFound
      ? t("unavailable")
      : mutation.error.code === ApiErrorCode.Conflict
        ? t("alreadyAttended")
        : mutation.error.code === ApiErrorCode.BadRequest
          ? t("invalidCount")
          : errors(mutation.error.code)
    : null;

  if (confirmed) {
    return (
      <div id="rsvp" className="scroll-mt-8">
        <InvitationButton
          render={<Link href={ticketHref} prefetch={false} />}
          nativeButton={false}
          leadingIcon={<Ticket className="size-4" aria-hidden="true" />}
        >
          {t("viewInvitation")}
        </InvitationButton>
        <p role="status" className="mx-auto mt-3 max-w-sm text-sm text-wedding-wine">
          {response.status === "attended"
            ? t("attended")
            : t("accepted", { count: response.guestCount })}
        </p>
      </div>
    );
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (busy) return;
    if (nextOpen) {
      mutation.reset();
      setAttendance(response.status === "declined" ? "no" : "yes");
      setGuestCountInput(String(Math.max(1, response.guestCount)));
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (busy) return;
    mutation.mutate(
      { code, attendance, guestCount: attendance === "yes" ? Number(guestCountInput) : 0 },
      {
        onSuccess: (saved) => {
          setResponse({
            status: saved.attendance === "yes" ? "accepted" : "declined",
            guestCount: saved.guestCount,
          });
          setOpen(false);
        },
      },
    );
  }

  return (
    <div id="rsvp" className="scroll-mt-8">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<InvitationButton />} disabled={busy}>
          {hasResponded ? t("edit") : t("trigger")}
        </DialogTrigger>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
          showCloseButton={!busy}
        >
          <DialogHeader>
            <DialogTitle className="pr-6 text-xl text-wedding-wine">{t("title")}</DialogTitle>
            <DialogDescription>{t("description", { name: guestName })}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5" aria-busy={busy}>
            <fieldset disabled={busy} className="space-y-3">
              <legend className="mb-3 font-medium">{t("attendance")}</legend>
              {(["yes", "no"] as const).map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-input p-3 has-checked:border-wedding-wine has-checked:bg-wedding-wine/5"
                >
                  <input
                    type="radio"
                    name="attendance"
                    value={value}
                    checked={attendance === value}
                    onChange={() => setAttendance(value)}
                    className="size-4 accent-wedding-wine"
                  />
                  {t(value)}
                </label>
              ))}
              {attendance === "yes" ? (
                <div className="space-y-2 pt-2">
                  <label htmlFor={`${id}-count`} className="block font-medium">
                    {t("guestCount")}
                  </label>
                  <Input
                    id={`${id}-count`}
                    name="guestCount"
                    type="number"
                    min={1}
                    max={guestResponseLimits.maxGuestCount}
                    step={1}
                    required
                    value={guestCountInput}
                    onChange={(event) => setGuestCountInput(event.currentTarget.value)}
                    aria-describedby={`${id}-hint`}
                    aria-invalid={
                      mutation.error?.details.some((detail) => detail.field === "guestCount") ||
                      undefined
                    }
                    className="h-11"
                  />
                  <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                    {t("countHint")}
                  </p>
                </div>
              ) : null}
            </fieldset>
            {errorMessage ? (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => handleOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <InvitationButton type="submit" disabled={busy} showArrow={false} className="min-w-0">
                {busy ? t("saving") : t("submit")}
              </InvitationButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <div className="mt-3">
        <Link
          href={ticketHref}
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-wedding-wine/20 px-5 font-label text-xs text-wedding-wine transition-colors hover:bg-wedding-wine/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wedding-dusty-rose"
        >
          <Ticket className="size-4" aria-hidden="true" />
          {hero("viewTicket")}
        </Link>
      </div>
      {hasResponded ? (
        <p role="status" className="mx-auto mt-3 max-w-sm text-sm text-wedding-wine">
          {t("declined")}
        </p>
      ) : null}
    </div>
  );
}

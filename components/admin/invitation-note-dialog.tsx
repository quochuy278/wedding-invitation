"use client";

import { useTranslations } from "next-intl";
import type { ReactElement, SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateInvitationNote } from "@/hooks/queries/use-invitations";
import {
  type InvitationListItemDto,
  invitationAdminNoteMaxLength,
} from "@/shared/contracts/invitation";
import { formText } from "./form-values";

type InvitationNoteDialogProps = Pick<InvitationListItemDto, "code" | "guestName" | "adminNote"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus: () => HTMLElement | null;
};

export function InvitationNoteDialog({
  code,
  guestName,
  adminNote,
  open,
  onOpenChange,
  finalFocus,
}: InvitationNoteDialogProps): ReactElement {
  const t = useTranslations("Admin.invitations.note");
  const errorT = useTranslations("ApiErrors");
  const updateNote = useUpdateInvitationNote();
  const saveLabel: string = updateNote.isPending ? t("saving") : t("save");
  const errorMessage: string | undefined = updateNote.error
    ? errorT(updateNote.error.code)
    : undefined;

  function handleOpenChange(nextOpen: boolean): void {
    if (!updateNote.isPending) onOpenChange(nextOpen);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (updateNote.isPending) return;

    const data = new FormData(event.currentTarget);
    const nextNote: string | null = formText(data, "adminNote") || null;
    if (nextNote === adminNote) {
      onOpenChange(false);
      return;
    }
    updateNote.mutate({ code, adminNote: nextNote }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        finalFocus={finalFocus}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { name: guestName, code })}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="sr-only" htmlFor="invitation-admin-note">
              {t("title")}
            </label>
            <Textarea
              id="invitation-admin-note"
              name="adminNote"
              defaultValue={adminNote ?? ""}
              placeholder={t("placeholder")}
              maxLength={invitationAdminNoteMaxLength}
              disabled={updateNote.isPending}
              className="min-h-28 max-h-[40dvh]"
              aria-describedby="invitation-admin-note-hint"
            />
            <p id="invitation-admin-note-hint" className="text-xs text-muted-foreground">
              {t("hint", { maximum: invitationAdminNoteMaxLength })}
            </p>
            {errorMessage && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateNote.isPending}>
              {saveLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

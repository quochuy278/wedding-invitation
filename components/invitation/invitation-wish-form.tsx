"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { useCreateWish } from "@/hooks/queries/use-wishes";
import { ApiErrorCode } from "@/lib/api/types";
import { guestResponseLimits } from "@/shared/contracts/guest-response";
import type { InvitationWishDto } from "@/shared/contracts/invitation";
import { InvitationButton } from "./invitation-button";
import { WishList } from "./wish-list";

export function InvitationWishForm({
  code,
  guestName,
  initialWishes,
}: {
  code: string;
  guestName: string;
  initialWishes: InvitationWishDto[];
}) {
  const t = useTranslations("Invitation.wishes");
  const errors = useTranslations("ApiErrors");
  const id = useId();
  const mutation = useCreateWish();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [wishes, setWishes] = useState(initialWishes);
  const busy = mutation.isPending;
  const errorMessage = mutation.error
    ? mutation.error.code === ApiErrorCode.NotFound
      ? t("unavailable")
      : mutation.error.code === ApiErrorCode.BadRequest
        ? t("invalidContent", { max: guestResponseLimits.maxWishLength })
        : errors(mutation.error.code)
    : null;

  function handleOpenChange(nextOpen: boolean): void {
    if (busy) return;
    if (nextOpen) mutation.reset();
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (busy || !content.trim()) return;
    mutation.mutate(
      { code, content },
      {
        onSuccess: (wish) => {
          setWishes((previous) =>
            previous.some((item) => item.id === wish.id) ? previous : [...previous, wish],
          );
          setContent("");
          setOpen(false);
        },
      },
    );
  }

  return (
    <div className="mt-4">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<InvitationButton />} disabled={busy}>
          {t("submit")}
        </DialogTrigger>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
          showCloseButton={!busy}
        >
          <DialogHeader>
            <DialogTitle className="pr-6 text-xl text-wedding-wine">{t("formTitle")}</DialogTitle>
            <DialogDescription>{t("fromGuest", { name: guestName })}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={busy}>
            <div className="space-y-2">
              <label htmlFor={`${id}-content`} className="block font-medium">
                {t("contentLabel")}
              </label>
              <Textarea
                id={`${id}-content`}
                name="content"
                required
                maxLength={guestResponseLimits.maxWishLength}
                rows={5}
                value={content}
                onChange={(event) => setContent(event.currentTarget.value)}
                disabled={busy}
                placeholder={t("placeholder")}
                aria-describedby={`${id}-hint`}
                aria-invalid={mutation.error?.code === ApiErrorCode.BadRequest || undefined}
                className="min-h-32"
              />
              <p id={`${id}-hint`} className="text-right text-xs text-muted-foreground">
                {t("characterCount", {
                  count: content.length,
                  max: guestResponseLimits.maxWishLength,
                })}
              </p>
            </div>
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
              <InvitationButton
                type="submit"
                disabled={busy || !content.trim()}
                showArrow={false}
                className="min-w-0"
              >
                {busy ? t("sending") : t("submit")}
              </InvitationButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {mutation.isSuccess ? (
        <p role="status" className="mt-3 text-sm text-wedding-wine">
          {t("success")}
        </p>
      ) : null}
      {wishes.length > 0 ? (
        <details className="mx-auto mt-5 max-w-lg">
          <summary className="cursor-pointer py-2 text-sm text-wedding-wine">
            {t("sentWishes", { count: wishes.length })}
          </summary>
          <WishList wishes={wishes} />
        </details>
      ) : null}
    </div>
  );
}

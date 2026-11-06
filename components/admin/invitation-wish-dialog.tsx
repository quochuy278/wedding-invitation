"use client";

import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { WishList } from "@/components/invitation/wish-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWishes } from "@/hooks/queries/use-wishes";

type InvitationWishDialogProps = {
  code: string;
  guestName: string;
  triggerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InvitationWishDialog({
  code,
  guestName,
  triggerId,
  open,
  onOpenChange,
}: InvitationWishDialogProps): ReactElement {
  const t = useTranslations("Admin.wishes");
  const errors = useTranslations("ApiErrors");
  const query = useWishes(code, open);

  function getFinalFocus(): HTMLElement | null {
    return document.getElementById(triggerId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        finalFocus={getFinalFocus}
      >
        <DialogHeader>
          <DialogTitle className="pr-6 text-xl text-wedding-wine">{t("title")}</DialogTitle>
          <DialogDescription>{t("from", { name: guestName, code })}</DialogDescription>
        </DialogHeader>
        <div aria-busy={query.isFetching}>
          {query.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t("loading")}
            </p>
          ) : query.isError ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-destructive">{errors(query.error.code)}</p>
              <Button
                variant="outline"
                disabled={query.isFetching}
                onClick={() => {
                  void query.refetch();
                }}
              >
                {t("retry")}
              </Button>
            </div>
          ) : query.data.length ? (
            <WishList wishes={query.data} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

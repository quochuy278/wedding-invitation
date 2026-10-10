"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { WishList } from "@/components/invitation/wish-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWishes } from "@/hooks/queries/use-wishes";

export function InvitationWishDialog({ code, guestName }: { code: string; guestName: string }) {
  const t = useTranslations("Admin.wishes");
  const errors = useTranslations("ApiErrors");
  const [open, setOpen] = useState(false);
  const query = useWishes(code, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" />}
        aria-label={t("viewFor", { name: guestName })}
      >
        {t("view")}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
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

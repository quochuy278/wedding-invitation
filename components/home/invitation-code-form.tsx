"use client";

import { isAxiosError } from "axios";
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCheckInvitationCode } from "@/hooks/queries/use-invitations";

type FormError = "required" | "invalid" | "unavailable";

export function InvitationCodeForm() {
  const t = useTranslations("HomePage.form");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<FormError | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const checkInvitation = useCheckInvitationCode();
  const isPending = checkInvitation.isPending || isNavigating;
  const isInvalid = error === "required" || error === "invalid";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const trimmedCode = code.trim();
    setError(null);

    if (!trimmedCode) {
      setError("required");
      inputRef.current?.focus();
      return;
    }

    setCode(trimmedCode);

    try {
      const invitation = await checkInvitation.mutateAsync({ code: trimmedCode });

      if (!invitation) {
        setError("invalid");
        inputRef.current?.focus();
        return;
      }

      startNavigation(() => {
        router.push(`/invitation/${encodeURIComponent(invitation.id)}`);
      });
    } catch (requestError) {
      setError(
        isAxiosError(requestError) && requestError.response?.status === 404
          ? "invalid"
          : "unavailable",
      );
    }
  }

  return (
    <form className="mt-8" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
      <label
        htmlFor="invitation-code"
        className="mb-2.5 block font-label text-xs text-wedding-wine"
      >
        {t("label")}
      </label>
      <Input
        ref={inputRef}
        id="invitation-code"
        name="code"
        type="text"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setError(null);
        }}
        placeholder={t("placeholder")}
        maxLength={128}
        required
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
        readOnly={isPending}
        aria-invalid={isInvalid}
        aria-describedby={`invitation-code-hint${error ? " invitation-code-error" : ""}`}
        className="h-14 rounded-lg border-wedding-warm-beige/65 bg-card px-4 font-label text-base placeholder:text-muted-foreground/60 md:text-sm"
      />
      <p id="invitation-code-hint" className="mt-2 text-[11px] leading-5 text-muted-foreground">
        {t("hint")}
      </p>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p
            id="invitation-code-error"
            className="mt-3 flex items-start gap-2 text-xs leading-5 text-wedding-wine"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t(`errors.${error}`)}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="mt-5 h-13 w-full cursor-pointer justify-between rounded-lg bg-wedding-wine px-5 font-label text-xs font-medium text-wedding-cream hover:bg-[#650d20] motion-reduce:transform-none motion-reduce:transition-none"
      >
        <span>{t(isPending ? "checking" : "submit")}</span>
        {isPending ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <ArrowRight className="size-4" aria-hidden="true" />
        )}
      </Button>
    </form>
  );
}

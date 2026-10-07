"use client";

import { isAxiosError } from "axios";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type ReactElement,
  type SubmitEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCheckInvitationCode } from "@/hooks/queries/use-invitations";
import type { ApiErrorResponse } from "@/lib/api/types";

type FormError = "required" | "invalid" | "unavailable" | null;

export function InvitationCodeForm(): ReactElement {
  const t = useTranslations("HomePage.form");
  const router = useRouter();
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<FormError>(null);
  const [isNavigating, startNavigation] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const checkInvitation = useCheckInvitationCode();
  const isPending = checkInvitation.isPending || isNavigating;
  const isInvalid = error === "required" || error === "invalid";

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>): void {
    setCode(event.currentTarget.value);
    setError(null);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
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

      startNavigation((): void => {
        router.push(`/invitation/${encodeURIComponent(invitation.id)}`);
      });
    } catch (requestError: unknown) {
      setError(
        isAxiosError<ApiErrorResponse>(requestError) && requestError.response?.status === 404
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
        onChange={handleCodeChange}
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

      <div className="mt-5 flex justify-center">
        <Button
          type="submit"
          disabled={isPending}
          className="h-13 w-fit min-w-40 cursor-pointer justify-center gap-2 rounded-lg bg-wedding-wine px-6 text-center font-label text-xs font-medium text-wedding-cream hover:bg-[#650d20] motion-reduce:transform-none motion-reduce:transition-none"
        >
          <span>{t(isPending ? "checking" : "submit")}</span>
          {isPending && (
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
        </Button>
      </div>
    </form>
  );
}

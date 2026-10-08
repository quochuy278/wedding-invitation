"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type ClipboardEvent,
  type ReactElement,
  type SubmitEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useCheckInvitationCode } from "@/hooks/queries/use-invitations";
import { isApiErrorCode, type ResolvedApiError, resolveApiError } from "@/lib/api/error-resolver";
import { ApiErrorCode } from "@/lib/api/types";
import type { InvitationDto } from "@/shared/contracts/invitation";
import {
  invitationCodeInputPattern,
  invitationCodeLength,
  isInvitationCode,
  isInvitationCodeInput,
  normalizeInvitationCode,
} from "@/shared/utils/invitation-code";

type LocalFormError = "required" | "format" | "invalid";
type FormError = LocalFormError | ApiErrorCode | null;
const codeSlotIndices = [0, 1, 2, 3, 4, 5];

export function InvitationCodeForm(): ReactElement {
  const t: ReturnType<typeof useTranslations> = useTranslations("HomePage.form");
  const errorT: ReturnType<typeof useTranslations> = useTranslations("ApiErrors");
  const router: ReturnType<typeof useRouter> = useRouter();
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<FormError>(null);
  const [isNavigating, startNavigation] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const checkInvitation: ReturnType<typeof useCheckInvitationCode> = useCheckInvitationCode();
  const isPending: boolean = checkInvitation.isPending || isNavigating;
  const isInvalid: boolean = error === "required" || error === "format" || error === "invalid";
  const inputDescription: string = error
    ? "invitation-code-hint invitation-code-error"
    : "invitation-code-hint";
  const submitLabel: string = t(isPending ? "checking" : "submit");
  const errorMessage: string | null = error
    ? isApiErrorCode(error)
      ? errorT(error)
      : t(`errors.${error}`)
    : null;

  function handleCodeChange(value: string): void {
    setCode(normalizeInvitationCode(value));
    setError(null);
  }

  function handleCodePaste(event: ClipboardEvent<HTMLInputElement>): void {
    const pastedCode = normalizeInvitationCode(event.clipboardData.getData("text"));
    if (isInvitationCodeInput(pastedCode)) return;
    event.preventDefault();
    event.stopPropagation();
    setError("format");
  }

  function renderCodeSlot(index: number): ReactElement {
    return (
      <InputOTPSlot
        key={index}
        index={index}
        aria-invalid={isInvalid}
        className="h-14 min-w-0 flex-1 rounded-lg border border-wedding-warm-beige/65 bg-card font-label text-xl text-wedding-wine first:rounded-lg last:rounded-lg"
      />
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isPending) return;

    const normalizedCode: string = normalizeInvitationCode(code);
    setError(null);

    if (!normalizedCode) {
      setError("required");
      inputRef.current?.focus();
      return;
    }

    if (!isInvitationCode(normalizedCode)) {
      setError("format");
      inputRef.current?.focus();
      return;
    }

    setCode(normalizedCode);

    try {
      const invitation: InvitationDto | null = await checkInvitation.mutateAsync({
        code: normalizedCode,
      });

      if (!invitation) {
        setError("invalid");
        inputRef.current?.focus();
        return;
      }

      const invitationHref = `/invitation/${encodeURIComponent(invitation.code)}`;
      startNavigation((): void => router.push(invitationHref));
    } catch (requestError: unknown) {
      const resolvedError: ResolvedApiError = resolveApiError(requestError);
      const formError: FormError =
        resolvedError.code === ApiErrorCode.NotFound ? "invalid" : resolvedError.code;
      setError(formError);
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
      <InputOTP
        ref={inputRef}
        id="invitation-code"
        name="code"
        type="text"
        value={code}
        onChange={handleCodeChange}
        onPasteCapture={handleCodePaste}
        pasteTransformer={normalizeInvitationCode}
        pattern={invitationCodeInputPattern}
        maxLength={invitationCodeLength}
        required
        autoComplete="off"
        autoCapitalize="characters"
        inputMode="text"
        spellCheck={false}
        enterKeyHint="go"
        readOnly={isPending}
        aria-invalid={isInvalid}
        aria-describedby={inputDescription}
        containerClassName="w-full"
      >
        <InputOTPGroup className="w-full max-w-sm gap-2" aria-hidden="true">
          {codeSlotIndices.map(renderCodeSlot)}
        </InputOTPGroup>
      </InputOTP>
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
            {errorMessage}
          </p>
        )}
      </div>

      <div className="mt-5 flex justify-center">
        <Button
          type="submit"
          disabled={isPending}
          className="h-13 w-fit min-w-40 cursor-pointer justify-center gap-2 rounded-lg bg-wedding-wine px-6 text-center font-label text-xs font-medium text-wedding-cream hover:bg-[#650d20] motion-reduce:transform-none motion-reduce:transition-none"
        >
          <span>{submitLabel}</span>
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

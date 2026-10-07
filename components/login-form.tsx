"use client";

import { cn } from "cn";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type ComponentProps,
  type ReactElement,
  type SubmitEvent,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuthSession } from "@/hooks/use-auth";
import { type ResolvedApiError, resolveApiError } from "@/lib/api/error-resolver";
import type { ApiErrorCode } from "@/lib/api/types";
import { login } from "@/services/auth/auth.service";
import type { LoginInput } from "@/shared/contracts/auth";
import { AuthStatus } from "@/stores/auth.store";

type LoginFormProps = ComponentProps<"div">;
type LoginError = ApiErrorCode | null;

export function LoginForm({ className, ...props }: LoginFormProps): ReactElement {
  const t: ReturnType<typeof useTranslations> = useTranslations("LoginPage");
  const errorT: ReturnType<typeof useTranslations> = useTranslations("ApiErrors");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<LoginError>(null);
  const router: ReturnType<typeof useRouter> = useRouter();
  const session: ReturnType<typeof useAuthSession> = useAuthSession();
  const isCheckingSession: boolean =
    session.status === AuthStatus.Idle || session.status === AuthStatus.Checking;
  const isAuthenticated: boolean = session.status === AuthStatus.Authenticated;
  const busy: boolean = isCheckingSession || isSubmitting || isAuthenticated;

  useEffect((): void => {
    if (isAuthenticated) {
      router.replace("/dashboard");
      router.refresh();
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const formData: FormData = new FormData(event.currentTarget);
    const email: FormDataEntryValue | null = formData.get("email");
    const password: FormDataEntryValue | null = formData.get("password");
    if (typeof email !== "string" || typeof password !== "string") return;
    const input: LoginInput = { email, password };
    setIsSubmitting(true);
    try {
      await login(input);
      router.replace("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const resolvedError: ResolvedApiError = resolveApiError(error);
      setFormError(resolvedError.code);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTogglePassword(): void {
    setShowPassword((previous: boolean): boolean => !previous);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="gap-6 rounded-2xl shadow-[0_12px_40px_#72554708] ring-wedding-warm-beige/40 [--card-spacing:1.5rem] sm:[--card-spacing:2rem]">
        <CardHeader className="gap-3">
          <CardTitle className="text-[30px] font-normal tracking-[-0.025em] text-wedding-wine">
            <h1>{t("title")}</h1>
          </CardTitle>
          <CardDescription className="text-[13px] leading-6">{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={handleSubmit}>
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="email" className="font-label text-xs font-normal">
                  {t("emailLabel")}
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  disabled={busy}
                  required
                  className="h-12 border-wedding-warm-beige/65 bg-background/40 px-3.5 font-label text-base placeholder:text-muted-foreground/60 md:text-sm"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password" className="font-label text-xs font-normal">
                  {t("passwordLabel")}
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    maxLength={1024}
                    disabled={busy}
                    required
                    className="h-12 border-wedding-warm-beige/65 bg-background/40 pl-3.5 pr-12 font-label text-base md:text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t(showPassword ? "hidePassword" : "showPassword")}
                    aria-controls="password"
                    aria-pressed={showPassword}
                    className="absolute top-1 right-1 size-10 cursor-pointer text-muted-foreground hover:text-wedding-wine motion-reduce:transform-none motion-reduce:transition-none"
                    onClick={handleTogglePassword}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </Button>
                </div>
              </Field>
              <Field>
                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    {errorT(formError)}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-12 cursor-pointer justify-center bg-wedding-wine px-4 font-label text-xs text-wedding-cream hover:bg-[#650d20] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  {busy && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                  )}
                  {t(
                    isSubmitting
                      ? "submitting"
                      : isCheckingSession || isAuthenticated
                        ? "checkingSession"
                        : "submit",
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

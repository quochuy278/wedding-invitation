"use client";

import { cn } from "cn";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, type ReactElement, type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type LoginFormProps = ComponentProps<"div">;

export function LoginForm({ className, ...props }: LoginFormProps): ReactElement {
  const t = useTranslations("LoginPage");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
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
                <Button
                  type="submit"
                  className="h-12 cursor-pointer justify-center bg-wedding-wine px-4 font-label text-xs text-wedding-cream hover:bg-[#650d20] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  {t("submit")}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

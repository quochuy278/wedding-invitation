"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ResolvedApiError } from "@/lib/api/error-resolver";
import { ApiErrorCode } from "@/lib/api/types";
import { userService } from "@/services/users/user.service";
import { UserLevel } from "@/shared/contracts/auth";
import type { CreateUserInput, UserDto } from "@/shared/contracts/user";
import { AdminFormField } from "./form-field";
import { formText, hasFieldError } from "./form-values";

export function CreateUserForm(): ReactElement {
  const t = useTranslations("Admin.createUser");
  const apiErrors = useTranslations("ApiErrors");
  const [level, setLevel] = useState(UserLevel.Admin);
  const mutation = useMutation<UserDto, ResolvedApiError, CreateUserInput>({
    mutationFn: userService.create,
  });
  const isAdmin = level === UserLevel.Admin;
  const busy = mutation.isPending;
  const error = mutation.error;
  const message = error
    ? error.code === ApiErrorCode.Conflict
      ? t("conflict")
      : apiErrors(error.code)
    : null;

  function fieldError(name: string): string | undefined {
    return hasFieldError(error, name)
      ? t(name === "password" ? "invalidPassword" : "invalidField")
      : undefined;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const password = data.get("password");
    mutation.mutate({
      fullName: formText(data, "fullName"),
      email: formText(data, "email"),
      phoneNumber: formText(data, "phoneNumber") || null,
      level,
      ...(isAdmin && typeof password === "string" ? { password } : {}),
    });
  }

  function handleReset(): void {
    mutation.reset();
    setLevel(UserLevel.Admin);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {mutation.data ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("created")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p role="status">
              {mutation.data.fullName} · {mutation.data.email}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(mutation.data.level === UserLevel.Admin ? "adminReady" : "guestReady")}
            </p>
            <Button onClick={handleReset}>{t("createAnother")}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("formTitle")}</CardTitle>
            <CardDescription>{t("formDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} onReset={handleReset}>
              <fieldset disabled={busy} className="min-w-0">
                <FieldGroup>
                  <AdminFormField
                    name="fullName"
                    label={t("fullName")}
                    autoComplete="name"
                    maxLength={200}
                    required
                    error={fieldError("fullName")}
                  />
                  <AdminFormField
                    name="email"
                    label={t("email")}
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    error={fieldError("email")}
                  />
                  <AdminFormField
                    name="phoneNumber"
                    label={t("phone")}
                    type="tel"
                    autoComplete="tel"
                    maxLength={50}
                    error={fieldError("phoneNumber")}
                  />
                  <Field>
                    <FieldLabel htmlFor="level">{t("role")}</FieldLabel>
                    <NativeSelect
                      id="level"
                      name="level"
                      value={level}
                      onChange={(event) =>
                        setLevel(
                          event.currentTarget.value === String(UserLevel.Admin)
                            ? UserLevel.Admin
                            : UserLevel.Guest,
                        )
                      }
                      className="w-full"
                    >
                      <NativeSelectOption value={UserLevel.Admin}>{t("admin")}</NativeSelectOption>
                      <NativeSelectOption value={UserLevel.Guest}>{t("guest")}</NativeSelectOption>
                    </NativeSelect>
                    <FieldDescription>{t(isAdmin ? "adminHint" : "guestHint")}</FieldDescription>
                  </Field>
                  {isAdmin && (
                    <AdminFormField
                      name="password"
                      label={t("password")}
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={1024}
                      required
                      hint={t("passwordHint")}
                      error={fieldError("password")}
                    />
                  )}
                  {message && (
                    <p role="alert" className="text-sm text-destructive">
                      {message}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button type="submit">{t(busy ? "creating" : "create")}</Button>
                    <Button type="reset" variant="outline">
                      {t("reset")}
                    </Button>
                  </div>
                </FieldGroup>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

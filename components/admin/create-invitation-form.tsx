"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ChangeEvent, type FormEvent, type ReactElement, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAddresses } from "@/hooks/queries/use-addresses";
import { useCreateInvitation } from "@/hooks/queries/use-invitations";
import { ApiErrorCode } from "@/lib/api/types";
import type { AddressDto } from "@/shared/contracts/address";
import type { CreateInvitationInput } from "@/shared/contracts/invitation";
import { AddressSummary } from "./address-summary";
import { AdminFormField } from "./form-field";
import { formText, formTimestamp, hasFieldError } from "./form-values";

export function CreateInvitationForm({
  initialAddressId,
}: {
  initialAddressId: string;
}): ReactElement {
  const t = useTranslations("Admin.createInvitation");
  const apiErrors = useTranslations("ApiErrors");
  const addresses = useAddresses();
  const mutation = useCreateInvitation();
  const [selectedAddressId, setSelectedAddressId] = useState(initialAddressId);
  const [timezone, setTimezone] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const items = addresses.data?.items ?? [];
  const selectedAddress = items.find((address) => address.id === selectedAddressId);
  const created = mutation.data;
  const busy = mutation.isPending;
  const hasAddresses = items.length > 0;
  const loadingAddresses = addresses.isPending || (addresses.isFetching && !hasAddresses);
  const showForm = !loadingAddresses && !addresses.isError && hasAddresses;
  const disabled = busy || Boolean(created);
  const submitDisabled = disabled || !selectedAddress;
  const submitLabel = busy ? t("creating") : t("create");
  const queryError = addresses.error ? apiErrors(addresses.error.code) : null;
  const isContactConflict = mutation.error?.code === ApiErrorCode.Conflict;
  const mutationError = mutation.error
    ? isContactConflict
      ? t("contactConflict")
      : apiErrors(mutation.error.code)
    : null;
  const timezoneHint = timezone ? t("timezoneHint", { timezone }) : undefined;
  const previewHref = created ? `/invitation/${encodeURIComponent(created.code)}` : "";
  const copyLabel = copyStatus === "copied" ? t("copied") : t("copyLink");
  const copyError = copyStatus === "failed" ? t("copyFailed") : null;
  const empty = !loadingAddresses && !addresses.isError && !hasAddresses;

  useEffect(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(browserTimezone);
  }, []);

  function fieldError(name: string): string | undefined {
    const invalid = hasFieldError(mutation.error, name);
    if (!invalid) return undefined;
    const contactField = name === "email" || name === "phoneNumber";
    const duplicateContact = isContactConflict && contactField;
    if (duplicateContact) return t("duplicateContact");
    if (name === "expiresAt") return t("invalidDeadline");
    if (name === "addressId") return t("invalidAddress");
    return t("invalidField");
  }

  function renderAddressOption(address: AddressDto): ReactElement {
    const label = `${address.name} · ${address.addressText}`;
    return (
      <NativeSelectOption key={address.id} value={address.id}>
        {label}
      </NativeSelectOption>
    );
  }

  function handleAddressChange(event: ChangeEvent<HTMLSelectElement>): void {
    setSelectedAddressId(event.currentTarget.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (submitDisabled) return;
    const data = new FormData(event.currentTarget);
    const input: CreateInvitationInput = {
      guestName: formText(data, "guestName"),
      email: formText(data, "email"),
      phoneNumber: formText(data, "phoneNumber") || null,
      addressId: selectedAddressId,
      expiresAt: formTimestamp(data, "expiresAt"),
      personalMessage: formText(data, "personalMessage") || null,
    };
    mutation.mutate(input);
  }

  function handleReset(): void {
    mutation.reset();
    setSelectedAddressId(initialAddressId);
    setCopyStatus("idle");
  }

  function handleRetryAddresses(): void {
    void addresses.refetch();
  }

  async function handleCopyLink(): Promise<void> {
    const invitationUrl = new URL(previewHref, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  const guestNameError = fieldError("guestName");
  const phoneError = fieldError("phoneNumber");
  const emailError = fieldError("email");
  const addressError = fieldError("addressId");
  const deadlineError = fieldError("expiresAt");
  const personalMessageError = fieldError("personalMessage");
  const addressInvalid = Boolean(addressError);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="font-heading text-3xl text-wedding-wine">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {loadingAddresses && <Skeleton className="h-80" aria-label={t("loadingAddresses")} />}
      {addresses.isError && (
        <Card>
          <CardContent className="space-y-4">
            <p role="alert">{queryError}</p>
            <Button onClick={handleRetryAddresses} disabled={addresses.isFetching}>
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      )}
      {empty && (
        <Card>
          <CardContent className="space-y-4">
            <p>{t("noAddresses")}</p>
            <Button nativeButton={false} render={<Link href="/dashboard/addresses/new" />}>
              {t("createAddress")}
            </Button>
          </CardContent>
        </Card>
      )}
      {showForm && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <CardTitle>{t("formTitle")}</CardTitle>
              <CardDescription>{t("formDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} onReset={handleReset}>
                <fieldset disabled={disabled} className="min-w-0">
                  <FieldGroup>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <AdminFormField
                        name="guestName"
                        label={t("guestName")}
                        placeholder={t("guestNamePlaceholder")}
                        autoComplete="name"
                        required
                        maxLength={200}
                        error={guestNameError}
                      />
                      <AdminFormField
                        name="phoneNumber"
                        label={t("phone")}
                        placeholder={t("phonePlaceholder")}
                        autoComplete="tel"
                        type="tel"
                        maxLength={50}
                        error={phoneError}
                      />
                    </div>
                    <AdminFormField
                      name="email"
                      label={t("email")}
                      placeholder={t("emailPlaceholder")}
                      hint={t("emailHint")}
                      autoComplete="email"
                      type="email"
                      required
                      maxLength={254}
                      error={emailError}
                    />
                    <Field data-invalid={addressInvalid}>
                      <FieldLabel htmlFor="addressId">{t("address")}</FieldLabel>
                      <NativeSelect
                        id="addressId"
                        name="addressId"
                        value={selectedAddressId}
                        onChange={handleAddressChange}
                        required
                        aria-invalid={addressInvalid}
                        className="w-full"
                      >
                        <NativeSelectOption value="" disabled>
                          {t("chooseAddress")}
                        </NativeSelectOption>
                        {items.map(renderAddressOption)}
                      </NativeSelect>
                      {addressError && <FieldError>{addressError}</FieldError>}
                      <FieldDescription>
                        <Link href="/dashboard/addresses/new" className="underline">
                          {t("createAddress")}
                        </Link>
                      </FieldDescription>
                    </Field>
                    <AdminFormField
                      name="expiresAt"
                      label={t("responseDeadline")}
                      hint={timezoneHint}
                      type="datetime-local"
                      required
                      error={deadlineError}
                    />
                    <Field>
                      <FieldLabel htmlFor="personalMessage">{t("personalMessage")}</FieldLabel>
                      <Textarea
                        id="personalMessage"
                        name="personalMessage"
                        placeholder={t("messagePlaceholder")}
                        rows={5}
                        maxLength={2000}
                      />
                      {personalMessageError && <FieldError>{personalMessageError}</FieldError>}
                      <FieldDescription>{t("messageHint")}</FieldDescription>
                    </Field>
                  </FieldGroup>
                </fieldset>
                {mutationError && (
                  <p role="alert" className="mt-5 text-sm text-destructive">
                    {mutationError}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <Button type="reset" variant="outline" disabled={busy}>
                    {t("reset")}
                  </Button>
                  <Button type="submit" disabled={submitDisabled}>
                    {submitLabel}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>{t("previewTitle")}</CardTitle>
              <CardDescription>{t("previewDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {created && (
                <div className="rounded-2xl border bg-wedding-cream p-6 text-center">
                  <p role="status" className="text-sm">
                    {t("created")}
                  </p>
                  <p className="mt-4 font-heading text-3xl text-wedding-wine">Huy &amp; Phụng</p>
                  <p className="mt-4 font-heading text-xl">{created.guestName}</p>
                  <p className="mt-5 text-xs text-muted-foreground">{t("previewCode")}</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold">{created.code}</p>
                </div>
              )}
              {selectedAddress && <AddressSummary address={selectedAddress} />}
              {created && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={previewHref} target="_blank" />}
                  >
                    {t("preview")}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCopyLink}>
                    {copyLabel}
                  </Button>
                </div>
              )}
              {copyError && (
                <p role="alert" className="text-sm text-destructive">
                  {copyError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t("emailNotSent")}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

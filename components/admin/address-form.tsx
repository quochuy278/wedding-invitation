"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ChangeEvent, type FormEvent, type ReactElement, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAddress } from "@/hooks/queries/use-addresses";
import { type CreateAddressInput, locationTypes } from "@/shared/contracts/address";
import { AddressSummary } from "./address-summary";
import { AdminFormField } from "./form-field";
import { formText, formZonedTimestamp, hasFieldError } from "./form-values";

type AddressTextField = {
  name:
    | "addressLine1"
    | "addressLine2"
    | "postalCode"
    | "city"
    | "region"
    | "country"
    | "floor"
    | "entrance";
  required?: boolean;
  maximum: number;
};
const streetFields: AddressTextField[] = [
  { name: "addressLine1", required: true, maximum: 300 },
  { name: "addressLine2", maximum: 300 },
  { name: "postalCode", required: true, maximum: 32 },
  { name: "city", required: true, maximum: 150 },
  { name: "region", maximum: 150 },
  { name: "country", required: true, maximum: 150 },
];
const accessFields: AddressTextField[] = [
  { name: "floor", maximum: 100 },
  { name: "entrance", maximum: 200 },
];

function formCoordinate(data: FormData, name: string): number | null {
  const text = formText(data, name);
  return text ? Number(text) : null;
}

export function AddressForm(): ReactElement {
  const t = useTranslations("Admin.addresses");
  const apiErrors = useTranslations("ApiErrors");
  const mutation = useCreateAddress();
  const [timezone, setTimezone] = useState("");
  const busy = mutation.isPending;
  const created = mutation.data;
  const disabled = busy || Boolean(created);
  const submitLabel = busy ? t("saving") : t("save");
  const errorMessage = mutation.error ? apiErrors(mutation.error.code) : null;
  const timezoneHint = timezone ? t("timezoneHint", { timezone }) : undefined;
  const invitationHref = created
    ? `/dashboard/invitations/new?addressId=${encodeURIComponent(created.id)}`
    : "/dashboard/invitations/new";

  useEffect(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(browserTimezone);
  }, []);

  function fieldError(name: string): string | undefined {
    const invalid = hasFieldError(mutation.error, name);
    return invalid ? t("invalidField") : undefined;
  }

  function renderTextField(field: AddressTextField): ReactElement {
    const label = t(field.name);
    const error = fieldError(field.name);
    return (
      <AdminFormField
        key={field.name}
        name={field.name}
        label={label}
        error={error}
        required={field.required}
        maxLength={field.maximum}
      />
    );
  }

  function renderLocationType(locationType: (typeof locationTypes)[number]): ReactElement {
    const label = t(`types.${locationType}`);
    return (
      <NativeSelectOption key={locationType} value={locationType}>
        {label}
      </NativeSelectOption>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (disabled) return;
    const data = new FormData(event.currentTarget);
    const selectedLocationType = formText(data, "locationType");
    const locationType = locationTypes.find((value) => value === selectedLocationType) ?? "other";
    const input: CreateAddressInput = {
      name: formText(data, "name"),
      addressText: formText(data, "addressText"),
      addressLine1: formText(data, "addressLine1"),
      addressLine2: formText(data, "addressLine2") || null,
      locationType,
      postalCode: formText(data, "postalCode"),
      city: formText(data, "city"),
      region: formText(data, "region") || null,
      country: formText(data, "country"),
      instructions: formText(data, "instructions") || null,
      floor: formText(data, "floor") || null,
      entrance: formText(data, "entrance") || null,
      latitude: formCoordinate(data, "latitude"),
      longitude: formCoordinate(data, "longitude"),
      eventAt: formZonedTimestamp(data, "eventAt", timezone),
      eventTimeZone: timezone,
    };
    mutation.mutate(input);
  }

  function handleReset(): void {
    mutation.reset();
  }

  function handleTimezoneChange(event: ChangeEvent<HTMLInputElement>): void {
    setTimezone(event.currentTarget.value);
  }

  const nameError = fieldError("name");
  const eventAtError = fieldError("eventAt");
  const timeZoneError = fieldError("eventTimeZone");
  const addressTextError = fieldError("addressText");
  const typeError = fieldError("locationType");
  const instructionsError = fieldError("instructions");
  const latitudeError = fieldError("latitude");
  const longitudeError = fieldError("longitude");
  const typeInvalid = Boolean(typeError);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl text-wedding-wine">{t("createTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("createDescription")}</p>
      </div>
      {created && (
        <Card>
          <CardHeader>
            <CardTitle role="status">{t("saved")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressSummary address={created} />
            <Button nativeButton={false} render={<Link href={invitationHref} />}>
              {t("useForInvitation")}
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("detailsTitle")}</CardTitle>
          <CardDescription>{t("requiredHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} onReset={handleReset}>
            <fieldset disabled={disabled} className="min-w-0">
              <FieldGroup>
                <AdminFormField
                  name="name"
                  label={t("name")}
                  error={nameError}
                  required
                  maxLength={200}
                />
                <AdminFormField
                  name="eventAt"
                  label={t("eventAt")}
                  hint={timezoneHint}
                  error={eventAtError}
                  type="datetime-local"
                  required
                />
                <AdminFormField
                  name="eventTimeZone"
                  label={t("eventTimeZone")}
                  value={timezone}
                  onChange={handleTimezoneChange}
                  list="event-time-zones"
                  error={timeZoneError}
                  required
                />
                <datalist id="event-time-zones">
                  <option value="Asia/Ho_Chi_Minh" />
                  <option value="Europe/Berlin" />
                  <option value="UTC" />
                </datalist>
                <Field>
                  <FieldLabel htmlFor="addressText">{t("addressText")}</FieldLabel>
                  <Textarea
                    id="addressText"
                    name="addressText"
                    rows={3}
                    required
                    maxLength={2000}
                  />
                  <FieldDescription>{t("addressTextHint")}</FieldDescription>
                  {addressTextError && <FieldError>{addressTextError}</FieldError>}
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">{streetFields.map(renderTextField)}</div>
                <Field data-invalid={typeInvalid}>
                  <FieldLabel htmlFor="locationType">{t("locationType")}</FieldLabel>
                  <NativeSelect
                    id="locationType"
                    name="locationType"
                    defaultValue=""
                    required
                    aria-invalid={typeInvalid}
                  >
                    <NativeSelectOption value="" disabled>
                      {t("chooseType")}
                    </NativeSelectOption>
                    {locationTypes.map(renderLocationType)}
                  </NativeSelect>
                  {typeError && <FieldError>{typeError}</FieldError>}
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">{accessFields.map(renderTextField)}</div>
                <Field>
                  <FieldLabel htmlFor="instructions">{t("instructions")}</FieldLabel>
                  <Textarea id="instructions" name="instructions" rows={3} maxLength={2000} />
                  {instructionsError && <FieldError>{instructionsError}</FieldError>}
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <AdminFormField
                    name="latitude"
                    label={t("latitude")}
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    error={latitudeError}
                  />
                  <AdminFormField
                    name="longitude"
                    label={t("longitude")}
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    error={longitudeError}
                  />
                </div>
                <FieldDescription>{t("coordinatesHint")}</FieldDescription>
              </FieldGroup>
            </fieldset>
            {errorMessage && (
              <p role="alert" className="mt-5 text-sm text-destructive">
                {errorMessage}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button type="reset" variant="outline" disabled={busy}>
                {t("reset")}
              </Button>
              <Button type="submit" disabled={disabled}>
                {submitLabel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

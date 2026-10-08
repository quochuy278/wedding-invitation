"use client";

import type { ComponentProps, ReactElement } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AdminFormFieldProps = ComponentProps<typeof Input> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

export function AdminFormField({
  name,
  label,
  hint,
  error,
  ...props
}: AdminFormFieldProps): ReactElement {
  const invalid = Boolean(error);
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}

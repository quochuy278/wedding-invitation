"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { vi } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { localDateTimeValue, parseDisplayDate } from "./form-values";

type AdminDateTimeFieldProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
};

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export function AdminDateTimeField({
  name,
  label,
  hint,
  error,
  disabled,
}: AdminDateTimeFieldProps): ReactElement {
  const t = useTranslations("Admin.dateTime");
  const [dateText, setDateText] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("00");
  const [open, setOpen] = useState(false);
  const dateInput = useRef<HTMLInputElement>(null);
  const date = parseDisplayDate(dateText);
  const invalid = Boolean(error);
  const hintId = `${name}-hint`;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ");

  useEffect(() => {
    const invalidDate = dateText !== "" && !parseDisplayDate(dateText);
    dateInput.current?.setCustomValidity(invalidDate ? t("invalidDate") : "");
  }, [dateText, t]);

  function selectDate(selected: Date | undefined): void {
    setDateText(selected ? format(selected, "dd/MM/yyyy") : "");
    if (selected) setOpen(false);
  }

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={`${name}-date`}>{label}</FieldLabel>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem_5rem]">
        <div className="flex items-end gap-2">
          <Input
            ref={dateInput}
            id={`${name}-date`}
            name={`${name}-date`}
            type="text"
            value={dateText}
            onChange={(event) => setDateText(event.currentTarget.value)}
            placeholder="dd/mm/yyyy"
            pattern="\d{2}/\d{2}/\d{4}"
            maxLength={10}
            autoComplete="off"
            required
            disabled={disabled}
            aria-invalid={invalid || (dateText.length === 10 && !date)}
            aria-describedby={describedBy}
          />
          <Popover open={open && !disabled} onOpenChange={setOpen}>
            <PopoverTrigger
              render={<Button type="button" variant="outline" size="icon" />}
              aria-label={t("chooseDate", { label })}
              disabled={disabled}
            >
              <CalendarIcon aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                locale={vi}
                selected={date}
                defaultMonth={date}
                onSelect={selectDate}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <div className="space-y-1">
            <label htmlFor={`${name}-hour`} className="text-xs text-muted-foreground">
              {t("hour")}
            </label>
            <NativeSelect
              id={`${name}-hour`}
              name={`${name}-hour`}
              value={hour}
              onChange={(event) => setHour(event.currentTarget.value)}
              required
              disabled={disabled}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className="w-full"
            >
              <NativeSelectOption value="" disabled>
                --
              </NativeSelectOption>
              {hours.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <label htmlFor={`${name}-minute`} className="text-xs text-muted-foreground">
              {t("minute")}
            </label>
            <NativeSelect
              id={`${name}-minute`}
              name={`${name}-minute`}
              value={minute}
              onChange={(event) => setMinute(event.currentTarget.value)}
              required
              disabled={disabled}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className="w-full"
            >
              {minutes.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>
      <input type="hidden" name={name} value={localDateTimeValue(dateText, hour, minute)} />
      <FieldDescription id={hintId}>
        {t("formatHint")} {hint}
      </FieldDescription>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}

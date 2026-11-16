"use client";

import { useEffect, useId, useRef, useState } from "react";
import RPNInput from "react-phone-number-input";
import es from "react-phone-number-input/locale/es.json";

import { describedBy, fieldErrorId } from "@/components/ui/field";
import { cn } from "@/lib/cn";

import { hasOnlyPhoneCharacters } from "./phone";
import { PhoneCountrySelect } from "./phone-country-select";

export const INVALID_PHONE_MESSAGE = "Ingresá un teléfono válido.";
const INVALID_PHONE_FORMAT_MESSAGE = "El teléfono solo puede tener números y espacios, y un + al principio.";

// Why a typed phone was rejected: a wrong format gets its own explanation.
export function getPhoneErrorMessage(raw: string): string {
  const isBlank = raw.trim() === "";
  return isBlank || hasOnlyPhoneCharacters(raw) ? INVALID_PHONE_MESSAGE : INVALID_PHONE_FORMAT_MESSAGE;
}

interface PhoneInputProps {
  id?: string;
  /** FormData field name, used only when the field is uncontrolled (no `value`/`onChange`). */
  name?: string;
  /** E.164-ish value (e.g. `"+59899123456"`), controlled. Omit to let the field manage its own state. */
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

// The phone field of the register, complete-profile and client-edit forms:
// a country flag + calling-code select (searchable, left) and the national
// number (right) that together behave as one input and produce a single
// E.164 value. Numbers typed without picking a country read as Uruguayan,
// matching `phone.ts`'s `DEFAULT_COUNTRY`.
//
// Uncontrolled callers (no `value`/`onChange`) get a hidden `name` input
// carrying the combined E.164 value, since the library's own `name` would
// land on the national-number-only input — wrong for any non-default
// country. Controlled callers get the value/onChange straight from state.
export function PhoneInput({ id, name = "phone", value, onChange, error, autoFocus, disabled }: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = fieldErrorId(inputId);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(value ?? "");
  const currentValue = isControlled ? value : internalValue;
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  function handleChange(next?: string) {
    const nextValue = next ?? "";
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  // The library keeps the number as React state, so a plain `form.reset()`
  // (used by uncontrolled callers to clear a cached, hidden page — see
  // `complete-profile-form.tsx`) wouldn't touch it the way it clears native
  // inputs. Watching the form's own "reset" event keeps that working.
  useEffect(() => {
    if (isControlled) return;
    const form = hiddenInputRef.current?.closest("form");
    if (!form) return;
    function handleReset() {
      setInternalValue("");
    }
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [isControlled]);

  return (
    <div>
      <label htmlFor={inputId} className="text-xs font-medium text-muted">
        Teléfono
      </label>
      <div
        className={cn(
          "mt-2 flex w-full items-center rounded border border-line bg-soft focus-within:border-white",
          error && "border-danger",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <RPNInput
          defaultCountry="UY"
          countryCallingCodeEditable={false}
          addInternationalOption={false}
          initialValueFormat="national"
          smartCaret={false}
          labels={es}
          value={currentValue || undefined}
          onChange={handleChange}
          disabled={disabled}
          countrySelectComponent={PhoneCountrySelect}
          numberInputProps={{
            id: inputId,
            autoFocus,
            autoComplete: "tel",
            placeholder: "099 123 456",
            "aria-invalid": Boolean(error),
            "aria-describedby": describedBy(inputId, error),
            className:
              "min-w-0 flex-1 border-0 bg-transparent py-2.5 pr-3.5 pl-2 text-sm text-white placeholder:text-muted/80 outline-none disabled:cursor-not-allowed",
          }}
          className="flex w-full items-center"
        />
      </div>
      {!isControlled ? <input ref={hiddenInputRef} type="hidden" name={name} value={currentValue} /> : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

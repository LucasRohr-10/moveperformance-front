"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { useSnackbar } from "@/components/ui/snackbar";
import type { Route } from "@/config/constants/routes.constants";
import { BIRTH_DATE_MIN } from "@/lib/birth-date";
import { safeRedirectPath } from "@/lib/redirect-path";
import { useIsHydrated } from "@/lib/use-is-hydrated";

import { toE164Phone } from "./phone";
import {
  getPhoneErrorMessage,
  INVALID_PHONE_MESSAGE,
  PhoneInput,
} from "./phone-input";
import { birthDateSchema } from "./schemas";
import {
  type ProfileUpdate,
  UPDATE_PROFILE_ERRORS,
  type UpdateProfileError,
  updateProfile,
} from "./update-profile";
import { useBusinessToday } from "./use-business-today";

type FieldErrors = Partial<Record<keyof ProfileUpdate, string>>;

const UNAVAILABLE_MESSAGE = "No pudimos guardar tus datos. Probá de nuevo en unos minutos.";
const INVALID_BIRTH_DATE_MESSAGE = "Revisá la fecha de nacimiento.";

interface CompleteProfileFormProps {
  // The user's own area, where they continue once the profile is saved when
  // there is no page they were trying to reach.
  homeHref: Route;
  askPhone: boolean;
  askBirthDate: boolean;
}

function introFor(askPhone: boolean, askBirthDate: boolean): string {
  if (askPhone && askBirthDate) return "Necesitamos tu teléfono y tu fecha de nacimiento.";
  if (askBirthDate) return "Necesitamos tu fecha de nacimiento para saludarte en tu cumpleaños.";
  return "Necesitamos tu teléfono para avisarte de tus reservas y tu plan.";
}

function errorMessageFor(error: UpdateProfileError, askPhone: boolean, askBirthDate: boolean): string {
  if (error === UPDATE_PROFILE_ERRORS.UNAVAILABLE) return UNAVAILABLE_MESSAGE;
  if (askPhone && askBirthDate) return "Revisá tu teléfono y tu fecha de nacimiento.";
  return askBirthDate ? INVALID_BIRTH_DATE_MESSAGE : INVALID_PHONE_MESSAGE;
}

function birthDateError(value: string): string | undefined {
  const parsed = birthDateSchema().safeParse(value);
  return parsed.success ? undefined : z.flattenError(parsed.error).formErrors[0];
}

// Reads only the fields this form asks for; returns the update or the errors to show.
function readProfile(
  form: HTMLFormElement,
  askPhone: boolean,
  askBirthDate: boolean,
): { update: ProfileUpdate; errors: FieldErrors } {
  const formData = new FormData(form);
  const update: ProfileUpdate = {};
  const errors: FieldErrors = {};
  if (askPhone) {
    const rawPhone = String(formData.get("phone") ?? "");
    const phone = toE164Phone(rawPhone);
    if (phone) update.phone = phone;
    else errors.phone = getPhoneErrorMessage(rawPhone);
  }
  if (askBirthDate) {
    const birthDate = String(formData.get("birthDate") ?? "").trim();
    const error = birthDateError(birthDate);
    if (error) errors.birthDate = error;
    else update.birthDate = birthDate;
  }
  return { update, errors };
}

export function CompleteProfileForm({ homeHref, askPhone, askBirthDate }: CompleteProfileFormProps) {
  const today = useBusinessToday();
  const router = useRouter();
  // The page requireUser bounced the user from, re-validated since the query
  // string is attacker-visible.
  const redirectTo = safeRedirectPath(useSearchParams().get("redirectTo"));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();
  const formToResetOnHide = useRef<HTMLFormElement | null>(null);

  // With cacheComponents, Next keeps this page alive (hidden) after navigating
  // away; reset it so coming back does not show a stuck button.
  useLayoutEffect(() => {
    return () => {
      const form = formToResetOnHide.current;
      if (!form) return;
      formToResetOnHide.current = null;
      form.reset();
      setIsSubmitting(false);
    };
  }, []);

  // The phone field reports its value through `onChange`: the hidden input that carries it for FormData only updates
  // after this render, so the form's change event cannot see the new value.
  function handlePhoneChange(phone: string) {
    if (!fieldErrors.phone) return;
    setFieldErrors((current) => ({
      ...current,
      phone: toE164Phone(phone) ? undefined : getPhoneErrorMessage(phone),
    }));
  }

  function handleBirthDateChange(value: string) {
    if (!fieldErrors.birthDate) return;
    setFieldErrors((current) => ({ ...current, birthDate: birthDateError(value) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { update, errors } = readProfile(form, askPhone, askBirthDate);

    if (errors.phone || errors.birthDate) {
      setFieldErrors(errors);
      reportInvalid(form, errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await updateProfile(update);

    if (!result.ok) {
      showSnackbar({ tone: "danger", title: errorMessageFor(result.error, askPhone, askBirthDate) });
      setIsSubmitting(false);
      return;
    }

    // Stays "submitting" while the next page loads so it cannot be sent twice.
    formToResetOnHide.current = form;
    router.replace(redirectTo ?? homeHref);
  }

  return (
    <Card className="mt-10">
      <p className="text-sm leading-relaxed text-muted">{introFor(askPhone, askBirthDate)}</p>
      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
        {askPhone ? <PhoneInput error={fieldErrors.phone} onChange={handlePhoneChange} /> : null}
        {askBirthDate ? (
          <Input
            label="Fecha de nacimiento"
            name="birthDate"
            type="date"
            autoComplete="bday"
            min={BIRTH_DATE_MIN}
            max={today}
            onChange={(event) => handleBirthDateChange(event.target.value)}
            error={fieldErrors.birthDate}
          />
        ) : null}
        <Button type="submit" fullWidth disabled={isSubmitting || !isHydrated}>
          {isSubmitting ? "Guardando…" : "Continuar"}
        </Button>
      </form>
    </Card>
  );
}

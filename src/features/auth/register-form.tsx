"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { changedFieldName, fieldErrorFor, useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { BIRTH_DATE_MIN } from "@/lib/birth-date";
import { useIsHydrated } from "@/lib/use-is-hydrated";

import { listenForEmailVerified } from "./email-verified-channel";
import { EmailVerifiedView, GoToProfileButton } from "./email-verified-view";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { PhoneInput } from "./phone-input";
import { ResendVerificationEmailButton } from "./resend-verification-email-button";
import { signUpSchema, SIGN_UP_ERROR_MESSAGES } from "./schemas";
import { signUpWithEmail } from "./sign-up";
import { useBusinessToday } from "./use-business-today";

type RegisterFields = z.infer<typeof signUpSchema>;
type FieldErrors = Partial<Record<keyof RegisterFields, string>>;

const CHECK_EMAIL_MESSAGE =
  "¡Listo! Te mandamos un mail para confirmar tu cuenta. Tocá el enlace para poder ingresar.";

interface RegisterFormProps {
  // Other ways to sign up (e.g. Google). Shown with the form, hidden once the
  // account exists: the user only has to confirm their email.
  children?: ReactNode;
}

function signUpValues(form: HTMLFormElement) {
  const formData = new FormData(form);
  return {
    name: String(formData.get("name") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

export function RegisterForm({ children }: RegisterFormProps) {
  const today = useBusinessToday();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();
  // The email the account was created with; set once sign-up succeeds.
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [passwordForMeter, setPasswordForMeter] = useState("");
  const resetOnHide = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // With cacheComponents, Next keeps this page alive (hidden) after navigating
  // away; reset it so coming back to /register doesn't show the stale
  // "check your email" card instead of a fresh form.
  useLayoutEffect(() => {
    return () => {
      if (!resetOnHide.current) return;
      resetOnHide.current = false;
      setSubmittedEmail(null);
      setEmailVerified(false);
      setIsSubmitting(false);
      setPasswordForMeter("");
    };
  }, []);

  // The confirmation link opens in another tab; it tells this one when done.
  useEffect(() => {
    if (!submittedEmail) return;
    return listenForEmailVerified(() => setEmailVerified(true));
  }, [submittedEmail]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse(signUpValues(event.currentTarget));

    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      const nextErrors = {
        name: errors.name?.[0],
        lastName: errors.lastName?.[0],
        birthDate: errors.birthDate?.[0],
        email: errors.email?.[0],
        phone: errors.phone?.[0],
        password: errors.password?.[0],
      };
      setFieldErrors(nextErrors);
      reportInvalid(event.currentTarget, nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await signUpWithEmail({
      name: parsed.data.name,
      lastName: parsed.data.lastName,
      birthDate: parsed.data.birthDate,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      callbackURL: new URL(
        ROUTES.VERIFY_EMAIL,
        window.location.origin,
      ).toString(),
    });

    if (!result.ok) {
      showSnackbar({ tone: "danger", title: SIGN_UP_ERROR_MESSAGES[result.error] });
      setIsSubmitting(false);
      return;
    }

    resetOnHide.current = true;
    setSubmittedEmail(parsed.data.email);
  }

  // The phone field reports its value through `onChange`: its visible input has no `name`, and the hidden one that
  // carries the value for FormData only updates after this render, so the form's change event cannot see it.
  function handlePhoneChange(phone: string) {
    if (!fieldErrors.phone || !formRef.current) return;
    const error = fieldErrorFor(signUpSchema, { ...signUpValues(formRef.current), phone }, "phone");
    setFieldErrors((current) => ({ ...current, phone: error }));
  }

  function handleFieldChange(event: ChangeEvent<HTMLFormElement>) {
    const field = changedFieldName(event) as keyof FieldErrors;
    if (!fieldErrors[field]) return;
    const error = fieldErrorFor(signUpSchema, signUpValues(event.currentTarget), field);
    setFieldErrors((current) => ({ ...current, [field]: error }));
  }

  if (submittedEmail && emailVerified) {
    return (
      <Card>
        <EmailVerifiedView headingAs="h2">
          <GoToProfileButton />
        </EmailVerifiedView>
      </Card>
    );
  }

  if (submittedEmail) {
    return (
      <Card>
        <p role="status" className="text-sm leading-relaxed text-muted">
          {CHECK_EMAIL_MESSAGE}
        </p>
        <div className="mt-5">
          <ResendVerificationEmailButton email={submittedEmail} />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <form ref={formRef} noValidate onSubmit={handleSubmit} onChange={handleFieldChange} className="space-y-5">
          <Input
            label="Nombre"
            name="name"
            type="text"
            autoComplete="given-name"
            placeholder="Ana"
            error={fieldErrors.name}
          />
          <Input
            label="Apellido"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Pérez"
            error={fieldErrors.lastName}
          />
          <Input
            label="Fecha de nacimiento"
            name="birthDate"
            type="date"
            autoComplete="bday"
            min={BIRTH_DATE_MIN}
            max={today}
            error={fieldErrors.birthDate}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            error={fieldErrors.email}
          />
          <PhoneInput error={fieldErrors.phone} onChange={handlePhoneChange} />
          <div>
            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              onChange={(event) => setPasswordForMeter(event.target.value)}
              error={fieldErrors.password}
            />
            <PasswordStrengthMeter password={passwordForMeter} />
          </div>
          <Button type="submit" fullWidth disabled={isSubmitting || !isHydrated}>
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>
      </Card>
      {children ? <div className="mt-6">{children}</div> : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, type FormEvent, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { changedFieldName, fieldErrorFor, useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { safeRedirectPath } from "@/lib/redirect-path";
import { useIsHydrated } from "@/lib/use-is-hydrated";

import { ResendVerificationEmailButton } from "./resend-verification-email-button";
import { loginSchema, SIGN_IN_ERROR_MESSAGES } from "./schemas";
import { SIGN_IN_ERRORS, signInWithEmail } from "./sign-in";

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

function loginValues(form: HTMLFormElement) {
  const formData = new FormData(form);
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export function LoginForm() {
  const router = useRouter();
  // Where requireUser/requireRole bounced the visitor from, or where the
  // public nav's "Ingresar" link sent them from — carried back to after a
  // successful sign-in. Re-validated here since the query string is
  // attacker-visible, even though both of those sources already send a safe path.
  const redirectTo = safeRedirectPath(useSearchParams().get("redirectTo"));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();
  const formToResetOnHide = useRef<HTMLFormElement | null>(null);

  // With cacheComponents, Next keeps this page alive (hidden) after navigating
  // away; reset it so coming back to /login does not show a stuck button.
  useLayoutEffect(() => {
    return () => {
      const form = formToResetOnHide.current;
      if (!form) return;
      formToResetOnHide.current = null;
      form.reset();
      setIsSubmitting(false);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = loginSchema.safeParse(loginValues(form));

    setUnverifiedEmail(null);
    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      const nextErrors = { email: errors.email?.[0], password: errors.password?.[0] };
      setFieldErrors(nextErrors);
      reportInvalid(form, nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await signInWithEmail(parsed.data);

    if (!result.ok) {
      showSnackbar({ tone: "danger", title: SIGN_IN_ERROR_MESSAGES[result.error] });
      if (result.error === SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED) {
        setUnverifiedEmail(parsed.data.email);
      }
      setIsSubmitting(false);
      return;
    }

    // Stays "submitting" while the destination loads so the form cannot be sent twice.
    formToResetOnHide.current = form;
    router.replace(redirectTo ?? ROUTES.DASHBOARD);
    router.refresh();
  }

  function handleFieldChange(event: ChangeEvent<HTMLFormElement>) {
    const field = changedFieldName(event) as keyof FieldErrors;
    if (!fieldErrors[field]) return;
    const error = fieldErrorFor(loginSchema, loginValues(event.currentTarget), field);
    setFieldErrors((current) => ({ ...current, [field]: error }));
  }

  return (
    <Card>
      <form noValidate onSubmit={handleSubmit} onChange={handleFieldChange} className="space-y-5">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          error={fieldErrors.email}
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={fieldErrors.password}
          labelAction={
            <Link
              href={ROUTES.FORGOT_PASSWORD}
              className="text-xs text-muted underline-offset-2 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />
        {unverifiedEmail ? (
          <ResendVerificationEmailButton email={unverifiedEmail} />
        ) : null}
        <Button type="submit" fullWidth disabled={isSubmitting || !isHydrated}>
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
    </Card>
  );
}

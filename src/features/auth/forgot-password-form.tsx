"use client";

import { type ChangeEvent, type FormEvent, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { changedFieldName, fieldErrorFor, useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { useIsHydrated } from "@/lib/use-is-hydrated";

import { requestPasswordReset } from "./request-password-reset";
import { forgotPasswordSchema } from "./schemas";

type FieldErrors = Partial<
  Record<keyof z.infer<typeof forgotPasswordSchema>, string>
>;

const GENERIC_SUCCESS_MESSAGE =
  "Si el email existe en nuestro sistema, te enviamos un enlace para restablecer tu contraseña.";
const UNAVAILABLE_MESSAGE =
  "No pudimos procesar el pedido. Probá de nuevo en unos minutos.";

function forgotValues(form: HTMLFormElement) {
  return { email: String(new FormData(form).get("email") ?? "").trim() };
}

export function ForgotPasswordForm() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const resetOnHide = useRef(false);

  // With cacheComponents, Next keeps this page alive (hidden) after navigating
  // away; reset it so coming back to /forgot-password doesn't show the stale
  // success card instead of a fresh form.
  useLayoutEffect(() => {
    return () => {
      if (!resetOnHide.current) return;
      resetOnHide.current = false;
      setIsSubmitted(false);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse(forgotValues(event.currentTarget));

    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      const nextErrors = { email: errors.email?.[0] };
      setFieldErrors(nextErrors);
      reportInvalid(event.currentTarget, nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await requestPasswordReset({
      email: parsed.data.email,
      redirectTo: new URL(
        ROUTES.RESET_PASSWORD,
        window.location.origin,
      ).toString(),
    });
    setIsSubmitting(false);

    // Whether the email exists or not, the backend answers the same way on
    // purpose (no account enumeration) — this UI must not branch on that
    // either. Only a genuine network failure gets a different message.
    if (!result.ok) {
      showSnackbar({ tone: "danger", title: UNAVAILABLE_MESSAGE });
      return;
    }

    resetOnHide.current = true;
    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <Card>
        <p role="status" className="text-sm leading-relaxed text-muted">
          {GENERIC_SUCCESS_MESSAGE}
        </p>
      </Card>
    );
  }

  function handleFieldChange(event: ChangeEvent<HTMLFormElement>) {
    const field = changedFieldName(event) as keyof FieldErrors;
    if (!fieldErrors[field]) return;
    const error = fieldErrorFor(forgotPasswordSchema, forgotValues(event.currentTarget), field);
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
        <Button type="submit" fullWidth disabled={isSubmitting || !isHydrated}>
          {isSubmitting ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
    </Card>
  );
}

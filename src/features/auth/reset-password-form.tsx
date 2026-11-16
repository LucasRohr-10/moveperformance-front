"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { changedFieldName, fieldErrorFor, useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { useIsHydrated } from "@/lib/use-is-hydrated";

import {
  RESET_PASSWORD_ERRORS,
  type ResetPasswordError,
  resetPassword,
} from "./reset-password";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: "La contraseña necesita al menos 8 caracteres." }),
    confirmPassword: z.string().min(1, { error: "Repetí la contraseña." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type FieldErrors = Partial<
  Record<keyof z.infer<typeof resetPasswordSchema>, string>
>;

const EXPIRED_LINK_MESSAGE = "Este enlace venció o ya fue usado. Pedí uno nuevo.";

const RESET_PASSWORD_ERROR_MESSAGES: Record<ResetPasswordError, string> = {
  [RESET_PASSWORD_ERRORS.INVALID_TOKEN]: EXPIRED_LINK_MESSAGE,
  [RESET_PASSWORD_ERRORS.PASSWORD_TOO_SHORT]:
    "La contraseña necesita al menos 8 caracteres.",
  [RESET_PASSWORD_ERRORS.UNAVAILABLE]:
    "No pudimos restablecer tu contraseña. Probá de nuevo en unos minutos.",
};

function resetValues(form: HTMLFormElement) {
  const formData = new FormData(form);
  return {
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkIsInvalid =
    !token || searchParams.get("error") === RESET_PASSWORD_ERRORS.INVALID_TOKEN;

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenWasRejected, setTokenWasRejected] = useState(false);

  if (linkIsInvalid || tokenWasRejected) {
    return (
      <Card>
        <p role="alert" className="text-sm leading-relaxed text-muted">
          {EXPIRED_LINK_MESSAGE}
        </p>
        <Button
          type="button"
          fullWidth
          className="mt-5"
          onClick={() => router.replace(ROUTES.FORGOT_PASSWORD)}
        >
          Pedir un enlace nuevo
        </Button>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card>
        <p role="status" className="text-sm leading-relaxed text-muted">
          Listo, tu contraseña se actualizó. Ya podés iniciar sesión con la
          nueva.
        </p>
        <Button
          type="button"
          fullWidth
          className="mt-5"
          onClick={() => router.replace(ROUTES.LOGIN)}
        >
          Ir a iniciar sesión
        </Button>
      </Card>
    );
  }

  function handleFieldChange(event: ChangeEvent<HTMLFormElement>) {
    const field = changedFieldName(event) as keyof FieldErrors;
    if (!fieldErrors[field]) return;
    const error = fieldErrorFor(resetPasswordSchema, resetValues(event.currentTarget), field);
    setFieldErrors((current) => ({ ...current, [field]: error }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse(resetValues(event.currentTarget));

    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      const nextErrors = {
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      };
      setFieldErrors(nextErrors);
      reportInvalid(event.currentTarget, nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    // token is guaranteed non-null here: linkIsInvalid (checked above)
    // already returns early when token is missing.
    const result = await resetPassword({
      newPassword: parsed.data.password,
      token: token as string,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.error === RESET_PASSWORD_ERRORS.INVALID_TOKEN) {
        setTokenWasRejected(true);
        return;
      }
      showSnackbar({ tone: "danger", title: RESET_PASSWORD_ERROR_MESSAGES[result.error] });
      return;
    }

    setIsSuccess(true);
  }

  return (
    <Card>
      <form noValidate onSubmit={handleSubmit} onChange={handleFieldChange} className="space-y-5">
        <Input
          label="Nueva contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={fieldErrors.password}
        />
        <Input
          label="Repetí la contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={fieldErrors.confirmPassword}
        />
        <Button type="submit" fullWidth disabled={isSubmitting || !isHydrated}>
          {isSubmitting ? "Guardando…" : "Guardar nueva contraseña"}
        </Button>
      </form>
    </Card>
  );
}

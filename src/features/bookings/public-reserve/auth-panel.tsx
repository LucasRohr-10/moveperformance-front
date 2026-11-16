"use client";

import { type FormEvent, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { fieldErrorFor, useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
// Deep imports, not the feature's index.ts: that barrel also re-exports
// AvatarSlot/RedirectIfSignedIn, which pull in next/headers and would break
// this client component's bundle if imported through it.
import { getCurrentUserClient } from "@/features/auth/get-current-user-client";
import { PasswordStrengthMeter } from "@/features/auth/password-strength-meter";
import { PhoneInput } from "@/features/auth/phone-input";
import { requestPasswordReset } from "@/features/auth/request-password-reset";
import { ResendVerificationEmailButton } from "@/features/auth/resend-verification-email-button";
// Same schemas and copy LoginForm/RegisterForm/ForgotPasswordForm use — this
// inline panel behaves differently (no redirect, shared email across tabs,
// continues into a booking), but the validation rules and error copy must
// not drift from the rest of the app. signUpSchema already requires a phone
// (the app requires one for every client account, see requireUser), so this
// stays required here too even though the design marks it optional.
import {
  forgotPasswordSchema,
  loginSchema,
  SIGN_IN_ERROR_MESSAGES,
  signUpSchema,
  SIGN_UP_ERROR_MESSAGES,
} from "@/features/auth/schemas";
import { SIGN_IN_ERRORS, signInWithEmail } from "@/features/auth/sign-in";
import { signUpWithEmail } from "@/features/auth/sign-up";
import { BIRTH_DATE_MIN } from "@/lib/birth-date";
import { cn } from "@/lib/cn";
import type { AuthenticatedUser } from "@/lib/session";
import { useBusinessToday } from "@/features/auth/use-business-today";

type FieldErrors = Partial<Record<"name" | "lastName" | "birthDate" | "email" | "phone" | "password", string>>;

const CHECK_EMAIL_MESSAGE =
  "Te mandamos un mail para confirmar tu cuenta. Una vez que lo confirmes, iniciá sesión acá mismo para terminar tu reserva.";
const GENERIC_RESET_MESSAGE =
  "Si el email existe en nuestro sistema, te enviamos un enlace para restablecer tu contraseña.";
const RESET_UNAVAILABLE_MESSAGE = "No pudimos procesar el pedido. Probá de nuevo en unos minutos.";

type Mode = "login" | "signup" | "forgot-password";

export interface AuthPanelProps {
  onAuthenticated: (user: AuthenticatedUser) => void;
  onCancel?: () => void;
}

function signUpValues(values: {
  email: string;
  password: string;
  name: string;
  lastName: string;
  birthDate: string;
  phone: string;
}) {
  return {
    name: values.name.trim(),
    lastName: values.lastName.trim(),
    birthDate: values.birthDate.trim(),
    email: values.email.trim(),
    phone: values.phone,
    password: values.password,
  };
}

export function AuthPanel({ onAuthenticated, onCancel }: AuthPanelProps) {
  const today = useBusinessToday();
  const [mode, setMode] = useState<Mode>("login");
  // Shared across tabs per the design ("conserva mail/nombre/teléfono"); only
  // password and errors clear on tab switch.
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSentTo, setSignupSentTo] = useState<string | null>(null);

  function switchTab(next: "login" | "signup") {
    setMode(next);
    setPassword("");
    setFieldErrors({});
    setUnverifiedEmail(null);
  }

  // Clears a field's error as soon as the new value passes the same validation as the submit.
  function editField(field: keyof FieldErrors, value: string, setValue: (value: string) => void) {
    setValue(value);
    if (!fieldErrors[field]) return;
    const next = { email, password, name, lastName, birthDate, phone, [field]: value };
    const error =
      mode === "signup"
        ? fieldErrorFor(signUpSchema, signUpValues(next), field)
        : mode === "login"
          ? fieldErrorFor(loginSchema, { email: next.email.trim(), password: next.password }, field)
          : fieldErrorFor(forgotPasswordSchema, { email: next.email.trim() }, field);
    setFieldErrors((current) => ({ ...current, [field]: error }));
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    setUnverifiedEmail(null);
    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      const nextErrors = { email: errors.email?.[0], password: errors.password?.[0] };
      setFieldErrors(nextErrors);
      reportInvalid(event.currentTarget, nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await signInWithEmail(parsed.data);
    if (!result.ok) {
      showSnackbar({ tone: "danger", title: SIGN_IN_ERROR_MESSAGES[result.error] });
      if (result.error === SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED) setUnverifiedEmail(parsed.data.email);
      setIsSubmitting(false);
      return;
    }

    const user = await getCurrentUserClient();
    setIsSubmitting(false);
    if (user) onAuthenticated(user);
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse(signUpValues({ email, password, name, lastName, birthDate, phone }));
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
      ...parsed.data,
      callbackURL: new URL(ROUTES.VERIFY_EMAIL, window.location.origin).toString(),
    });
    setIsSubmitting(false);
    if (!result.ok) {
      showSnackbar({ tone: "danger", title: SIGN_UP_ERROR_MESSAGES[result.error] });
      return;
    }
    setSignupSentTo(parsed.data.email);
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
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
      redirectTo: new URL(ROUTES.RESET_PASSWORD, window.location.origin).toString(),
    });
    setIsSubmitting(false);
    showSnackbar(
      result.ok
        ? { tone: "success", title: GENERIC_RESET_MESSAGE }
        : { tone: "danger", title: RESET_UNAVAILABLE_MESSAGE },
    );
  }

  if (signupSentTo) {
    return (
      <div className="flex flex-col gap-4 border-t border-line pt-5">
        <p role="status" className="text-sm leading-relaxed text-muted">
          {CHECK_EMAIL_MESSAGE}
        </p>
        <ResendVerificationEmailButton email={signupSentTo} />
        <button
          type="button"
          onClick={() => {
            setSignupSentTo(null);
            switchTab("login");
          }}
          className="text-xs text-muted underline-offset-2 hover:text-white hover:underline"
        >
          Ya confirmé mi cuenta, ingresar
        </button>
      </div>
    );
  }

  if (mode === "forgot-password") {
    return (
      <form onSubmit={handleForgotPassword} className="flex flex-col gap-4 border-t border-line pt-5">
        <div>
          <p className="font-display text-lg font-black uppercase">Recuperar contraseña</p>
          <p className="mt-1 text-xs text-muted">Te enviamos un enlace para crear una nueva.</p>
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(event) => editField("email", event.target.value, setEmail)}
          error={fieldErrors.email}
        />
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Enviando…" : "Enviar enlace"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setFieldErrors({});
          }}
          className="text-xs text-muted underline-offset-2 hover:text-white hover:underline"
        >
          Volver a ingresar
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5 border-t border-line pt-5">
      <div
        role="tablist"
        aria-label="Acceso"
        className="grid grid-cols-2 rounded bg-soft p-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => switchTab("login")}
          className={cn("rounded py-2.5", mode === "login" ? "bg-card text-white" : "text-muted hover:text-white")}
        >
          Ingresar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => switchTab("signup")}
          className={cn("rounded py-2.5", mode === "signup" ? "bg-card text-white" : "text-muted hover:text-white")}
        >
          Crear cuenta
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <p className="font-display text-lg font-black uppercase">Ingresá para reservar</p>
            <p className="mt-1 text-xs text-muted">Usá el mail con el que te registraste.</p>
          </div>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => editField("email", event.target.value, setEmail)}
            error={fieldErrors.email}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => editField("password", event.target.value, setPassword)}
            error={fieldErrors.password}
            labelAction={
              <button
                type="button"
                onClick={() => setMode("forgot-password")}
                className="text-xs text-muted underline-offset-2 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            }
          />
          {unverifiedEmail ? <ResendVerificationEmailButton email={unverifiedEmail} /> : null}
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Ingresar y reservar"}
          </Button>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="text-xs text-muted hover:text-white">
              Cancelar
            </button>
          ) : null}
        </form>
      ) : (
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <p className="font-display text-lg font-black uppercase">Creá tu cuenta</p>
            <p className="mt-1 text-xs text-muted">Con tu cuenta vas a poder ver y cancelar tus reservas.</p>
          </div>
          <Input
            label="Nombre"
            autoComplete="given-name"
            placeholder="Ana"
            value={name}
            onChange={(event) => editField("name", event.target.value, setName)}
            error={fieldErrors.name}
          />
          <Input
            label="Apellido"
            autoComplete="family-name"
            placeholder="Pérez"
            value={lastName}
            onChange={(event) => editField("lastName", event.target.value, setLastName)}
            error={fieldErrors.lastName}
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            autoComplete="bday"
            min={BIRTH_DATE_MIN}
            max={today}
            value={birthDate}
            onChange={(event) => editField("birthDate", event.target.value, setBirthDate)}
            error={fieldErrors.birthDate}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => editField("email", event.target.value, setEmail)}
            error={fieldErrors.email}
          />
          <PhoneInput value={phone} onChange={(value) => editField("phone", value, setPhone)} error={fieldErrors.phone} />
          <div>
            <Input
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(event) => editField("password", event.target.value, setPassword)}
              error={fieldErrors.password}
            />
            <PasswordStrengthMeter password={password} />
          </div>
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta y reservar"}
          </Button>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="text-xs text-muted hover:text-white">
              Cancelar
            </button>
          ) : null}
        </form>
      )}
    </div>
  );
}

import { z } from "zod";

import { isValidBirthDate } from "@/lib/birth-date";
import { businessDateOf } from "@/features/checkout/business-time";

import { ACCOUNT_DEACTIVATED_MESSAGE } from "./constants";
import { getPhoneErrorMessage } from "./phone-input";
import { toE164Phone } from "./phone";
import { SIGN_IN_ERRORS, type SignInError } from "./sign-in";
import { SIGN_UP_ERRORS, type SignUpError } from "./sign-up";

// Shared between every place that logs a visitor in or signs one up
// (LoginForm/RegisterForm/ForgotPasswordForm and the inline AuthPanel on the
// public booking page) so the rules and copy can't drift between them.

export const loginSchema = z.object({
  email: z.email({ error: "Ingresá un email válido." }),
  password: z.string().min(1, { error: "Ingresá tu contraseña." }),
});

// YYYY-MM-DD from <input type="date">; "today" is read when validating, in Montevideo.
export function birthDateSchema() {
  return z
    .string()
    .trim()
    .min(1, { error: "Ingresá tu fecha de nacimiento." })
    .refine((value) => isValidBirthDate(value, businessDateOf(new Date().toISOString())), {
      error: "Revisá la fecha de nacimiento.",
    });
}

export const signUpSchema = z.object({
  name: z.string().trim().min(1, { error: "Ingresá tu nombre." }),
  lastName: z.string().trim().min(1, { error: "Ingresá tu apellido." }),
  birthDate: birthDateSchema(),
  email: z.email({ error: "Ingresá un email válido." }),
  // The API only takes E.164, so the form sends the converted number.
  phone: z.string().transform((value, ctx) => {
    const phone = toE164Phone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: getPhoneErrorMessage(value) });
      return z.NEVER;
    }
    return phone;
  }),
  password: z.string().min(8, { error: "La contraseña necesita al menos 8 caracteres." }),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "Ingresá un email válido." }),
});

export const SIGN_IN_ERROR_MESSAGES: Record<SignInError, string> = {
  [SIGN_IN_ERRORS.INVALID_CREDENTIALS]: "Email o contraseña incorrectos.",
  [SIGN_IN_ERRORS.TOO_MANY_ATTEMPTS]: "Demasiados intentos. Esperá un momento y volvé a probar.",
  [SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED]: "Confirmá tu email antes de ingresar. Revisá tu casilla de entrada.",
  [SIGN_IN_ERRORS.ACCOUNT_DEACTIVATED]: ACCOUNT_DEACTIVATED_MESSAGE,
  [SIGN_IN_ERRORS.UNAVAILABLE]: "No pudimos iniciar sesión. Probá de nuevo en unos minutos.",
};

export const SIGN_UP_ERROR_MESSAGES: Record<SignUpError, string> = {
  [SIGN_UP_ERRORS.PASSWORD_TOO_SHORT]: "La contraseña necesita al menos 8 caracteres.",
  [SIGN_UP_ERRORS.INVALID_PROFILE]: "Revisá tu apellido, tu teléfono y tu fecha de nacimiento.",
  [SIGN_UP_ERRORS.UNAVAILABLE]: "No pudimos crear tu cuenta. Probá de nuevo en unos minutos.",
};

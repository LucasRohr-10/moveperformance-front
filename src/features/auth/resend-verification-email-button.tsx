"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/constants/routes.constants";

import {
  SEND_VERIFICATION_EMAIL_ERRORS,
  type SendVerificationEmailError,
  sendVerificationEmail,
} from "./send-verification-email";

const SENT_MESSAGE =
  "Te mandamos un mail nuevo. Revisá tu casilla de entrada y la carpeta de spam.";

const SEND_ERROR_MESSAGES: Record<SendVerificationEmailError, string> = {
  [SEND_VERIFICATION_EMAIL_ERRORS.COOLDOWN]:
    "Ya te mandamos un mail hace menos de un minuto. Esperá un momento y volvé a pedirlo.",
  [SEND_VERIFICATION_EMAIL_ERRORS.UNAVAILABLE]:
    "No pudimos reenviar el mail. Probá de nuevo en unos minutos.",
};

export function ResendVerificationEmailButton({ email }: { email: string }) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsSending(true);
    setMessage(null);
    const result = await sendVerificationEmail({
      email,
      callbackURL: new URL(
        ROUTES.VERIFY_EMAIL,
        window.location.origin,
      ).toString(),
    });
    setIsSending(false);
    setMessage(result.ok ? SENT_MESSAGE : SEND_ERROR_MESSAGES[result.error]);
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        fullWidth
        disabled={isSending}
        onClick={handleClick}
      >
        {isSending ? "Enviando…" : "Reenviar mail de confirmación"}
      </Button>
      {/* role="status", not "alert": this sits next to the form's own alert. */}
      {message ? (
        <p role="status" className="text-xs text-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { ROUTES } from "@/config/constants/routes.constants";

import { announceEmailVerified } from "./email-verified-channel";
import { EmailVerifiedView } from "./email-verified-view";

// The confirmation email's link goes through the API, which sends the user
// back here. On success it has already opened their session; on failure it
// adds ?error=<code> (TOKEN_EXPIRED after 30 minutes, INVALID_TOKEN for a
// tampered link or one replaced by a newer email). Every code means the same
// thing to the user, so the screen does not branch on which one it is.
export function EmailVerificationResult() {
  const router = useRouter();
  const linkFailed = useSearchParams().has("error");

  useEffect(() => {
    if (!linkFailed) announceEmailVerified();
  }, [linkFailed]);

  if (linkFailed) {
    return (
      <>
        <SectionLabel className="text-center">Acceso</SectionLabel>
        <Heading as="h1" size="lg" className="mt-4 text-center">
          Confirmación de email.
        </Heading>
        <Card className="mt-10">
          <p role="alert" className="text-sm leading-relaxed text-muted">
            Este enlace venció o ya no es válido. Ingresá con tu email y
            contraseña y te ofrecemos mandarte uno nuevo.
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
      </>
    );
  }

  return (
    <EmailVerifiedView headingAs="h1">
      <p className="mt-6 text-center text-sm leading-relaxed text-muted">
        Ya podés cerrar esta pestaña y entrar a tu cuenta.
      </p>
    </EmailVerifiedView>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { ROUTES } from "@/config/constants/routes.constants";
import { ForgotPasswordForm, RedirectIfSignedIn } from "@/features/auth";

export const metadata: Metadata = {
  title: "Recuperar contraseña · MOVE",
};

export default function ForgotPasswordPage() {
  return (
    <PageContainer>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="mx-auto max-w-md">
        <SectionLabel className="text-center">Acceso</SectionLabel>
        <Heading as="h1" size="lg" className="mt-4 text-center">
          Recuperá tu contraseña.
        </Heading>
        <p className="mt-4 text-center text-sm text-muted">
          Ingresá tu email y te mandamos un enlace para elegir una nueva
          contraseña.
        </p>
        <div className="mt-10">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          <Link
            href={ROUTES.LOGIN}
            className="text-white underline underline-offset-2"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}

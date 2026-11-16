import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import {
  AuthTabs,
  GoogleSignInButton,
  LoginForm,
  ProfilesOverview,
  RedirectIfSignedIn,
} from "@/features/auth";

export const metadata: Metadata = {
  title: "Iniciar sesión · MOVE",
};

export default function LoginPage() {
  return (
    <PageContainer className="py-10">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="mx-auto max-w-md">
        <SectionLabel className="text-center">Acceso</SectionLabel>
        <Heading as="h1" size="lg" className="mt-4 text-center">
          Entrá a MOVE.
        </Heading>
        <AuthTabs active="login" />
        <div className="mt-6">
          {/* Reads ?redirectTo= from the URL, so it needs its own Suspense boundary. */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
        <div className="mt-6">
          {/* Reads ?error= from the URL, so it needs its own Suspense boundary. */}
          <Suspense fallback={null}>
            <GoogleSignInButton />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          ¿Primera vez en MOVE? Podés reservar Rehab o Recovery sin ser alumno
          — tu cuenta se crea durante el proceso.
        </p>
      </div>
      <ProfilesOverview />
    </PageContainer>
  );
}

function LoginFormSkeleton() {
  return (
    <Card>
      <p className="text-sm leading-relaxed text-muted">Cargando…</p>
    </Card>
  );
}

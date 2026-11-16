import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import {
  AuthTabs,
  GoogleSignInButton,
  ProfilesOverview,
  RedirectIfSignedIn,
  RegisterForm,
} from "@/features/auth";

export const metadata: Metadata = {
  title: "Crear cuenta · MOVE",
};

export default function RegisterPage() {
  return (
    <PageContainer className="py-10">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="mx-auto max-w-md">
        <SectionLabel className="text-center">Registro</SectionLabel>
        <Heading as="h1" size="lg" className="mt-4 text-center">
          Sumate a MOVE.
        </Heading>
        <AuthTabs active="register" />
        <div className="mt-6">
          <RegisterForm>
            {/* Reads ?error= from the URL, so it needs its own Suspense boundary. */}
            <Suspense fallback={null}>
              <GoogleSignInButton />
            </Suspense>
          </RegisterForm>
        </div>
      </div>
      <ProfilesOverview />
    </PageContainer>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { ResetPasswordForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Restablecer contraseña · MOVE",
};

export default function ResetPasswordPage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <SectionLabel className="text-center">Acceso</SectionLabel>
        <Heading as="h1" size="lg" className="mt-4 text-center">
          Elegí tu nueva contraseña.
        </Heading>
        <div className="mt-10">
          <Suspense fallback={<ResetPasswordSkeleton />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </PageContainer>
  );
}

function ResetPasswordSkeleton() {
  return (
    <Card>
      <p className="text-sm leading-relaxed text-muted">Cargando…</p>
    </Card>
  );
}

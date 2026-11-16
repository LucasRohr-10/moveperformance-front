import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { EmailVerificationResult } from "@/features/auth";

export const metadata: Metadata = {
  title: "Confirmación de email · MOVE",
};

export default function VerifyEmailPage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        {/* The heading depends on the link's result, so the result renders it. */}
        <Suspense fallback={<VerifyEmailSkeleton />}>
          <EmailVerificationResult />
        </Suspense>
      </div>
    </PageContainer>
  );
}

function VerifyEmailSkeleton() {
  return (
    <>
      <SectionLabel className="text-center">Acceso</SectionLabel>
      <Heading as="h1" size="lg" className="mt-4 text-center">
        Confirmación de email.
      </Heading>
      <Card className="mt-10">
        <p className="text-sm leading-relaxed text-muted">Cargando…</p>
      </Card>
    </>
  );
}

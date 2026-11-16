import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { HOME_BY_ROLE } from "@/config/constants/routes.constants";
import { CompleteProfileForm } from "@/features/auth";
import { missingProfileFields } from "@/lib/incomplete-profile";
import { requireIncompleteProfile } from "@/lib/session";

export const metadata: Metadata = {
  title: "Completá tu perfil · MOVE",
};

// Mandatory step for anyone without a phone (Google sign-ups, seeded staff) and
// for clients without a birth date: requireUser() sends them here from every private page.
export default function CompleteProfilePage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <SectionLabel className="text-center">Acceso</SectionLabel>
        <Heading as="h1" size="lg" className="mt-4 text-center">
          Un paso más.
        </Heading>
        <Suspense fallback={<CompleteProfileSkeleton />}>
          <CompleteProfileContent />
        </Suspense>
      </div>
    </PageContainer>
  );
}

function CompleteProfileSkeleton() {
  return (
    <Card className="mt-10">
      <p className="text-sm leading-relaxed text-muted">Cargando…</p>
    </Card>
  );
}

export async function CompleteProfileContent() {
  const user = await requireIncompleteProfile();
  const missing = missingProfileFields(user);

  return (
    <CompleteProfileForm
      homeHref={HOME_BY_ROLE[user.role]}
      askPhone={missing.phone}
      askBirthDate={missing.birthDate}
    />
  );
}

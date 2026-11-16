import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { ComingSoonSkeleton } from "@/components/ui/coming-soon-section";
import { Heading } from "@/components/ui/heading";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { bookingsHref } from "@/features/checkout/checkout-routes";
import { PlansSelectorSection } from "@/features/plans";
import { requireRole } from "@/lib/session";

export default function PlansPage() {
  return (
    <PageContainer className="pb-16 pt-8">
      <Suspense fallback={<ComingSoonSkeleton title="Planes" />}>
        <PlansContent />
      </Suspense>
    </PageContainer>
  );
}

export async function PlansContent() {
  await requireRole(USER_ROLES.CLIENT);

  return (
    <>
      <Heading as="h1" size="md" className="sr-only">
        Planes
      </Heading>
      <PlansSelectorSection reserveHref={bookingsHref} />
    </>
  );
}

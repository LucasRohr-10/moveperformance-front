import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Heading } from "@/components/ui/heading";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { CheckoutSkeleton } from "@/features/checkout/checkout-message-card";
import { PlanCheckout } from "@/features/checkout/plan-checkout";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Contratar plan · MOVE",
  robots: { index: false },
};

type Params = Promise<{ planId: string }>;

export default function PlanCheckoutPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto max-w-[920px] px-6 pt-12 pb-20">
      <Link
        href={ROUTES.PLANS}
        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-white"
      >
        ← Volver a planes
      </Link>
      <Heading as="h1" size="lg" className="mt-5">
        Confirmá tu plan.
      </Heading>
      <div className="mt-10">
        <Suspense fallback={<CheckoutSkeleton />}>
          <PlanCheckoutContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

export async function PlanCheckoutContent({ params }: { params: Params }) {
  const { planId } = await params;
  await requireRole(USER_ROLES.CLIENT);

  return <PlanCheckout planId={planId} />;
}

import type { Metadata } from "next";
import { Suspense } from "react";

import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { AutoDebitResult } from "@/features/auto-debits";
import { PurchaseResult } from "@/features/checkout";
import { firstParam } from "@/features/checkout/first-param";
import { CONSULTING_PAYMENT_MESSAGE } from "@/features/checkout/purchase-result-view";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Resultado del pago · MOVE",
  robots: { index: false },
};

type SearchParams = Promise<{ ref?: string | string[]; status?: string | string[]; debito?: string | string[] }>;

export default function ResultadoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="group mx-auto max-w-xl px-6 py-16">
      {/* The approved result replaces this title with its own screen. */}
      <div className="group-has-[[data-purchase-approved]]:hidden">
        <SectionLabel>Checkout</SectionLabel>
        <Heading as="h1" size="lg">
          Tu pago.
        </Heading>
      </div>
      <div className="mt-10">
        <Suspense fallback={<p className="text-sm text-muted">{CONSULTING_PAYMENT_MESSAGE}</p>}>
          <ResultadoContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

export async function ResultadoContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  await requireRole(USER_ROLES.CLIENT);

  const debitReference = firstParam(params.debito);
  if (debitReference !== undefined) return <AutoDebitResult externalReference={debitReference} />;

  return (
    <PurchaseResult
      externalReference={firstParam(params.ref) ?? null}
      providerSaysRejected={firstParam(params.status) === "rejected"}
    />
  );
}

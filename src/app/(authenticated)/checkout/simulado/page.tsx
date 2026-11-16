import type { Metadata } from "next";
import { Suspense } from "react";

import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { AutoDebitSimulator } from "@/features/auto-debits";
import { SimulatorPanel } from "@/features/checkout";
import { firstParam } from "@/features/checkout/first-param";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Simulador de pagos · MOVE",
  robots: { index: false },
};

type SearchParams = Promise<{ ref?: string | string[]; debito?: string | string[] }>;

export default function SimuladoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <SectionLabel>Desarrollo</SectionLabel>
      <Heading as="h1" size="lg">
        Simulador de pagos
      </Heading>
      <div className="mt-10">
        <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
          <SimuladoContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

export async function SimuladoContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  await requireRole(USER_ROLES.CLIENT);

  const debitReference = firstParam(params.debito);
  if (debitReference !== undefined) return <AutoDebitSimulator externalReference={debitReference} />;

  return <SimulatorPanel externalReference={firstParam(params.ref) ?? null} />;
}

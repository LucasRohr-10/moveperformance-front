import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { parseServiceType } from "@/features/bookings/types";
import { PublicBooking } from "@/features/bookings/public-reserve/public-booking";
import { getCurrentUser, SessionUnavailableError } from "@/lib/session";

export const metadata: Metadata = {
  title: "Reservá tu horario · MOVE",
};

type SearchParams = Promise<{ service?: string }>;

const BOOKING_STEPS = [
  { number: "01", title: "Selección", description: "Elegí sesión individual o paquete mensual." },
  { number: "02", title: "Reserva", description: "Elegí fecha y horario disponibles en el calendario." },
  { number: "03", title: "Pago", description: "Pagá online de forma segura con Mercado Pago." },
  { number: "04", title: "Confirmación", description: "Recibís la confirmación y queda asociada a tu perfil." },
];

export default function ReservarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <Suspense fallback={<p className="text-sm text-muted">Cargando disponibilidad…</p>}>
        <ReservarContent searchParams={searchParams} />
      </Suspense>

      <div className="mt-14 border-t border-line pt-10">
        <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {BOOKING_STEPS.map((step, i) => (
            <li
              key={step.number}
              className={
                i > 0 ? "border-line pl-0 sm:pl-6 lg:border-l" : undefined
              }
            >
              <span className="font-display text-xs font-black text-muted">{step.number}</span>
              <p className="mt-1 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs leading-relaxed text-muted">
          ¿Todavía no tenés cuenta? Se genera un usuario durante el proceso para empezar a
          consolidar tu historial dentro de MOVE.
        </p>
      </div>
    </PageContainer>
  );
}

export async function ReservarContent({ searchParams }: { searchParams: SearchParams }) {
  const { service } = await searchParams;

  // A down backend is not a reason to break a public page — fall back to
  // treating the visitor as anonymous, same as AvatarSlot does.
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof SessionUnavailableError)) throw error;
  }

  return <PublicBooking service={parseServiceType(service) ?? "performance"} initialUser={user} />;
}

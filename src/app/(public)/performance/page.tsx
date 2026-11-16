import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { Tag } from "@/components/ui/tag";
import { ROUTES } from "@/config/constants/routes.constants";
import { PlanPriceRows } from "@/features/plans";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Performance · MOVE",
};

const HIGHLIGHTS = [
  "Reserva previa obligatoria",
  "Sin límite semanal",
  "Capacidad máxima por horario",
];

export default function PerformancePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-soft">
        <PageContainer className="pb-16 pt-20">
          <SectionLabel>01 — Performance</SectionLabel>
          <Heading as="h1" size="lg" className="mt-5 text-4xl sm:text-5xl md:text-6xl">
            Entrenamiento
            <br />
            semi personalizado.
          </Heading>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted">
            Todos los planes incluyen acceso mediante reserva previa, sin límite semanal de
            asistencias. Cada horario tiene una capacidad máxima y solo puede reservarse con un
            plan vigente.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {HIGHLIGHTS.map((highlight) => (
              <Tag key={highlight}>{highlight}</Tag>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Disponibilidad */}
      <section className="border-t border-line">
        <PageContainer className="py-14">
          <Card className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <Heading as="h2" size="sm">
                Próxima disponibilidad.
              </Heading>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
                Mirá los horarios libres de la semana y reservá tu lugar en un solo paso.
              </p>
            </div>
            <Link
              href={`${ROUTES.RESERVE}?service=performance`}
              className={cn(buttonVariants({ variant: "primary" }), "shrink-0")}
            >
              Ver horarios y reservar
            </Link>
          </Card>
        </PageContainer>
      </section>

      {/* Planes */}
      <section id="plans" className="border-t border-line bg-soft">
        <PageContainer>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
            <div>
              <SectionLabel>Planes · Performance</SectionLabel>
              <Heading as="h2" size="lg" className="mt-4 text-3xl">
                Planes disponibles.
              </Heading>
              <p className="mt-3 max-w-md text-sm text-muted">
                Seleccioná un plan y avanzá hacia la contratación. El pago se procesa online.
              </p>
              <Link
                href={`${ROUTES.PLANS_PUBLIC}#performance`}
                className={cn(buttonVariants({ variant: "primary" }), "mt-7")}
              >
                Ver planes y contratar
              </Link>
            </div>
            <PlanPriceRows service="performance" />
          </div>
        </PageContainer>
      </section>
    </>
  );
}

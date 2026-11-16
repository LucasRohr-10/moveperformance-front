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
import { RecoveryRoomSection } from "@/features/recovery/recovery-room-section";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Recovery · MOVE",
};

const BADGES = ["Abierto a público general", "Sin plan previo"];
const GENERAL_PUBLIC_DESCRIPTION =
  "Recovery está disponible tanto para clientes de MOVE como para público general. Elegí una sesión individual o un paquete mensual, reservá y pagá online.";

export default function RecoveryPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-soft">
        <PageContainer className="pb-14 pt-20">
          <SectionLabel>03 — Recovery Room by MOVE</SectionLabel>
          <Heading as="h1" size="lg" className="mt-5 text-5xl md:text-6xl">
            Recuperá
            <br />
            más rápido.
          </Heading>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted">{GENERAL_PUBLIC_DESCRIPTION}</p>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            {BADGES.map((badge) => (
              <Tag key={badge}>{badge}</Tag>
            ))}
          </div>
        </PageContainer>
      </section>

      <RecoveryRoomSection />

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
              href={`${ROUTES.RESERVE}?service=recovery`}
              className={cn(buttonVariants({ variant: "primary" }), "shrink-0")}
            >
              Ver horarios y reservar
            </Link>
          </Card>
        </PageContainer>
      </section>

      {/* Modalidades */}
      <section id="plans" className="border-t border-line bg-soft">
        <PageContainer>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
            <div>
              <SectionLabel>Planes · Recovery</SectionLabel>
              <Heading as="h2" size="lg" className="mt-4 text-3xl">
                Modalidades y planes.
              </Heading>
              <p className="mt-3 max-w-md text-sm text-muted">{GENERAL_PUBLIC_DESCRIPTION}</p>
              <Link
                href={`${ROUTES.PLANS_PUBLIC}#recovery`}
                className={cn(buttonVariants({ variant: "primary" }), "mt-7")}
              >
                Ver planes y contratar
              </Link>
            </div>
            <PlanPriceRows service="recovery" />
          </div>
        </PageContainer>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { buttonVariants } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { ROUTES } from "@/config/constants/routes.constants";
import { LocationSection } from "@/features/location";
import { PlansTeaserSection } from "@/features/plans";
import { ServicesSection } from "@/features/services";
import { TeamSection } from "@/features/team";

export const metadata: Metadata = {
  title: "MOVE — Performance, Rehab & Recovery",
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-soft">
        <PageContainer className="pb-20 pt-24">
          <SectionLabel>Performance &amp; Rehab · Uruguay</SectionLabel>
          <Heading as="h1" size="display" className="mt-6">
            Movete mejor.
            <br />
            Recuperá
            <br />
            más rápido.
          </Heading>
          <p className="mt-7 max-w-md text-sm leading-relaxed text-muted">
            Entrenamiento y recuperación basados en evidencia. Conocé nuestros servicios, contratá
            tu plan y reservá online — todo desde una misma plataforma.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={ROUTES.PLANS_PUBLIC} className={buttonVariants({ variant: "primary" })}>
              Ver planes
            </Link>
            <Link href={ROUTES.RECOVERY} className={buttonVariants({ variant: "secondary" })}>
              Reservar Recovery
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* Servicios */}
      <ServicesSection label="01 — Servicios" />

      {/* Equipo */}
      <TeamSection label="02 — Equipo" />

      {/* Planes */}
      <PlansTeaserSection label="03 — Planes" />

      {/* Contacto */}
      <LocationSection label="04 — Contacto" />
    </>
  );
}

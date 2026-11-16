import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { ROUTES } from "@/config/constants/routes.constants";

export const metadata: Metadata = {
  title: "Rehab · MOVE",
};

const AFTER_EVALUATION = [
  {
    title: "Entrenamiento terapéutico",
    description:
      "El equipo define si corresponde readaptación mediante entrenamiento dentro de MOVE.",
  },
  {
    title: "Tratamiento en consultorio",
    description:
      "Sesiones de fisioterapia en consultorio, o una combinación con entrenamiento.",
  },
  {
    title: "Seguimiento fisioterapéutico",
    description:
      "Frecuencia y modalidad definidas individualmente luego del contacto o evaluación inicial.",
  },
];

export default function RehabPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-soft">
        <PageContainer className="pb-14 pt-20">
          <SectionLabel>02 — Rehab</SectionLabel>
          <Heading as="h1" size="lg" className="mt-5 text-5xl md:text-6xl">
            Evaluación y
            <br />
            diagnóstico.
          </Heading>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted">
            La Evaluación y Diagnóstico es la puerta de entrada a los servicios de fisioterapia
            de MOVE. Abierta a alumnos y a personas externas — si todavía no tenés cuenta, se
            genera durante el proceso.
          </p>
        </PageContainer>
      </section>

      {/* CTA evaluación */}
      <section className="border-t border-line">
        <PageContainer className="py-14">
          <Card className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-md">
              <Heading as="h2" size="sm">
                Agendá tu evaluación.
              </Heading>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Es la puerta de entrada a Rehab: elegí un horario de esta semana para tu primera
                evaluación.
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <Link href={`${ROUTES.RESERVE}?service=rehab`} className={buttonVariants({ variant: "primary" })}>
                Agendar evaluación
              </Link>
            </div>
          </Card>
        </PageContainer>
      </section>

      {/* Después de la evaluación */}
      <section className="border-t border-line bg-soft">
        <PageContainer className="py-14">
          <Heading as="h2" size="md">
            ¿Qué pasa después de la evaluación?
          </Heading>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {AFTER_EVALUATION.map((item) => (
              <Card key={item.title} className="p-6">
                <p className="text-base font-semibold">{item.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted">
            Los tratamientos posteriores no se comercializan automáticamente desde la web — el
            equipo de MOVE define el camino luego de la evaluación.
          </p>
        </PageContainer>
      </section>
    </>
  );
}

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { PlansSelectorSection } from "@/features/plans";

export const metadata: Metadata = {
  title: "Planes · MOVE",
};

export default function PlanesPage() {
  return (
    <section>
      <PageContainer className="py-20">
        <SectionLabel>Planes</SectionLabel>
        <Heading as="h1" size="lg" className="mt-4">
          Elegí tu plan.
        </Heading>
        <PlansSelectorSection className="mt-12" />
      </PageContainer>
    </section>
  );
}

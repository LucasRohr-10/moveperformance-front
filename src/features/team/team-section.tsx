import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";

import { TeamAccordion } from "./team-accordion";
import { TeamCards } from "./team-cards";
import { TEAM_INTRO, TEAM_MEMBERS } from "./team-data";

interface TeamSectionProps {
  label: string;
}

export function TeamSection({ label }: TeamSectionProps) {
  return (
    <section id="equipo" className="scroll-mt-20 border-t border-line bg-soft">
      <PageContainer className="py-20">
        <SectionLabel>{label}</SectionLabel>
        <Heading as="h2" size="lg" className="mt-4">
          El equipo detrás de MOVE.
        </Heading>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">{TEAM_INTRO}</p>
        <TeamCards members={TEAM_MEMBERS} className="hidden md:grid" />
        <TeamAccordion members={TEAM_MEMBERS} className="md:hidden" />
      </PageContainer>
    </section>
  );
}

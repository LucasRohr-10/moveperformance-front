import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";

export interface ComingSoonSectionProps {
  title: string;
  description: string;
}

export function ComingSoonSection({
  title,
  description,
}: ComingSoonSectionProps) {
  return (
    <>
      <Heading as="h1" size="lg" className="mt-3">
        {title}
      </Heading>
      <Card className="mt-9 max-w-md">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Próximamente
        </span>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {description}
        </p>
      </Card>
    </>
  );
}

export function ComingSoonSkeleton({ title }: { title: string }) {
  return (
    <>
      <Heading as="h1" size="lg" className="mt-3">
        {title}
      </Heading>
      <Card className="mt-9 max-w-md">
        <p className="text-sm leading-relaxed text-muted">Cargando…</p>
      </Card>
    </>
  );
}

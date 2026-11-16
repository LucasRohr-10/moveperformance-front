import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";

import { SERVICES } from "./services-data";

interface ServicesSectionProps {
  label: string;
}

// Same up-right arrow as the contact rows, with square caps for a harder edge
// — matches "Más información"'s own entrance: it arrives 50ms after the row's
// other hover effects start, so the arrow reads as catching up to the text.
function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      aria-hidden="true"
      className="size-7 shrink-0 -translate-x-1.5 translate-y-1.5 [transition:transform_0.45s_cubic-bezier(0.3,0.7,0.2,1)_50ms] motion-reduce:transition-none group-hover:translate-x-0 group-hover:translate-y-0 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 max-[760px]:translate-x-0 max-[760px]:translate-y-0"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function ServicesSection({ label }: ServicesSectionProps) {
  return (
    <section className="border-t border-line">
      <PageContainer className="py-20">
        <SectionLabel>{label}</SectionLabel>
        <Heading as="h2" size="lg" className="mt-4">
          Tres áreas. Una experiencia.
        </Heading>
        <div className="mt-10 border-t border-line">
          {SERVICES.map((service) => (
            <Link
              key={service.kicker}
              href={service.href}
              className="group relative flex items-center justify-between gap-8 border-b border-line py-8 no-underline focus-visible:outline-none max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-4"
            >
              {/* The kicker is a hollow outline by default (text-stroke, transparent
                  fill) and fills solid white while sliding right on hover/focus —
                  the row's main hover affordance. */}
              <span className="[-webkit-text-stroke:1.5px_#fff] whitespace-nowrap font-display text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.9] tracking-[-0.02em] text-transparent [transition:color_0.4s,transform_0.5s_cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none group-hover:translate-x-3 group-hover:text-white group-focus-visible:translate-x-3 group-focus-visible:text-white">
                {service.kicker}
              </span>
              {/* Hidden off to the left until hover/focus, then slides into place.
                  Below 760px there's no hover to reveal it, so it's always shown,
                  flowed statically under the kicker instead of absolutely centered. */}
              <span className="absolute right-0 top-1/2 -mt-3.5 flex -translate-x-4 items-center gap-3.5 whitespace-nowrap text-[13px] font-extrabold uppercase tracking-[0.18em] opacity-0 [transition:all_0.4s_ease] motion-reduce:transition-none group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 max-[760px]:static max-[760px]:right-auto max-[760px]:top-auto max-[760px]:m-0 max-[760px]:translate-x-0 max-[760px]:opacity-100">
                <span className="border-b-[1.5px] border-white pb-1.5">Más información</span>
                <ArrowIcon />
              </span>
              {/* The underline bar: scales in from the left across the full row width. */}
              <span className="absolute inset-x-0 bottom-[-1px] h-0.5 origin-left scale-x-0 bg-white [transition:transform_0.5s_cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none group-hover:scale-x-100 group-focus-visible:scale-x-100" />
            </Link>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}

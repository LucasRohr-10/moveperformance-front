import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/cn";

import { LocationMap } from "./location-map";
import { CONTACT, LOCATION_SECTION_ID } from "./constants";

interface LocationSectionProps {
  label: string;
}

const EXTERNAL_LINK = { target: "_blank", rel: "noopener noreferrer" } as const;

function PinIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function WhatsAppIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function InstagramIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

function HoursValue() {
  return (
    <>
      <span className="block">{CONTACT.hours.days}</span>
      <span className="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-base font-normal">
        <span className="text-muted">Mañana</span>
        <span>{CONTACT.hours.morning}</span>
        <span className="text-muted">Tarde</span>
        <span>{CONTACT.hours.afternoon}</span>
      </span>
    </>
  );
}

interface ContactRowProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  href?: string;
  arrowClassName?: string;
}

// Each row doubles as the row's own link: a bigger, more obvious tap target
// than a small inline link would be, with the icon/underline/arrow hover
// cascading off the single `group`. The Horarios row has no href, so it
// renders as a plain row with no hover affordance.
function ContactRow({ icon, label, value, href, arrowClassName = "text-white" }: ContactRowProps) {
  const content = (
    <>
      <span className="mt-0.5 text-muted transition-colors group-hover:text-white">{icon}</span>
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className="block text-[11px] uppercase tracking-[0.2em] text-muted">{label}</span>
        <span className="mt-2 block text-xl font-semibold text-white group-hover:underline group-hover:underline-offset-[5px]">
          {value}
        </span>
      </span>
    </>
  );

  if (!href) {
    return <div className="grid grid-cols-[28px_1fr] gap-5 border-b border-line py-6">{content}</div>;
  }

  return (
    <a
      href={href}
      {...EXTERNAL_LINK}
      className="group relative grid grid-cols-[28px_1fr] gap-5 border-b border-line py-6 pr-9 no-underline"
    >
      {content}
      <ArrowIcon
        className={cn(
          "absolute right-1 top-6 -translate-x-1.5 translate-y-1.5 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100",
          arrowClassName,
        )}
      />
    </a>
  );
}

export function LocationSection({ label }: LocationSectionProps) {
  return (
    <section id={LOCATION_SECTION_ID} className="scroll-mt-20 border-t border-line bg-soft">
      <PageContainer className="py-20">
        <SectionLabel>{label}</SectionLabel>
        <Heading as="h2" size="lg" className="mt-4">
          Dónde estamos.
        </Heading>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="border-t border-line">
            <ContactRow href={CONTACT.mapsUrl} icon={<PinIcon />} label="Dirección" value={CONTACT.address} />
            <ContactRow icon={<ClockIcon />} label="Horarios" value={<HoursValue />} />
            <ContactRow
              href={CONTACT.whatsapp.href}
              icon={<WhatsAppIcon />}
              label="WhatsApp"
              value={CONTACT.whatsapp.label}
              arrowClassName="text-[#25D366]"
            />
            <ContactRow
              href={CONTACT.instagram.href}
              icon={<InstagramIcon />}
              label="Instagram"
              value={CONTACT.instagram.label}
            />
          </div>
          <div className="flex h-96 flex-col gap-2 lg:h-auto">
            <div className="min-h-0 flex-1">
              <LocationMap />
            </div>
            {/* attributionControl is off on the map itself, so these credits
                stand in for it — required by OpenFreeMap/OpenMapTiles/OSM. */}
            <p className="text-xs text-muted">
              <a href="https://openfreemap.org" {...EXTERNAL_LINK} className="hover:text-white">
                OpenFreeMap
              </a>{" "}
              ·{" "}
              <a href="https://www.openmaptiles.org/" {...EXTERNAL_LINK} className="hover:text-white">
                © OpenMapTiles
              </a>{" "}
              ·{" "}
              <a href="https://www.openstreetmap.org/copyright" {...EXTERNAL_LINK} className="hover:text-white">
                © OpenStreetMap contributors
              </a>
            </p>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

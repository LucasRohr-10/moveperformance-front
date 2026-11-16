import Link from "next/link";

import { ROUTES } from "@/config/constants/routes.constants";
import { LOCATION_SECTION_ID } from "@/features/location";

const FOUNDING_YEAR = 2026;

const FOOTER_LINKS = [
  { label: "Performance", href: ROUTES.PERFORMANCE },
  { label: "Rehab", href: ROUTES.REHAB },
  { label: "Recovery", href: ROUTES.RECOVERY },
  { label: "Ubicación", href: `${ROUTES.HOME}#${LOCATION_SECTION_ID}` },
  { label: "Privacidad", href: ROUTES.PRIVACY },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1160px] flex-col items-center gap-4 px-6 py-10 text-center text-[11px] uppercase tracking-[0.25em] text-muted md:flex-row md:justify-between md:text-left">
        <span className="font-display text-base font-black normal-case tracking-tight text-white">
          MOVE<span className="align-super text-[9px]">&reg;</span>
        </span>
        <div className="flex flex-wrap justify-center gap-x-7 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <span>&copy; {FOUNDING_YEAR} MOVE Strength &amp; Conditioning</span>
      </div>
    </footer>
  );
}

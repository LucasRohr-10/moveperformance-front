"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ROUTES } from "@/config/constants/routes.constants";
import { cn } from "@/lib/cn";

import { activeNavHref } from "./active-nav-link";
import type { NavLink } from "./mobile-nav";

export const STAFF_LINKS: NavLink[] = [
  { label: "Dashboard", href: ROUTES.STAFF },
  { label: "Clientes", href: ROUTES.STAFF_CLIENTS },
  { label: "Reservar", href: ROUTES.STAFF_BOOK },
  { label: "Asistencias", href: ROUTES.STAFF_SCHEDULE },
  { label: "Plantillas de turnos", href: ROUTES.STAFF_SCHEDULE_TEMPLATES },
  { label: "Profesionales", href: ROUTES.STAFF_SCHEDULE_PROFESSIONALS },
  { label: "Pagos", href: ROUTES.STAFF_PAYMENTS },
  { label: "Planes", href: ROUTES.STAFF_PLANS },
  { label: "Seguimiento", href: ROUTES.STAFF_FOLLOW_UP },
  { label: "Comunicados", href: ROUTES.STAFF_ANNOUNCEMENTS },
  { label: "Configuración", href: ROUTES.STAFF_SETTINGS },
];

export function StaffSidebar({
  children,
  actions,
  mobileHeader,
}: {
  children: ReactNode;
  actions: ReactNode;
  mobileHeader: ReactNode;
}) {
  const pathname = usePathname();
  const activeHref = activeNavHref(pathname, STAFF_LINKS);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="flex h-16 items-center justify-between border-b border-line bg-bg pr-3.5 pl-4 md:hidden">
        <Link
          href={ROUTES.STAFF}
          className="font-display text-lg font-black tracking-tight"
        >
          MOVE<span className="align-super text-[9px]">&reg;</span>
        </Link>
        {mobileHeader}
      </header>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-soft md:sticky md:top-0 md:flex md:h-screen md:self-start">
        <div className="flex h-16 items-center border-b border-line px-6">
          <span className="font-display text-lg font-black tracking-tight">
            MOVE<span className="align-super text-[9px]">&reg;</span>
          </span>
          <span className="ml-2 rounded border border-line bg-card px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
            Staff
          </span>
        </div>
        <nav className="space-y-1 p-4 text-xs font-medium text-muted">
          {STAFF_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={link.href === activeHref ? "page" : undefined}
              className={cn(
                "block rounded px-3 py-2.5 hover:bg-card hover:text-white",
                link.href === activeHref && "bg-card text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line">{actions}</div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

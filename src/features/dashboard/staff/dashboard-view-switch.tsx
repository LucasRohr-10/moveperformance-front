import Link from "next/link";

import { cn } from "@/lib/cn";

import { dashboardHref, DASHBOARD_VIEWS, type DashboardParams, type DashboardView } from "./dashboard-params";

export interface DashboardViewSwitchProps {
  params: DashboardParams;
  /** How many Hoy items ask for something. `null` while it is not known, or could not be loaded: no badge. */
  pendingCount: number | null;
}

const VIEWS: readonly { view: DashboardView; title: string; subtitle: string }[] = [
  { view: DASHBOARD_VIEWS.HOY, title: "Hoy", subtitle: "Lo que hay que hacer hoy" },
  { view: DASHBOARD_VIEWS.NEGOCIO, title: "Negocio", subtitle: "Estadísticas para entender y decidir" },
];

/** Links, not ARIA tabs: each view is its own URL, so "atrás" and a shared link land on the same view. */
export function DashboardViewSwitch({ params, pendingCount }: DashboardViewSwitchProps) {
  return (
    <nav aria-label="Vista del panel" className="mt-7 mb-6 flex border-b border-line">
      {VIEWS.map(({ view, title, subtitle }) => {
        const isCurrent = params.view === view;
        return (
          <Link
            key={view}
            // Hoy is the bare URL; Negocio keeps the filters the person already chose.
            href={dashboardHref({ ...params, view })}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "-mb-px mr-5 border-b-2 py-3 pr-4 sm:mr-6",
              isCurrent ? "border-white text-white" : "border-transparent text-muted hover:text-[#bdbdbd]",
            )}
          >
            <span className="block font-display text-[15px] font-extrabold uppercase tracking-[0.18em]">
              {title}
              {view === DASHBOARD_VIEWS.HOY && pendingCount ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 align-[2px] font-sans text-[11px] font-bold tracking-normal text-black">
                  {pendingCount}
                  <span className="sr-only"> pendientes</span>
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 hidden text-xs sm:block">{subtitle}</span>
          </Link>
        );
      })}
    </nav>
  );
}

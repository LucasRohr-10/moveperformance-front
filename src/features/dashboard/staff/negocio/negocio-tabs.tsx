import Link from "next/link";

import { cn } from "@/lib/cn";

import { dashboardHref, DASHBOARD_TABS, type DashboardParams, type DashboardTab } from "../dashboard-params";

const TABS: readonly { tab: DashboardTab; label: string }[] = [
  { tab: DASHBOARD_TABS.PLATA, label: "Plata" },
  { tab: DASHBOARD_TABS.TURNOS, label: "Turnos" },
  { tab: DASHBOARD_TABS.CLIENTES, label: "Clientes" },
];

/** Links, not ARIA tabs: each tab is its own URL, and the period and the service travel with it. */
export function NegocioTabs({ params }: { params: DashboardParams }) {
  return (
    <nav aria-label="Secciones de Negocio" className="flex gap-0.5 overflow-x-auto">
      {TABS.map(({ tab, label }) => (
        <Link
          key={tab}
          href={dashboardHref({ ...params, tab })}
          aria-current={params.tab === tab ? "page" : undefined}
          className={cn(
            "border px-3.5 py-2.5 text-[11px] font-semibold whitespace-nowrap uppercase tracking-[0.18em] transition-colors",
            params.tab === tab ? "border-white bg-white text-black" : "border-transparent text-muted hover:border-line hover:text-white",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

import Link from "next/link";

import { ROUTES } from "@/config/constants/routes.constants";
import { historyHref, type HistoryTab } from "@/features/payment-history";
import { cn } from "@/lib/cn";

const TABS: readonly { tab: HistoryTab; label: string; href: string }[] = [
  { tab: "asistencia", label: "Asistencia", href: ROUTES.HISTORY },
  { tab: "pagos", label: "Pagos", href: historyHref(undefined, 1) },
];

/** Asistencia is the bare URL; the page number is the only thing its links carry. */
export function attendanceHref(page: number): string {
  return page > 1 ? `${ROUTES.HISTORY}?${new URLSearchParams({ page: String(page) })}` : ROUTES.HISTORY;
}

export function HistoryTabs({ active }: { active: HistoryTab }) {
  return (
    <nav aria-label="Secciones de actividad" className="mt-9 inline-flex gap-0.5 rounded border border-line bg-soft p-1">
      {TABS.map(({ tab, label, href }) => (
        <Link
          key={tab}
          href={href}
          aria-current={tab === active ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center rounded border px-4 text-[11px] font-semibold tracking-[0.12em] transition-colors sm:min-h-0 sm:py-2",
            tab === active ? "border-line bg-card text-white" : "border-transparent text-muted hover:text-white",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

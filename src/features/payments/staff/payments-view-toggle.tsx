import Link from "next/link";

import { ROUTES } from "@/config/constants/routes.constants";
import { cn } from "@/lib/cn";

import { PAYMENTS_VIEWS, type PaymentsView } from "./staff-payments-labels";

export interface PaymentsViewToggleProps {
  view: PaymentsView;
  /** `null` while it is not known (or could not be loaded): the chip shows no number. */
  toCollectCount: number | null;
}

const CHIP_CLASS = "inline-flex min-h-11 items-center rounded border px-3.5 py-2.5 text-sm font-medium transition-colors sm:min-h-0";

function Chip({ href, isCurrent, children }: { href: string; isCurrent: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-pressed={isCurrent}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(CHIP_CLASS, isCurrent ? "border-white bg-white text-black" : "border-line text-white hover:bg-card")}
    >
      {children}
    </Link>
  );
}

export function PaymentsViewToggle({ view, toCollectCount }: PaymentsViewToggleProps) {
  return (
    <div role="group" aria-label="Vista de pagos" className="flex flex-wrap gap-2">
      <Chip href={ROUTES.STAFF_PAYMENTS} isCurrent={view === PAYMENTS_VIEWS.ALL}>
        Todos
      </Chip>
      <Chip
        href={`${ROUTES.STAFF_PAYMENTS}?view=${PAYMENTS_VIEWS.TO_COLLECT}`}
        isCurrent={view === PAYMENTS_VIEWS.TO_COLLECT}
      >
        {toCollectCount === null ? "Por cobrar" : `Por cobrar · ${toCollectCount}`}
      </Chip>
    </div>
  );
}

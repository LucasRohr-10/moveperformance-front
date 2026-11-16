import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { MyPaymentPageDto, PaymentOrigin } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { historyHref } from "./history-params";
import { PaymentCard } from "./payment-card";
import { presentPayment } from "./present-payment";

const FILTERS: readonly { label: string; origin: PaymentOrigin | undefined }[] = [
  { label: "Todos", origin: undefined },
  { label: "Pagos únicos", origin: "one_time" },
  { label: "Débitos automáticos", origin: "auto_debit" },
];

function emptyMessage(page: MyPaymentPageDto, origin: PaymentOrigin | undefined): string {
  if (page.total > 0) return "No hay pagos en esta página.";
  return origin ? "No hay pagos para este filtro." : "Todavía no tenés pagos.";
}

function Filters({ origin }: { origin: PaymentOrigin | undefined }) {
  return (
    <nav aria-label="Filtrar pagos" className="flex flex-wrap gap-1.5">
      {FILTERS.map((filter) => {
        const isActive = filter.origin === origin;
        return (
          <Link
            key={filter.label}
            href={historyHref(filter.origin, 1)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded border px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors sm:min-h-0 sm:py-2",
              isActive ? "border-white bg-white text-black" : "border-line text-muted hover:text-white",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Paging({ page, origin }: { page: MyPaymentPageDto; origin: PaymentOrigin | undefined }) {
  const totalPages = Math.ceil(page.total / page.pageSize);
  if (totalPages <= 1) return null;
  const linkClass = buttonVariants({ variant: "secondary", size: "sm", touchTarget: true });

  return (
    <nav aria-label="Páginas de pagos" className="mt-6 flex items-center justify-between gap-3">
      {page.page > 1 ? (
        <Link href={historyHref(origin, page.page - 1)} className={linkClass}>
          Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-muted">
        Página {page.page} de {totalPages}
      </span>
      {page.page < totalPages ? (
        <Link href={historyHref(origin, page.page + 1)} className={linkClass}>
          Siguiente
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function PaymentHistoryList({ page, origin }: { page: MyPaymentPageDto; origin: PaymentOrigin | undefined }) {
  return (
    <div>
      <Filters origin={origin} />
      {page.items.length === 0 ? (
        <Card padding="none" className="mt-5">
          <EmptyState
            title={emptyMessage(page, origin)}
            action={
              page.page > 1 ? (
                <Link href={historyHref(origin, 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Volver al principio
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="mt-5 grid gap-5">
          {page.items.map((payment) => (
            <li key={payment.id}>
              <PaymentCard model={presentPayment(payment)} />
            </li>
          ))}
        </ul>
      )}
      <Paging page={page} origin={origin} />
    </div>
  );
}

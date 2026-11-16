import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MyPaymentPageDto, PaymentOrigin } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { getMyPayments } from "./get-my-payments";
import { historyHref } from "./history-params";
import { PaymentHistoryList } from "./payment-history-list";

// A failing API stays inside this card: the page keeps its heading. Next's own control-flow errors
// (redirect, prerender bail-outs) are rethrown untouched.
async function loadPage(origin: PaymentOrigin | undefined, page: number): Promise<MyPaymentPageDto | null> {
  try {
    return await getMyPayments(origin, page);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function PaymentHistorySection({ origin, page }: { origin: PaymentOrigin | undefined; page: number }) {
  const data = await loadPage(origin, page);
  if (!data) return <PaymentHistoryErrorCard />;
  return <PaymentHistoryList page={data} origin={origin} />;
}

export function PaymentHistorySkeleton() {
  return (
    <Card aria-busy="true">
      <p className="text-sm text-muted">Cargando tus pagos…</p>
    </Card>
  );
}

function PaymentHistoryErrorCard() {
  return (
    <Card role="alert">
      <p className="text-sm font-medium">No pudimos cargar tus pagos.</p>
      <p className="mt-1 text-xs text-muted">Probá de nuevo en unos minutos.</p>
      <Link
        href={historyHref(undefined, 1)}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 min-h-11 sm:min-h-0")}
      >
        Reintentar
      </Link>
    </Card>
  );
}

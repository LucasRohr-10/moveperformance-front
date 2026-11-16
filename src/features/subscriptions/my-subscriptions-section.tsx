import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/config/constants/routes.constants";
import { getMyAutoDebits } from "@/features/auto-debits/auto-debits-server-api";
// By path: the checkout index imports this feature back.
import { getOfflineOptions } from "@/features/checkout/checkout-server-api";
import { AUTO_DEBIT_STATUSES, type AutoDebitDto, type MySubscriptionsDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { getMySubscriptions } from "./get-my-subscriptions";
import { presentSubscriptions, type SubscriptionsModel } from "./present-subscriptions";
import { SubscriptionsOverview } from "./subscriptions-overview";

const servicesRenewedByDebit = (debits: AutoDebitDto[]): Set<AutoDebitDto["service"]> =>
  new Set(debits.filter((debit) => debit.status === AUTO_DEBIT_STATUSES.AUTHORIZED).map((debit) => debit.service));

// Without the debits the warning simply shows: a failed read must not take the section down.
async function loadServicesRenewedByDebit(): Promise<Set<AutoDebitDto["service"]>> {
  try {
    return servicesRenewedByDebit(await getMyAutoDebits());
  } catch (error) {
    unstable_rethrow(error);
    return new Set();
  }
}

const hasUnpaid = ({ performance, upcomingPerformances, recoveryPacks }: MySubscriptionsDto): boolean =>
  [performance, ...upcomingPerformances, ...recoveryPacks].some((item) => item?.awaitingPayment === true);

// A failing API must not look like an expired session: the error stays in this
// section and the page keeps its greeting. Next's own control-flow errors
// (redirect, prerender bail-outs) are rethrown untouched.
async function loadSubscriptions(): Promise<SubscriptionsModel | null> {
  try {
    const [subscriptions, renewedByDebit] = await Promise.all([getMySubscriptions(), loadServicesRenewedByDebit()]);
    // The cap is only worth asking for when something is waiting for payment.
    const offlineOptions = hasUnpaid(subscriptions) ? await getOfflineOptions() : null;
    return presentSubscriptions(subscriptions, renewedByDebit, offlineOptions?.unpaid);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function MySubscriptionsSection() {
  const model = await loadSubscriptions();
  if (!model) return <SubscriptionsErrorCard />;
  return <SubscriptionsOverview model={model} />;
}

export function MySubscriptionsSkeleton() {
  return (
    <Card aria-busy="true" className="mt-10 max-w-[796px]">
      <p className="text-sm text-muted">Cargando tu plan…</p>
    </Card>
  );
}

function SubscriptionsErrorCard() {
  return (
    <Card role="alert" className="mt-10 max-w-[796px]">
      <p className="text-sm font-medium">No pudimos cargar tu plan.</p>
      <p className="mt-1 text-xs text-muted">Probá de nuevo en unos minutos.</p>
      <Link
        href={ROUTES.DASHBOARD}
        className={cn(buttonVariants({ variant: "secondary", size: "sm", touchTarget: true }), "mt-4")}
      >
        Reintentar
      </Link>
    </Card>
  );
}

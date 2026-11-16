// By path: the auto-debits index is client code, and this one reads the session cookies on the server.
import { getMyAutoDebits } from "@/features/auto-debits/auto-debits-server-api";
import { getMySubscriptions } from "@/features/subscriptions";
import { ROUTES } from "@/config/constants/routes.constants";
import type { AutoDebitDto, MySubscriptionsDto, PlanDto } from "@/lib/api/types";

import { AutoDebitBlock } from "./auto-debit-block";
import { CheckoutMessageCard } from "./checkout-message-card";
import { planCheckoutHref } from "./checkout-routes";
import { getCheckoutPlan, getOfflineOptions } from "./checkout-server-api";
import { OfflineNotice } from "./offline-notice";
import { PlanPayButton } from "./pay-button";
import { PlanCheckoutView, PlanSummaryCard } from "./plan-checkout-view";
import {
  isAutoDebitBlocked,
  isPurchasablePlan,
  presentOfflineNotice,
  presentPaymentModes,
  presentPlanCheckout,
} from "./present-checkout";

// Without the subscriptions the checkout only loses the renewal note.
function getSubscriptionsOrNull(): Promise<MySubscriptionsDto | null> {
  return getMySubscriptions().catch(() => null);
}

// Without the debits the checkout only loses the early block: the API still refuses the purchase.
function getAutoDebitsOrNull(): Promise<AutoDebitDto[] | null> {
  return getMyAutoDebits().catch(() => null);
}

async function loadPlan(planId: string): Promise<PlanDto | null | undefined> {
  try {
    return await getCheckoutPlan(planId);
  } catch {
    return undefined;
  }
}

export async function PlanCheckout({ planId }: { planId: string }) {
  const [plan, subscriptions, debits, offline] = await Promise.all([
    loadPlan(planId),
    getSubscriptionsOrNull(),
    getAutoDebitsOrNull(),
    getOfflineOptions(),
  ]);

  if (plan === undefined) {
    return (
      <CheckoutMessageCard
        isAlert
        title="No pudimos cargar el plan."
        body="Probá de nuevo en unos minutos."
        action={{ label: "Reintentar", href: planCheckoutHref(planId) }}
      />
    );
  }

  if (plan === null || !isPurchasablePlan(plan)) {
    return (
      <CheckoutMessageCard
        title="Plan no disponible"
        body="Este plan no existe o no se puede contratar online."
        action={{ label: "Ver planes", href: ROUTES.PLANS }}
      />
    );
  }

  const model = presentPlanCheckout(plan, subscriptions);
  const isBlocked = isAutoDebitBlocked(plan, debits);
  const offlineNotice = isBlocked ? null : presentOfflineNotice(plan, offline);

  return (
    <PlanCheckoutView
      model={model}
      notice={offlineNotice ? <OfflineNotice segments={offlineNotice} /> : null}
      rightColumn={
        isBlocked ? (
          <AutoDebitBlock />
        ) : (
          <PlanSummaryCard>
            <PlanPayButton
              planId={plan.id}
              service={plan.service}
              paymentModes={presentPaymentModes(plan, subscriptions, offline)}
              price={model.price}
            />
          </PlanSummaryCard>
        )
      }
    />
  );
}

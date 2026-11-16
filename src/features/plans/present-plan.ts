import type { PlanCardProps } from "@/components/ui/plan-card";
// By path: the checkout index imports presentPlan from this feature, so importing it here would make a cycle.
import { planCheckoutHref, reserveHref } from "@/features/checkout/checkout-routes";
import type { PlanDto, PlanKind, ServiceType } from "@/lib/api/types";
import { formatPrice } from "@/lib/money";

export interface PlanCardModel extends Omit<PlanCardProps, "action" | "className"> {
  actionLabel: string;
  actionHref: string | null;
}

export interface PresentPlanOptions {
  reserveHref?: (service: ServiceType) => string;
}

interface KindPresentation {
  title: (plan: PlanDto) => string;
  actionLabel: string;
  actionHref: (plan: PlanDto, resolveReserveHref: (service: ServiceType) => string) => string | null;
}

const FEATURED_BADGE = "Recomendado";

const checkoutHref = ({ id }: PlanDto): string => planCheckoutHref(id);

const reserveServiceHref = (
  { service }: PlanDto,
  resolveReserveHref: (service: ServiceType) => string,
): string => resolveReserveHref(service);

// One entry per plan kind. Typing it as Record<PlanKind, ...> makes the compiler
// point here when the API adds a kind, so a new kind never ships half-presented.
const KIND_PRESENTATIONS: Record<PlanKind, KindPresentation> = {
  period_plan: {
    title: (plan) => `Plan ${plan.name}`,
    actionLabel: "Contratar",
    actionHref: checkoutHref,
  },
  session_pack: {
    title: (plan) => plan.name,
    actionLabel: "Contratar paquete",
    actionHref: checkoutHref,
  },
  single_session: {
    title: (plan) => plan.name,
    actionLabel: "Reservar sesión",
    actionHref: reserveServiceHref,
  },
  evaluation: {
    title: (plan) => plan.name,
    actionLabel: "Reservar evaluación",
    actionHref: reserveServiceHref,
  },
};

// The API can know a kind before this app does: show it plainly instead of crashing.
const UNKNOWN_KIND_PRESENTATION: KindPresentation = {
  title: (plan) => plan.name,
  actionLabel: "Contratar",
  actionHref: () => null,
};

export function presentPlan(plan: PlanDto, options?: PresentPlanOptions): PlanCardModel {
  const resolveReserveHref = options?.reserveHref ?? reserveHref;
  const presentation: KindPresentation | undefined = KIND_PRESENTATIONS[plan.kind];
  const { title, actionLabel, actionHref } = presentation ?? UNKNOWN_KIND_PRESENTATION;

  return {
    name: title(plan),
    price: formatPrice(plan.price),
    features: plan.features,
    highlighted: plan.featured,
    badge: plan.featured ? FEATURED_BADGE : undefined,
    actionLabel,
    actionHref: actionHref(plan, resolveReserveHref),
  };
}

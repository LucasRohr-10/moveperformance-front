import type { PlanDto, ServiceType } from "@/lib/api/types";

import { presentPlan, type PresentPlanOptions } from "./present-plan";

export interface SelectorOption {
  id: string;
  name: string;
  price: string;
  // Only the first plan lists its benefits; the rest say what they add to it.
  features: string[];
  includes: string | null;
  featured: boolean;
  actionLabel: string;
  actionHref: string | null;
}

// The first plan of each service is a feminine or masculine noun ("la Sesión individual", "el Plan Mensual").
const OF_THE_BASE: Record<ServiceType, string> = {
  performance: "del",
  recovery: "de la",
  rehab: "de la",
};

const SAVING_PERCENT = /ahorr[aá]s un (\d+%)/i;

function savingOf(plan: PlanDto): string | null {
  for (const feature of plan.features) {
    const percent = SAVING_PERCENT.exec(feature)?.[1];
    if (percent) return percent;
  }
  return null;
}

function includesText(service: ServiceType, baseName: string, plan: PlanDto): string {
  const included = `Todo lo ${OF_THE_BASE[service]} ${baseName}`;
  const saving = savingOf(plan);
  return saving ? `${included} + ahorrás un ${saving}` : included;
}

export function presentSelectorPlans(
  service: ServiceType,
  plans: PlanDto[],
  options?: PresentPlanOptions,
): SelectorOption[] {
  const [basePlan] = plans;
  if (!basePlan) return [];

  const baseName = presentPlan(basePlan, options).name;

  return plans.map((plan, index) => {
    const { name, price, highlighted, actionLabel, actionHref } = presentPlan(plan, options);
    const isBase = index === 0;

    return {
      id: plan.id,
      name,
      price,
      features: isBase ? plan.features : [],
      includes: isBase ? null : includesText(service, baseName, plan),
      featured: highlighted ?? false,
      actionLabel,
      actionHref,
    };
  });
}

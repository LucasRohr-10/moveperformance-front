import type { PlanKind, ServiceType } from "@/lib/api/types";

import type { PlanKindField } from "./staff-plans-api";

interface KindFieldConfig {
  name: PlanKindField;
  label: string;
  isOptional: boolean;
}

interface KindConfig {
  label: string;
  // One line shown under the kind picker, so the category reads as what it
  // actually is instead of staff having to infer it from the field list.
  description: string;
  service: ServiceType;
  // Whether the plan can be paid with an automatic debit: only the ones that renew.
  allowsAutoDebit: boolean;
  fields: KindFieldConfig[];
}

// A Record, so adding a kind to PlanKind breaks the build here until its form fields exist.
export const PLAN_KIND_FIELDS: Record<PlanKind, KindConfig> = {
  period_plan: {
    label: "Plan por período · Performance",
    description: "El cliente paga y tiene acceso durante la cantidad de meses que definas.",
    service: "performance",
    allowsAutoDebit: true,
    fields: [{ name: "periodMonths", label: "Duración (meses)", isOptional: false }],
  },
  session_pack: {
    label: "Paquete · Recovery",
    description: "Un paquete de sesiones con vigencia en días.",
    service: "recovery",
    allowsAutoDebit: true,
    fields: [
      { name: "periodDays", label: "Vigencia (días)", isOptional: false },
      { name: "sessionsIncluded", label: "Sesiones incluidas", isOptional: false },
      { name: "durationMinutes", label: "Duración de la sesión (minutos)", isOptional: true },
    ],
  },
  single_session: {
    label: "Sesión suelta · Recovery",
    description: "Una sesión individual, sin paquete.",
    service: "recovery",
    allowsAutoDebit: false,
    fields: [{ name: "durationMinutes", label: "Duración de la sesión (minutos)", isOptional: false }],
  },
  evaluation: {
    label: "Evaluación · Rehab",
    description: "Una evaluación inicial de Rehab.",
    service: "rehab",
    allowsAutoDebit: false,
    fields: [{ name: "durationMinutes", label: "Duración de la sesión (minutos)", isOptional: false }],
  },
};

export const PLAN_KINDS = Object.keys(PLAN_KIND_FIELDS) as PlanKind[];

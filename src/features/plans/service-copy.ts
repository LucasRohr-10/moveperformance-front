import type { ServiceType } from "@/lib/api/types";

export type SelectorService = Extract<ServiceType, "performance" | "recovery">;

export interface ServiceCopy {
  label: string;
  caption: string;
  title: string;
  description: string;
}

// Single source for each service's marketing copy — the plan selector (on
// /planes) and the home page's teaser cards both render these same strings.
export const SELECTOR_SERVICES: Record<SelectorService, ServiceCopy> = {
  performance: {
    label: "Performance",
    caption: "Por período",
    title: "Entrená.",
    description: "Entrenamiento semi personalizado, sin límite semanal de asistencias.",
  },
  recovery: {
    label: "Recovery",
    caption: "Por sesión",
    title: "Recuperate.",
    description: "Recovery Room by MOVE. Sesiones sueltas o paquetes mensuales.",
  },
};

export const SERVICE_ORDER: SelectorService[] = ["performance", "recovery"];

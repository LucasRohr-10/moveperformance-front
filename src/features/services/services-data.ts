import { ROUTES } from "@/config/constants/routes.constants";

export interface ServiceLink {
  kicker: string;
  href: string;
}

export const SERVICES: readonly ServiceLink[] = [
  { kicker: "Performance", href: ROUTES.PERFORMANCE },
  { kicker: "Rehab", href: ROUTES.REHAB },
  { kicker: "Recovery", href: ROUTES.RECOVERY },
];

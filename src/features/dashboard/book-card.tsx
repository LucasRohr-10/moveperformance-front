import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { bookingsHref } from "@/features/checkout/checkout-routes";
import type { ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

const SERVICES: { service: ServiceType; label: string }[] = [
  { service: "performance", label: "Performance" },
  { service: "recovery", label: "Recovery" },
  { service: "rehab", label: "Fisioterapia" },
];

export function BookCard() {
  return (
    <Card>
      <SectionLabel>Reservar</SectionLabel>
      <ul className="mt-4 space-y-2">
        {SERVICES.map(({ service, label }) => (
          <li key={service}>
            <Link
              href={bookingsHref(service)}
              className={cn(
                buttonVariants({ variant: "secondary", fullWidth: true, touchTarget: true }),
                "justify-between",
              )}
            >
              {label}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

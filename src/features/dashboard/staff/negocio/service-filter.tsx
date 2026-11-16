import Link from "next/link";

import { cn } from "@/lib/cn";

import { dashboardHref, SERVICE_PARAMS, type DashboardParams, type ServiceParam } from "../dashboard-params";
import { ServiceDot } from "../service-dot";

const OPTIONS: readonly { value: ServiceParam; label: string }[] = [
  { value: SERVICE_PARAMS.ALL, label: "Todos" },
  { value: SERVICE_PARAMS.PERFORMANCE, label: "Performance" },
  { value: SERVICE_PARAMS.REHAB, label: "Rehab" },
  { value: SERVICE_PARAMS.RECOVERY, label: "Recovery" },
];

/** Links, so the chosen service is in the URL. The dot is decoration: the name is always written next to it. */
export function ServiceFilter({ params }: { params: DashboardParams }) {
  return (
    <div role="group" aria-label="Servicio" className="flex flex-wrap gap-1.5 sm:ml-auto">
      {OPTIONS.map(({ value, label }) => (
        <Link
          key={value}
          href={dashboardHref({ ...params, service: value })}
          aria-current={params.service === value ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors sm:min-h-0 sm:py-1.5",
            params.service === value ? "border-white text-white" : "border-line text-muted hover:text-white",
          )}
        >
          {value === SERVICE_PARAMS.ALL ? null : <ServiceDot service={value} />}
          {label}
        </Link>
      ))}
    </div>
  );
}

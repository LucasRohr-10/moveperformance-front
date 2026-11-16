import type { ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

// Whole class names, so Tailwind can see them. Hue is reserved for the three services.
const SERVICE_DOT_CLASS: Record<ServiceType, string> = {
  performance: "bg-performance",
  rehab: "bg-rehab",
  recovery: "bg-recovery",
};

export function ServiceDot({ service, className }: { service: ServiceType; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-full", SERVICE_DOT_CLASS[service], className)} />
  );
}

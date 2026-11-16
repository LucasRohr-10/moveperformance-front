import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";

/** "Falta pagar": only says the client owes; the amount and how to collect live in Pagos. */
export function OwesBadge({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center rounded hover:opacity-80 md:min-h-0">
      <StatusBadge label="Falta pagar" tone="danger" />
    </Link>
  );
}

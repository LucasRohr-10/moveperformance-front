import Link from "next/link";

import { Card } from "@/components/ui/card";
import { CLIENT_ACCOUNT_STATUSES } from "@/lib/api/types";
import type { ClientAccountStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { clientsListHref, type ClientsListParams } from "./clients-list-params";
import { ClientsSearchField } from "./clients-search-field";

interface FilterChip {
  label: string;
  status: ClientAccountStatus;
  expiringSoon: boolean;
}

const FILTER_CHIPS: FilterChip[] = [
  { label: "Activos", status: CLIENT_ACCOUNT_STATUSES.ACTIVE, expiringSoon: false },
  { label: "Vence pronto", status: CLIENT_ACCOUNT_STATUSES.ACTIVE, expiringSoon: true },
  { label: "Dados de baja", status: CLIENT_ACCOUNT_STATUSES.DEACTIVATED, expiringSoon: false },
];

// Search and filter live in the URL, so they stay out of the list's Suspense: typing is never interrupted by a reload.
export function ClientsFilters({ params }: { params: ClientsListParams }) {
  return (
    <Card>
      <ClientsSearchField params={params} />
      <div role="group" aria-label="Filtrar clientes" className="mt-4 flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const isCurrent = chip.status === params.status && chip.expiringSoon === params.expiringSoon;
          return (
            <Link
              key={chip.label}
              // A filter change keeps the search and goes back to the first page.
              href={clientsListHref({ q: params.q, page: 1, status: chip.status, expiringSoon: chip.expiringSoon })}
              aria-current={isCurrent ? "true" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-full border px-[13px] text-xs transition-colors sm:min-h-0 sm:py-1.5",
                isCurrent ? "border-white bg-white font-semibold text-black" : "border-line text-muted hover:text-white",
              )}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

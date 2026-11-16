import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ClientPage } from "@/lib/api/types";

import { clientsListHref, type ClientsListParams } from "./clients-list-params";
import { ClientsListView } from "./clients-list-view";
import { getClients } from "./get-clients";

// A failing API stays inside the list: the filters and the heading keep working. Next's own
// control-flow errors (redirect, prerender bail-outs) are rethrown untouched.
async function loadClients(params: ClientsListParams): Promise<ClientPage | null> {
  try {
    return await getClients(params);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function ClientsListSection({ params }: { params: ClientsListParams }) {
  const data = await loadClients(params);
  if (!data) return <ClientsListError params={params} />;
  return <ClientsListView data={data} params={params} />;
}

function ClientsListError({ params }: { params: ClientsListParams }) {
  return (
    <Card padding="none">
      <EmptyState
        title="No pudimos cargar la lista de clientes"
        description="Puede ser un problema temporario del servidor."
        role="alert"
        action={
          <Link href={clientsListHref(params)} className={buttonVariants({ variant: "secondary", touchTarget: true })}>
            Reintentar
          </Link>
        }
      />
    </Card>
  );
}

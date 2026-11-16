import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { ClientPage } from "@/lib/api/types";

import { CLIENTS_PAGE_SIZE, type ClientsListParams } from "./clients-list-params";
import { clientsListPath } from "./clients-query";

// Server-side only: apiFetchServer forwards the staff member's session cookies.
export async function getClients(params: ClientsListParams): Promise<ClientPage> {
  const response = await apiFetchServer(
    clientsListPath({
      q: params.q,
      page: params.page,
      pageSize: CLIENTS_PAGE_SIZE,
      status: params.status,
      expiringSoon: params.expiringSoon,
    }),
  );
  return parseJsonOrThrow<ClientPage>(response);
}

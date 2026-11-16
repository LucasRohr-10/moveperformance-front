import { apiFetchClient, parseJsonOrThrow, throwIfError } from "@/lib/api/client";
import type {
  ClientDetail,
  ClientPage,
  ClientProfileChanges,
  DeactivationPreview,
  NewClientInput,
} from "@/lib/api/types";

import { CLIENTS_PATH, clientsListPath, type ClientsQueryParams } from "./clients-query";

const JSON_HEADERS = { "Content-Type": "application/json" };

export type ListClientsParams = ClientsQueryParams;

export function listClients(params: ListClientsParams = {}): Promise<ClientPage> {
  return apiFetchClient(clientsListPath(params)).then(parseJsonOrThrow<ClientPage>);
}

export function getClient(id: string): Promise<ClientDetail> {
  return apiFetchClient(`${CLIENTS_PATH}/${id}`).then(parseJsonOrThrow<ClientDetail>);
}

function sendJson(path: string, method: string, body: unknown): Promise<Response> {
  return apiFetchClient(path, { method, headers: JSON_HEADERS, body: JSON.stringify(body) });
}

export function createClient(input: NewClientInput): Promise<ClientDetail> {
  return sendJson(CLIENTS_PATH, "POST", input).then(parseJsonOrThrow<ClientDetail>);
}

/** Phone only: the one field staff can edit on a client's record from the client detail page. */
export function updateClientPhone(id: string, phone: string): Promise<ClientDetail> {
  return sendJson(`${CLIENTS_PATH}/${id}`, "PATCH", { phone }).then(parseJsonOrThrow<ClientDetail>);
}

/** Only the fields in `changes` are sent. */
export function updateClientProfile(id: string, changes: ClientProfileChanges): Promise<ClientDetail> {
  return sendJson(`${CLIENTS_PATH}/${id}`, "PATCH", changes).then(parseJsonOrThrow<ClientDetail>);
}

export function setClientPassword(id: string, password: string): Promise<void> {
  return sendJson(`${CLIENTS_PATH}/${id}/password`, "PUT", { password }).then(throwIfError);
}

export function getDeactivationPreview(id: string): Promise<DeactivationPreview> {
  return apiFetchClient(`${CLIENTS_PATH}/${id}/deactivation-preview`).then(
    parseJsonOrThrow<DeactivationPreview>,
  );
}

export function deactivateClient(id: string, reason: string | null): Promise<ClientDetail> {
  return sendJson(`${CLIENTS_PATH}/${id}/deactivate`, "POST", reason ? { reason } : {}).then(
    parseJsonOrThrow<ClientDetail>,
  );
}

export function reactivateClient(id: string): Promise<ClientDetail> {
  return sendJson(`${CLIENTS_PATH}/${id}/reactivate`, "POST", {}).then(parseJsonOrThrow<ClientDetail>);
}

/** The id of the client whose email is exactly `email` (ignoring case), or null if none or if the search fails. */
export async function findClientIdByEmail(email: string): Promise<string | null> {
  try {
    const { items } = await listClients({ q: email });
    const wanted = email.toLowerCase();
    return items.find((client) => client.email.toLowerCase() === wanted)?.id ?? null;
  } catch {
    return null;
  }
}

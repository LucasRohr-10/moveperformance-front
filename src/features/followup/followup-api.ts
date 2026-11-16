import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type {
  AlertCountsDto,
  AlertDto,
  AlertType,
  ClientFollowupDto,
  ContactChannel,
  ContactDto,
  ContactOutcome,
  ContactTemplate,
  InactivityReason,
  InactivityReasonDto,
  PendingContactDto,
} from "@/lib/api/types";

const ALERTS_PATH = "/api/v1/staff/alerts";
const JSON_HEADERS = { "Content-Type": "application/json" };

const clientPath = (clientId: string) => `/api/v1/staff/clients/${encodeURIComponent(clientId)}`;

function post<T>(path: string, body?: unknown): Promise<T> {
  const init =
    body === undefined
      ? { method: "POST" }
      : { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) };
  return apiFetchClient(path, init).then(parseJsonOrThrow<T>);
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return apiFetchClient(path, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  }).then(parseJsonOrThrow<T>);
}

// The API only returns open alerts unless asked otherwise, so no status is sent.
// `group: "risk"` is the clients at risk: the alerts that mean a client may be lost.
export function listAlerts(type?: AlertType, group?: "risk"): Promise<AlertDto[]> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (group) params.set("group", group);
  const query = params.toString();
  const path = query ? `${ALERTS_PATH}?${query}` : ALERTS_PATH;
  return apiFetchClient(path).then(parseJsonOrThrow<AlertDto[]>);
}

export function getAlertCounts(): Promise<AlertCountsDto> {
  return apiFetchClient(`${ALERTS_PATH}/counts`).then(parseJsonOrThrow<AlertCountsDto>);
}

export function handleAlert(id: string): Promise<AlertDto> {
  return post(`${ALERTS_PATH}/${encodeURIComponent(id)}/handle`);
}

export function recordContact(
  clientId: string,
  // `outcome` omitted: the contact is sent now and its outcome is logged later via `completeContact`.
  input: {
    channel: ContactChannel;
    outcome?: ContactOutcome;
    note?: string;
    alertId?: string;
    template?: ContactTemplate;
  },
): Promise<ContactDto> {
  return post(`${clientPath(clientId)}/contact`, input);
}

export function completeContact(
  clientId: string,
  contactId: string,
  input: { outcome: ContactOutcome; note?: string },
): Promise<ContactDto> {
  return patch(`${clientPath(clientId)}/contact/${encodeURIComponent(contactId)}`, input);
}

export function listPendingContacts(): Promise<PendingContactDto[]> {
  return apiFetchClient("/api/v1/staff/contacts/pending").then(parseJsonOrThrow<PendingContactDto[]>);
}

export function startPause(
  clientId: string,
  input: { reason: InactivityReason; note?: string; recontactOn?: string },
): Promise<InactivityReasonDto> {
  return post(`${clientPath(clientId)}/inactivity-reasons`, input);
}

export function endPause(clientId: string): Promise<InactivityReasonDto> {
  return post(`${clientPath(clientId)}/inactivity-reasons/end`);
}

export function getClientFollowup(clientId: string): Promise<ClientFollowupDto> {
  return apiFetchClient(`${clientPath(clientId)}/followup`).then(parseJsonOrThrow<ClientFollowupDto>);
}

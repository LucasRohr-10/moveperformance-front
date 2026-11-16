// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import {
  completeContact,
  endPause,
  getAlertCounts,
  getClientFollowup,
  handleAlert,
  listAlerts,
  listPendingContacts,
  recordContact,
  startPause,
} from "./followup-api";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

const jsonPost = (body?: unknown) => ({
  method: "POST",
  ...(body === undefined
    ? {}
    : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
});

const jsonPatch = (body: unknown) => ({
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("follow-up API", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("lists the open alerts of a type", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json([]));

    await expect(listAlerts("expiring")).resolves.toEqual([]);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/alerts?type=expiring");
  });

  it("asks for the risk alerts with group=risk", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json([]));

    await listAlerts(undefined, "risk");

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/alerts?group=risk");
  });

  it("lists every open alert without a query when there is no type", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json([]));

    await listAlerts();

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/alerts");
  });

  it("reads the counters", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ total: 2, expiring: 2 }));

    await expect(getAlertCounts()).resolves.toMatchObject({ total: 2 });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/alerts/counts");
  });

  it("marks an alert as handled with a POST", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "a-1", status: "handled" }));

    await expect(handleAlert("a-1")).resolves.toMatchObject({ status: "handled" });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/alerts/a-1/handle", jsonPost());
  });

  it("records a contact for the client with the alert id", async () => {
    const input = { channel: "phone", outcome: "no_answer", note: "Llamé a las 18", alertId: "a-1" } as const;
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "c-1" }, { status: 201 }));

    await recordContact("client-1", input);

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/clients/client-1/contact", jsonPost(input));
  });

  it("records a contact without an outcome — it stays pending", async () => {
    const input = { channel: "whatsapp" } as const;
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "c-1", outcome: null }, { status: 201 }));

    await recordContact("client-1", input);

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/clients/client-1/contact", jsonPost(input));
  });

  it("completes a pending contact's outcome with a PATCH", async () => {
    const input = { outcome: "reached" } as const;
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "c-1", outcome: "reached" }));

    await completeContact("client-1", "c-1", input);

    expect(apiFetchClientMock).toHaveBeenCalledWith(
      "/api/v1/staff/clients/client-1/contact/c-1",
      jsonPatch(input),
    );
  });

  it("lists every pending contact across clients", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json([]));

    await expect(listPendingContacts()).resolves.toEqual([]);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/contacts/pending");
  });

  it("starts a pause with the reason and the re-contact date", async () => {
    const input = { reason: "injury", recontactOn: "2026-11-01" } as const;
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "p-1" }, { status: 201 }));

    await startPause("client-1", input);

    expect(apiFetchClientMock).toHaveBeenCalledWith(
      "/api/v1/staff/clients/client-1/inactivity-reasons",
      jsonPost(input),
    );
  });

  it("ends the active pause of the client", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "p-1" }));

    await endPause("client-1");

    expect(apiFetchClientMock).toHaveBeenCalledWith(
      "/api/v1/staff/clients/client-1/inactivity-reasons/end",
      jsonPost(),
    );
  });

  it("reads the follow-up history of a client", async () => {
    const followup = { pause: null, pauses: [], contacts: [] };
    apiFetchClientMock.mockResolvedValue(Response.json(followup));

    await expect(getClientFollowup("client-1")).resolves.toEqual(followup);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/clients/client-1/followup");
  });

  it("throws the API error with its message", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json(
        { statusCode: 409, code: "ALERT_ALREADY_HANDLED", message: "Otra persona ya gestionó esta alerta." },
        { status: 409 },
      ),
    );

    const failure = await handleAlert("a-1").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).body.code).toBe("ALERT_ALREADY_HANDLED");
    expect((failure as ApiError).body.message).toBe("Otra persona ya gestionó esta alerta.");
  });
});

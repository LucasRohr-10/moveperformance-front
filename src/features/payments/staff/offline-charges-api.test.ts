// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";

import {
  getOfflineCharge,
  getReceiptUpload,
  getStaffReceiptLink,
  listOpenOfflineCharges,
  recordOfflinePayment,
  waiveOfflineCharge,
} from "./offline-charges-api";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

beforeEach(() => vi.clearAllMocks());

describe("offline charges API", () => {
  it("records a payment as JSON without a receipt and without a null note", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "ch1" }));

    await recordOfflinePayment("ch1", {
      method: "cash",
      amount: 900,
      paidOn: "2026-11-02",
      note: null,
      receipt: null,
    });

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges/ch1/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "cash", amount: 900, paidOn: "2026-11-02" }),
    });
  });

  it("sends the note in the JSON when there is one", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "ch1" }));

    await recordOfflinePayment("ch1", {
      method: "transfer",
      amount: 1200.5,
      paidOn: "2026-11-02",
      note: "De la madre",
      receipt: null,
    });

    const [, init] = apiFetchClientMock.mock.calls[0];
    expect(init?.body).toBe(
      JSON.stringify({ method: "transfer", amount: 1200.5, paidOn: "2026-11-02", note: "De la madre" }),
    );
  });

  it("records a payment as multipart with the receipt", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "ch1" }));
    const receipt = new File(["x"], "comprobante.pdf", { type: "application/pdf" });

    await recordOfflinePayment("ch1", {
      method: "transfer",
      amount: 1200,
      paidOn: "2026-11-02",
      note: "De la madre",
      receipt,
    });

    const [path, init] = apiFetchClientMock.mock.calls[0];
    expect(path).toBe("/api/v1/staff/offline-charges/ch1/payment");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toBeUndefined();
    const body = init?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("method")).toBe("transfer");
    expect(body.get("amount")).toBe("1200");
    expect(body.get("paidOn")).toBe("2026-11-02");
    expect(body.get("note")).toBe("De la madre");
    expect((body.get("receipt") as File).name).toBe("comprobante.pdf");
  });

  it("leaves the note out of the multipart when there is none", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "ch1" }));
    const receipt = new File(["x"], "c.png", { type: "image/png" });

    await recordOfflinePayment("ch1", {
      method: "cash",
      amount: 900,
      paidOn: "2026-11-02",
      note: null,
      receipt,
    });

    const body = apiFetchClientMock.mock.calls[0][1]?.body as FormData;
    expect(body.has("note")).toBe(false);
  });

  it("reads whether receipts can be uploaded", async () => {
    const upload = { available: true, maxBytes: 5242880, allowedTypes: ["application/pdf"] };
    apiFetchClientMock.mockResolvedValue(Response.json(upload));

    await expect(getReceiptUpload()).resolves.toEqual(upload);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges/receipt-upload");
  });

  it("asks for a staff receipt link", async () => {
    const link = { url: "https://files.test/r", expiresAt: "2026-11-02T13:00:00.000Z" };
    apiFetchClientMock.mockResolvedValue(Response.json(link));

    await expect(getStaffReceiptLink("ch1", "p1")).resolves.toEqual(link);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges/ch1/payments/p1/receipt");
  });

  it("reads a charge", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "ch 1", payments: [] }));

    await expect(getOfflineCharge("ch 1")).resolves.toEqual({ id: "ch 1", payments: [] });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges/ch%201");
  });

  it("waives with the reason", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "ch1", status: "waived" }));

    await expect(waiveOfflineCharge("ch1", "Cortesía")).resolves.toEqual({ id: "ch1", status: "waived" });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges/ch1/waive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cortesía" }),
    });
  });

  it("lists open charges of a client", async () => {
    const list = { items: [], total: 0, limitPerClient: 2 };
    apiFetchClientMock.mockResolvedValue(Response.json(list));

    await expect(listOpenOfflineCharges({ clientId: "c1" })).resolves.toEqual(list);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges?clientId=c1");
  });

  it("lists every open charge when there is no filter", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ items: [], total: 0, limitPerClient: 2 }));

    await listOpenOfflineCharges({});

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges");
  });

  it("asks the API for overdue charges when atrasados=true", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ items: [], total: 0, limitPerClient: 2 }));

    await listOpenOfflineCharges({ overdue: true });

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges?overdue=true");
  });

  it("asks the API for today's charges when dia=hoy", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ items: [], total: 0, limitPerClient: 2 }));

    await listOpenOfflineCharges({ today: true });

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/offline-charges?today=true");
  });

  it("lists open charges of some bookings joined by commas", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ items: [], total: 0, limitPerClient: 2 }));

    await listOpenOfflineCharges({ bookingIds: ["b1", "b2"] });

    const [path] = apiFetchClientMock.mock.calls[0];
    const query = new URL(`http://x${path}`).searchParams;
    expect(query.get("bookingIds")).toBe("b1,b2");
  });

  it("resolves empty without a request for no booking ids", async () => {
    await expect(listOpenOfflineCharges({ bookingIds: [] })).resolves.toEqual({
      items: [],
      total: 0,
      limitPerClient: 0,
    });
    expect(apiFetchClientMock).not.toHaveBeenCalled();
  });
});

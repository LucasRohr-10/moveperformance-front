import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getClient } from "@/features/clients/staff/clients-api";
import { ApiError } from "@/lib/api/errors";
import type { ClientDetail, ClientRow, MySubscriptionsDto } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { OfflinePrices } from "./offline-price";
import { getClientSubscriptions, getOfflineChargeAllowance } from "./staff-booking-api";
import { StaffBookingPanel } from "./staff-booking-panel";
import type { StaffBookingConfig } from "./staff-booking-grid";

const { replaceMock, gridMounts, gridProps } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  gridMounts: { count: 0 },
  gridProps: { latest: null as { subscriptions: MySubscriptionsDto; staff: StaffBookingConfig } | null },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/features/clients/staff/clients-api", () => ({ getClient: vi.fn(), listClients: vi.fn() }));
vi.mock("./staff-booking-api", () => ({
  getClientSubscriptions: vi.fn(),
  getOfflineChargeAllowance: vi.fn(),
}));
vi.mock("./client-picker", () => ({
  ClientPicker: ({ onPick }: { onPick(client: ClientRow): void }) => (
    <div data-testid="picker">
      <button type="button" onClick={() => onPick(ROW_ANA)}>
        Elegir Ana
      </button>
      <button type="button" onClick={() => onPick(ROW_BETO)}>
        Elegir Beto
      </button>
    </div>
  ),
}));
vi.mock("./staff-booking-grid", () => ({
  StaffBookingGrid: (props: { subscriptions: MySubscriptionsDto; staff: StaffBookingConfig }) => {
    gridProps.latest = props;
    useEffect(() => {
      gridMounts.count += 1;
    }, []);
    return (
      <div data-testid="grid" data-client={props.staff.client.id}>
        <button type="button" onClick={props.staff.onBooked}>
          Simular reserva
        </button>
      </div>
    );
  },
}));

const getClientMock = vi.mocked(getClient);
const subscriptionsMock = vi.mocked(getClientSubscriptions);
const allowanceMock = vi.mocked(getOfflineChargeAllowance);

const PRICES: OfflinePrices = {
  rehabEvaluation: 1800,
  rehabFollowup: 1200,
  recoverySession: 900,
  performanceClass: 700,
};
const NO_PRICES: OfflinePrices = {
  rehabEvaluation: null,
  rehabFollowup: null,
  recoverySession: null,
  performanceClass: null,
};
const SUBSCRIPTIONS: MySubscriptionsDto = { performance: null, upcomingPerformances: [], recoveryPacks: [] };

const ROW_ANA: ClientRow = {
  id: "c1",
  name: "Ana",
  lastName: "Gómez",
  email: "ana@move.uy",
  phone: null,
  nextBookingAt: null,
  lastAttendanceStatus: null,
  deactivatedAt: null,
};
const ROW_BETO: ClientRow = { ...ROW_ANA, id: "c2", name: "Beto", lastName: null, email: "beto@move.uy" };

function detailOf(overrides: Partial<ClientDetail> = {}): ClientDetail {
  return {
    id: "c1",
    name: "Ana",
    lastName: "Gómez",
    email: "ana@move.uy",
    phone: null,
    birthDate: null,
    age: null,
    clientSince: "2026-01-01T00:00:00.000Z",
    plan: null,
    paymentStatus: null,
    bookings: [],
    deactivation: null,
    ...overrides,
  };
}

function apiError(statusCode: number, code: string, message: string): ApiError {
  return new ApiError({ statusCode, code, message });
}

beforeEach(() => {
  vi.clearAllMocks();
  gridMounts.count = 0;
  gridProps.latest = null;
  subscriptionsMock.mockResolvedValue(SUBSCRIPTIONS);
  allowanceMock.mockResolvedValue({ open: 1, limit: 2, remaining: 1 });
  getClientMock.mockResolvedValue(detailOf());
});

describe("StaffBookingPanel", () => {
  it("starts with the picker and no calendar", () => {
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);

    expect(screen.getByTestId("picker")).toBeDefined();
    expect(screen.queryByTestId("grid")).toBeNull();
    expect(screen.queryByLabelText("Cliente elegido")).toBeNull();
  });

  it("loads plans and the offline allowance after picking, then shows the client bar above the calendar", async () => {
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);

    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));

    const grid = await screen.findByTestId("grid");
    expect(subscriptionsMock).toHaveBeenCalledWith("c1");
    expect(allowanceMock).toHaveBeenCalledWith("c1");
    expect(gridProps.latest?.subscriptions).toBe(SUBSCRIPTIONS);
    expect(gridProps.latest?.staff).toMatchObject({
      client: { id: "c1", name: "Ana Gómez" },
      offlineRoom: 1,
      prices: PRICES,
    });
    const bar = screen.getByLabelText("Cliente elegido");
    expect(bar.textContent).toBe("Ana GómezCambiar cliente");
    expect(bar.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("picker")).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith("/staff/book?clientId=c1", { scroll: false });
  });

  it("says when the charges did not load", async () => {
    allowanceMock.mockRejectedValue(new Error("boom"));
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);

    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));

    expect(await screen.findByText("No pudimos ver sus cobros por fuera.")).toBeDefined();
    expect(screen.getByTestId("grid")).toBeDefined();
  });

  it("passes a null room when the charges fail", async () => {
    allowanceMock.mockRejectedValue(new Error("boom"));
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);

    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));
    await screen.findByTestId("grid");

    expect(gridProps.latest?.staff.offlineRoom).toBeNull();
  });

  it("enters with the client from the URL", async () => {
    renderWithSnackbar(<StaffBookingPanel initialClientId="c1" prices={PRICES} />);

    expect(await screen.findByTestId("grid")).toBeDefined();
    expect(getClientMock).toHaveBeenCalledWith("c1");
    expect(subscriptionsMock).toHaveBeenCalledWith("c1");
    expect(screen.getByLabelText("Cliente elegido").textContent).toContain("Ana Gómez");
  });

  it("refuses a deactivated client with the notice and the record link", async () => {
    getClientMock.mockResolvedValue(
      detailOf({
        deactivation: { deactivatedAt: "2026-10-30T12:00:00.000Z", deactivatedByName: null, reason: null },
      }),
    );
    renderWithSnackbar(<StaffBookingPanel initialClientId="c1" prices={PRICES} />);

    expect(
      await screen.findByText("Este cliente está dado de baja. Reactivalo desde su ficha para reservarle."),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Abrir su ficha →" }).getAttribute("href")).toBe("/staff/clients/c1");
    expect(screen.queryByTestId("grid")).toBeNull();
    expect(subscriptionsMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("picker")).toBeDefined();
  });

  it("shows the back's message and returns to the picker when the plans are refused", async () => {
    subscriptionsMock.mockRejectedValue(apiError(403, "ACCOUNT_DEACTIVATED", "La cuenta de este cliente está desactivada."));
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);

    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));

    expect(await screen.findByText("La cuenta de este cliente está desactivada.")).toBeDefined();
    expect(screen.getByTestId("picker")).toBeDefined();
    expect(screen.queryByTestId("grid")).toBeNull();
    expect(replaceMock).toHaveBeenLastCalledWith("/staff/book", { scroll: false });
  });

  it("shows the back's message and the picker when the client from the URL does not exist", async () => {
    getClientMock.mockRejectedValue(apiError(404, "CLIENT_NOT_FOUND", "No encontramos al cliente."));
    renderWithSnackbar(<StaffBookingPanel initialClientId="nope" prices={PRICES} />);

    expect(await screen.findByText("No encontramos al cliente.")).toBeDefined();
    expect(screen.getByTestId("picker")).toBeDefined();
  });

  it("reloads plans and charges after booking", async () => {
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);
    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));
    await screen.findByTestId("grid");
    const afterBooking: MySubscriptionsDto = { ...SUBSCRIPTIONS, upcomingPerformances: [] };
    subscriptionsMock.mockResolvedValue(afterBooking);
    allowanceMock.mockResolvedValue({ open: 2, limit: 2, remaining: 0 });

    await userEvent.click(screen.getByRole("button", { name: "Simular reserva" }));

    await waitFor(() => expect(gridProps.latest?.staff.offlineRoom).toBe(0));
    expect(gridProps.latest?.subscriptions).toBe(afterBooking);
    expect(subscriptionsMock).toHaveBeenCalledTimes(2);
    expect(allowanceMock).toHaveBeenCalledTimes(2);
    // The cart is not emptied by the reload.
    expect(gridMounts.count).toBe(1);
  });

  it("ignores a late reload of the previous client", async () => {
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);
    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));
    await screen.findByTestId("grid");
    // Ana's booking is still in flight when Staff moves on to Beto.
    const anaBooked = gridProps.latest!.staff.onBooked;
    await userEvent.click(screen.getByRole("button", { name: "Cambiar cliente" }));
    const betoSubscriptions: MySubscriptionsDto = { ...SUBSCRIPTIONS, upcomingPerformances: [] };
    let resolveBeto: (value: MySubscriptionsDto) => void = () => undefined;
    subscriptionsMock.mockImplementation((id) =>
      id === "c2" ? new Promise<MySubscriptionsDto>((resolve) => (resolveBeto = resolve)) : Promise.resolve(SUBSCRIPTIONS),
    );
    await userEvent.click(screen.getByRole("button", { name: "Elegir Beto" }));
    subscriptionsMock.mockClear();
    allowanceMock.mockClear();

    // Ana's booking resolves while Beto's plans are loading.
    act(() => anaBooked());
    resolveBeto(betoSubscriptions);

    const grid = await screen.findByTestId("grid");
    expect(grid.getAttribute("data-client")).toBe("c2");
    expect(gridProps.latest?.subscriptions).toBe(betoSubscriptions);
    expect(subscriptionsMock).not.toHaveBeenCalledWith("c1");
    expect(allowanceMock).not.toHaveBeenCalledWith("c1");
  });

  it("starts an empty cart when the client changes", async () => {
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);
    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));
    await screen.findByTestId("grid");
    expect(gridMounts.count).toBe(1);

    await userEvent.click(screen.getByRole("button", { name: "Cambiar cliente" }));
    expect(screen.queryByTestId("grid")).toBeNull();
    expect(replaceMock).toHaveBeenLastCalledWith("/staff/book", { scroll: false });

    await userEvent.click(screen.getByRole("button", { name: "Elegir Beto" }));
    const grid = await screen.findByTestId("grid");

    expect(grid.getAttribute("data-client")).toBe("c2");
    expect(gridMounts.count).toBe(2);
    expect(replaceMock).toHaveBeenLastCalledWith("/staff/book?clientId=c2", { scroll: false });
  });

  it("shows the plans error with Reintentar", async () => {
    subscriptionsMock.mockRejectedValueOnce(new Error("boom"));
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={PRICES} />);
    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));

    expect(await screen.findByText("No pudimos cargar sus planes.")).toBeDefined();
    expect(screen.queryByTestId("grid")).toBeNull();
    expect(screen.getByLabelText("Cliente elegido")).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByTestId("grid")).toBeDefined();
    expect(screen.queryByText("No pudimos cargar sus planes.")).toBeNull();
  });

  it("still books when the prices are missing", async () => {
    renderWithSnackbar(<StaffBookingPanel initialClientId={null} prices={NO_PRICES} />);

    await userEvent.click(screen.getByRole("button", { name: "Elegir Ana" }));
    await screen.findByTestId("grid");

    expect(gridProps.latest?.staff.prices).toEqual(NO_PRICES);
  });
});

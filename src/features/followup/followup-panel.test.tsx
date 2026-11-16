import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/staff/follow-up",
}));
vi.mock("./followup-api", () => ({
  listAlerts: vi.fn(),
  getAlertCounts: vi.fn(),
  handleAlert: vi.fn(),
  recordContact: vi.fn(),
  startPause: vi.fn(),
}));

import { alertFixture, countsFixture } from "./alert-fixtures";
import { FollowupPanel } from "./followup-panel";
import { getAlertCounts, handleAlert, listAlerts } from "./followup-api";

const listMock = vi.mocked(listAlerts);
const countsMock = vi.mocked(getAlertCounts);
const handleMock = vi.mocked(handleAlert);

const ana = alertFixture();
const martin = alertFixture({
  id: "alert-2",
  type: "expired",
  client: {
    id: "client-2",
    name: "Martín Rodríguez",
    initials: "MR",
    phone: "+59899765432",
    email: "martin@example.com",
  },
  endsOn: "2026-10-02",
  contactsCount: 2,
});

describe("FollowupPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listMock.mockResolvedValue([ana, martin]);
    countsMock.mockResolvedValue(countsFixture());
  });

  it("shows the counters from the API and filters through the URL", async () => {
    renderWithSnackbar(<FollowupPanel type={null} />);

    const filters = await screen.findByRole("group", { name: "Filtrar alertas" });
    expect(within(filters).getByRole("button", { name: "Todas · 2" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(within(filters).getByRole("button", { name: "Por vencer · 1" }));

    expect(replace).toHaveBeenCalledWith("?tipo=expiring");
  });

  it("goes back to all the alerts from the Todas chip", async () => {
    listMock.mockResolvedValue([ana]);
    renderWithSnackbar(<FollowupPanel type="expiring" />);

    const filters = await screen.findByRole("group", { name: "Filtrar alertas" });
    expect(within(filters).getByRole("button", { name: "Por vencer · 1" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(within(filters).getByRole("button", { name: "Todas · 2" }));

    expect(listMock).toHaveBeenCalledWith("expiring");
    expect(replace).toHaveBeenCalledWith("/staff/follow-up");
  });

  it("loads risk alerts with group=risk when riesgo=true", async () => {
    renderWithSnackbar(<FollowupPanel type={null} riskOnly />);

    const filters = await screen.findByRole("group", { name: "Filtrar alertas" });
    expect(listMock).toHaveBeenCalledWith(undefined, "risk");
    const risk = within(filters).getByRole("button", { name: "En riesgo" });
    expect(risk.getAttribute("aria-pressed")).toBe("true");
    expect(within(filters).getByRole("button", { name: "Todas · 2" }).getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(within(filters).getByRole("button", { name: "Todas · 2" }));
    expect(replace).toHaveBeenCalledWith("/staff/follow-up");
  });

  it("filters to the clients at risk through the URL, with no counter on the chip", async () => {
    renderWithSnackbar(<FollowupPanel type={null} />);

    const filters = await screen.findByRole("group", { name: "Filtrar alertas" });
    await userEvent.click(within(filters).getByRole("button", { name: "En riesgo" }));

    expect(replace).toHaveBeenCalledWith("?riesgo=true");
  });

  it("says there are no clients at risk when that list is empty", async () => {
    listMock.mockResolvedValue([]);
    renderWithSnackbar(<FollowupPanel type={null} riskOnly />);

    expect(await screen.findByText("No hay clientes en riesgo para revisar.")).toBeDefined();
  });

  it("lists one row per alert", async () => {
    renderWithSnackbar(<FollowupPanel type={null} />);

    expect(await screen.findByText("Ana Pérez")).toBeDefined();
    expect(screen.getByText("Martín Rodríguez")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("groups the alerts by urgency, the most urgent first", async () => {
    renderWithSnackbar(<FollowupPanel type={null} />);

    await screen.findByText("Ana Pérez");
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

    expect(headings).toEqual(["Urgentes · 1", "Requieren atención · 1"]);
    const urgent = screen.getByRole("region", { name: "Urgentes · 1" });
    expect(within(urgent).getByText("Martín Rodríguez")).toBeDefined();
    expect(within(urgent).queryByText("Ana Pérez")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Para seguimiento/ })).toBeNull();
  });

  it("keeps the list when the counters fail and offers to retry the counters", async () => {
    countsMock.mockRejectedValueOnce(new Error("boom"));
    renderWithSnackbar(<FollowupPanel type={null} />);

    expect(await screen.findByText("No pudimos cargar los contadores.")).toBeDefined();
    expect(screen.getByText("Ana Pérez")).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar contadores" }));

    expect(await screen.findByRole("button", { name: "Todas · 2" })).toBeDefined();
  });

  it("shows the empty state of all the alerts", async () => {
    listMock.mockResolvedValue([]);
    renderWithSnackbar(<FollowupPanel type={null} />);

    expect(await screen.findByText("Sin alertas")).toBeDefined();
    expect(screen.getByText("No hay alertas abiertas para revisar.")).toBeDefined();
  });

  it("shows the empty state of a type", async () => {
    listMock.mockResolvedValue([]);
    renderWithSnackbar(<FollowupPanel type="no_attendance" />);

    expect(await screen.findByText('No hay alertas de "1 semana sin asistir" para revisar.')).toBeDefined();
  });

  it("shows the loading skeleton and the list error with retry", async () => {
    listMock.mockRejectedValueOnce(new Error("boom"));
    renderWithSnackbar(<FollowupPanel type={null} />);
    expect(screen.getByText("Cargando alertas…")).toBeDefined();

    expect(await screen.findByText("No pudimos cargar las alertas.")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Ana Pérez")).toBeDefined();
  });

  it("marks an alert as handled, removes it and reloads the counters", async () => {
    handleMock.mockResolvedValue({ ...martin, status: "handled" });
    renderWithSnackbar(<FollowupPanel type={null} />);
    await screen.findByText("Martín Rodríguez");
    listMock.mockResolvedValue([ana]);
    countsMock.mockResolvedValue(countsFixture({ total: 1, expired: 0 }));

    const card = screen.getByText("Martín Rodríguez").closest("li") as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: "Marcar gestionado" }));
    await userEvent.click(within(card).getByRole("button", { name: "Sí, marcar gestionado" }));

    expect((await screen.findByRole("status")).textContent).toContain("Alerta marcada como gestionada.");
    expect(screen.queryByText("Martín Rodríguez")).toBeNull();
    expect(await screen.findByRole("button", { name: "Todas · 1" })).toBeDefined();
  });

  it("explains and refreshes when another staff already handled the alert", async () => {
    handleMock.mockRejectedValue(
      new ApiError({
        statusCode: 409,
        code: "ALERT_ALREADY_HANDLED",
        message: "Otra persona del equipo ya gestionó esta alerta.",
      }),
    );
    renderWithSnackbar(<FollowupPanel type={null} />);
    await screen.findByText("Martín Rodríguez");
    listMock.mockResolvedValue([ana]);
    countsMock.mockResolvedValue(countsFixture({ total: 1, expired: 0 }));

    const card = screen.getByText("Martín Rodríguez").closest("li") as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: "Marcar gestionado" }));
    await userEvent.click(within(card).getByRole("button", { name: "Sí, marcar gestionado" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Otra persona del equipo ya gestionó esta alerta.");
    expect(screen.queryByText("Martín Rodríguez")).toBeNull();
    expect(await screen.findByRole("button", { name: "Todas · 1" })).toBeDefined();
  });
});

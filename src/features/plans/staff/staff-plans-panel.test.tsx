import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { StaffPlanDto } from "@/lib/api/types";

vi.mock("./staff-plans-api", () => ({
  listStaffPlans: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
}));

import { StaffPlansPanel } from "./staff-plans-panel";
import { deletePlan, listStaffPlans, updatePlan } from "./staff-plans-api";

const listMock = vi.mocked(listStaffPlans);
const updateMock = vi.mocked(updatePlan);
const deleteMock = vi.mocked(deletePlan);

const monthly: StaffPlanDto = {
  id: "1",
  service: "performance",
  kind: "period_plan",
  slug: "mensual",
  name: "Mensual",
  description: "",
  features: [],
  price: 3900,
  periodMonths: 1,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: null,
  featured: false,
  autoDebitEnabled: false,
  sortOrder: 0,
  isActive: true,
};
const inactivePack: StaffPlanDto = {
  ...monthly,
  id: "2",
  service: "recovery",
  kind: "session_pack",
  slug: "paquete-4",
  name: "Paquete 4",
  price: 3200,
  periodMonths: null,
  periodDays: 30,
  sessionsIncluded: 4,
  isActive: false,
};

const rowOf = (name: string) => screen.getByRole("row", { name: new RegExp(name) });

describe("StaffPlansPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a heading and a live count once the plans load", async () => {
    listMock.mockResolvedValue([monthly, inactivePack]);

    renderWithSnackbar(<StaffPlansPanel />);

    expect(screen.getByRole("heading", { level: 1, name: "Planes" })).toBeDefined();
    expect(await screen.findByText("2 planes · 1 activos. Tocá un plan para editarlo.")).toBeDefined();
  });

  it("shows loading, then every plan with its kind, price and state", async () => {
    listMock.mockResolvedValue([monthly, inactivePack]);

    renderWithSnackbar(<StaffPlansPanel />);

    expect(screen.getByText("Cargando planes…")).toBeDefined();
    expect(await screen.findByText("Mensual")).toBeDefined();
    expect(within(rowOf("Mensual")).getByText("Plan por período · Performance")).toBeDefined();
    expect(within(rowOf("Mensual")).getByText("$ 3.900")).toBeDefined();
    expect(within(rowOf("Mensual")).getByText("Activo")).toBeDefined();
    expect(within(rowOf("Paquete 4")).getByText("Inactivo")).toBeDefined();
  });

  it("shows an empty state", async () => {
    listMock.mockResolvedValue([]);

    renderWithSnackbar(<StaffPlansPanel />);

    expect(await screen.findByText("Todavía no hay planes")).toBeDefined();
  });

  it("shows an error state", async () => {
    listMock.mockRejectedValue(new Error("down"));

    renderWithSnackbar(<StaffPlansPanel />);

    expect(await screen.findByText("No pudimos cargar los planes")).toBeDefined();
  });

  it("deactivates an active plan by patching its row, without reloading the list", async () => {
    listMock.mockResolvedValue([monthly]);
    updateMock.mockResolvedValue({ ...monthly, isActive: false });
    const user = userEvent.setup();
    renderWithSnackbar(<StaffPlansPanel />);

    await user.click(await screen.findByRole("button", { name: "Desactivar" }));

    expect(updateMock).toHaveBeenCalledWith("1", { isActive: false });
    expect(await screen.findByText("Inactivo")).toBeDefined();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("activates an inactive plan", async () => {
    listMock.mockResolvedValue([inactivePack]);
    updateMock.mockResolvedValue({ ...inactivePack, isActive: true });
    const user = userEvent.setup();
    renderWithSnackbar(<StaffPlansPanel />);

    await user.click(await screen.findByRole("button", { name: "Activar" }));

    expect(updateMock).toHaveBeenCalledWith("2", { isActive: true });
  });

  it("deletes only after the staff confirms", async () => {
    listMock.mockResolvedValue([monthly]);
    deleteMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithSnackbar(<StaffPlansPanel />);

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("¿Eliminar el plan «Mensual»?");
    expect(deleteMock).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(deleteMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar plan" }),
    );

    expect(deleteMock).toHaveBeenCalledWith("1");
    expect((await screen.findByRole("status")).textContent).toContain("Plan eliminado");
  });

  it("links to the new-plan route", async () => {
    listMock.mockResolvedValue([monthly]);
    renderWithSnackbar(<StaffPlansPanel />);

    const link = await screen.findByRole("link", { name: "Nuevo plan" });
    expect(link.getAttribute("href")).toBe("/staff/plans/new");
  });

  it("links each plan's name to its edit route", async () => {
    listMock.mockResolvedValue([monthly]);
    renderWithSnackbar(<StaffPlansPanel />);

    const link = await screen.findByRole("link", { name: "Mensual" });
    expect(link.getAttribute("href")).toBe("/staff/plans/1");
  });
});

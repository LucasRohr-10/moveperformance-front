import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { StaffPlanDto } from "@/lib/api/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("./staff-plans-api", () => ({ getPlan: vi.fn() }));
vi.mock("./plan-form", () => ({
  PlanForm: ({
    plan,
    onSaved,
    onCancel,
  }: {
    plan: StaffPlanDto;
    onSaved: () => void;
    onCancel: () => void;
  }) => (
    <div>
      <p>{plan.name}</p>
      <button onClick={onSaved}>Simular guardado</button>
      <button onClick={onCancel}>Simular cancelar</button>
    </div>
  ),
}));

import { EditPlanPanel } from "./edit-plan-panel";
import { getPlan } from "./staff-plans-api";

const getPlanMock = vi.mocked(getPlan);

const plan: StaffPlanDto = {
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

describe("EditPlanPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the plan and renders the form", async () => {
    getPlanMock.mockResolvedValue(plan);

    renderWithSnackbar(<EditPlanPanel planId="1" />);

    expect(await screen.findByText("Mensual")).toBeDefined();
    expect(getPlanMock).toHaveBeenCalledWith("1");
  });

  it("shows an error state with retry", async () => {
    getPlanMock.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(plan);
    const user = userEvent.setup();

    renderWithSnackbar(<EditPlanPanel planId="1" />);

    expect(await screen.findByText("No pudimos cargar el plan")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Mensual")).toBeDefined();
  });

  it("goes back to the list after saving or cancelling", async () => {
    getPlanMock.mockResolvedValue(plan);
    const user = userEvent.setup();
    renderWithSnackbar(<EditPlanPanel planId="1" />);

    await user.click(await screen.findByRole("button", { name: "Simular guardado" }));

    expect(push).toHaveBeenCalledWith("/staff/plans");
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";
import type { StaffPlanDto } from "@/lib/api/types";

vi.mock("./staff-plans-api", () => ({ createPlan: vi.fn(), updatePlan: vi.fn() }));

import { PlanForm } from "./plan-form";
import { createPlan, updatePlan } from "./staff-plans-api";

const createPlanMock = vi.mocked(createPlan);
const updatePlanMock = vi.mocked(updatePlan);

const pack: StaffPlanDto = {
  id: "1",
  service: "recovery",
  kind: "session_pack",
  slug: "paquete-4",
  name: "Paquete 4",
  description: "",
  features: [],
  price: 3200,
  periodMonths: null,
  periodDays: 30,
  sessionsIncluded: 4,
  durationMinutes: null,
  featured: false,
  autoDebitEnabled: false,
  sortOrder: 0,
  isActive: true,
};

const kindSelect = () => screen.getByLabelText("Tipo de plan");

async function fillPackBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(kindSelect(), "Paquete · Recovery");
  await user.type(screen.getByLabelText("Nombre"), "Paquete 8");
  await user.type(screen.getByLabelText("Precio (pesos)"), "5000");
  await user.type(screen.getByLabelText("Vigencia (días)"), "30");
  await user.type(screen.getByLabelText("Sesiones incluidas"), "8");
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Guardar plan" }));

describe("PlanForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the fields of the chosen kind", async () => {
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Duración (meses)")).toBeDefined();
    expect(screen.queryByLabelText("Vigencia (días)")).toBeNull();

    await userEvent.setup().selectOptions(kindSelect(), "Paquete · Recovery");

    expect(screen.getByLabelText("Vigencia (días)")).toBeDefined();
    expect(screen.getByLabelText("Sesiones incluidas")).toBeDefined();
    expect(screen.getByLabelText("Duración de la sesión (minutos)")).toBeDefined();
    expect(screen.queryByLabelText("Duración (meses)")).toBeNull();
  });

  it("switching the kind does not send the old kind's values", async () => {
    createPlanMock.mockResolvedValue(pack);
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Duración (meses)"), "3");
    await fillPackBasics(user);
    await save(user);

    expect(createPlanMock).toHaveBeenCalledTimes(1);
    expect(createPlanMock.mock.calls[0]?.[0]).not.toHaveProperty("periodMonths");
  });

  it("creates a plan with the service implied by the kind and suggests the slug from the name", async () => {
    createPlanMock.mockResolvedValue(pack);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm onSaved={onSaved} onCancel={vi.fn()} />);

    await fillPackBasics(user);
    await save(user);

    expect(createPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: "recovery",
        kind: "session_pack",
        slug: "paquete-8",
        price: 5000,
        periodDays: 30,
        sessionsIncluded: 8,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(pack);
    expect(screen.getByRole("status").textContent).toContain("Plan creado");
  });

  it("does not call the API when a field has the wrong format", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    await save(user);

    expect(createPlanMock).not.toHaveBeenCalled();
    expect(screen.getAllByText("Ingresá un número entero.").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("alert").some((el) => /Revisá \d+ campos?/.test(el.textContent ?? ""))).toBe(true);
  });

  it("shows the automatic debit checkbox only for period plans and packs", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = () => screen.queryByRole("switch", { name: "Permite débito automático" });

    expect(checkbox()).not.toBeNull();
    expect(screen.getByText("El cliente puede pagarlo con un cobro automático de Mercado Pago.")).toBeDefined();

    await user.selectOptions(kindSelect(), "Paquete · Recovery");
    expect(checkbox()).not.toBeNull();

    await user.selectOptions(kindSelect(), "Sesión suelta · Recovery");
    expect(checkbox()).toBeNull();

    await user.selectOptions(kindSelect(), "Evaluación · Rehab");
    expect(checkbox()).toBeNull();
  });

  it("sends autoDebitEnabled when staff ticks it and shows the API error under it", async () => {
    createPlanMock.mockRejectedValue(
      new ApiError({
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Los datos enviados no son válidos.",
        details: [{ field: "autoDebitEnabled", messages: ["Este tipo de plan no admite débito automático."] }],
      }),
    );
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={vi.fn()} />);
    await fillPackBasics(user);

    await user.click(screen.getByRole("switch", { name: "Permite débito automático" }));
    await save(user);

    expect(createPlanMock).toHaveBeenCalledWith(expect.objectContaining({ autoDebitEnabled: true }));
    const message = await screen.findByText("Este tipo de plan no admite débito automático.");
    expect(message.id).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Permite débito automático" }).getAttribute("aria-describedby")).toContain(
      message.id,
    );
  });

  it("does not send autoDebitEnabled for a kind that cannot be debited", async () => {
    createPlanMock.mockResolvedValue(pack);
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("switch", { name: "Permite débito automático" }));
    await user.selectOptions(kindSelect(), "Evaluación · Rehab");
    await user.type(screen.getByLabelText("Nombre"), "Evaluación");
    await user.type(screen.getByLabelText("Precio (pesos)"), "1800");
    await user.type(screen.getByLabelText("Duración de la sesión (minutos)"), "60");
    await save(user);

    expect(createPlanMock).toHaveBeenCalledTimes(1);
    expect(createPlanMock.mock.calls[0]?.[0]).not.toHaveProperty("autoDebitEnabled");
  });

  it("edits the flag sending only that change", async () => {
    updatePlanMock.mockResolvedValue({ ...pack, autoDebitEnabled: true });
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm plan={pack} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("switch", { name: "Permite débito automático" }));
    await save(user);

    expect(updatePlanMock).toHaveBeenCalledWith("1", { autoDebitEnabled: true });
  });

  it("shows the kind as a locked value when editing, not a select", () => {
    renderWithSnackbar(<PlanForm plan={pack} onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByLabelText("Tipo de plan")).toBeNull();
    expect(screen.getByText("Paquete · Recovery")).toBeDefined();
    expect(screen.getByText("No se puede cambiar una vez creado el plan.")).toBeDefined();
  });

  it("edits sending only what changed, and sends null when the optional duration is emptied", async () => {
    const withDuration = { ...pack, durationMinutes: 45 };
    updatePlanMock.mockResolvedValue(withDuration);
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm plan={withDuration} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText("Duración de la sesión (minutos)"));
    await save(user);

    expect(updatePlanMock).toHaveBeenCalledWith("1", { durationMinutes: null });
  });

  it("shows the API error under the field and keeps the typed values", async () => {
    createPlanMock.mockRejectedValue(
      new ApiError({
        statusCode: 400,
        code: "PLAN_KIND_INVALID",
        message: "El tipo de plan no es válido para esta operación.",
        details: [{ field: "sessionsIncluded", messages: ["Este tipo de plan necesita este dato."] }],
      }),
    );
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    await fillPackBasics(user);
    await save(user);

    expect(await screen.findByText("Este tipo de plan necesita este dato.")).toBeDefined();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Paquete 8");
    expect((screen.getByLabelText("Sesiones incluidas") as HTMLInputElement).value).toBe("8");
    expect(screen.getAllByRole("alert").some((el) => /Revisá \d+ campos?/.test(el.textContent ?? ""))).toBe(true);
  });

  it("shows SLUG_TAKEN under the slug", async () => {
    createPlanMock.mockRejectedValue(
      new ApiError({
        statusCode: 409,
        code: "SLUG_TAKEN",
        message: "Ya existe un plan con ese identificador.",
      }),
    );
    const user = userEvent.setup();
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    await fillPackBasics(user);
    await save(user);

    expect(await screen.findByText("Ya existe un plan con ese identificador.")).toBeDefined();
    expect(screen.getByLabelText("Identificador").getAttribute("aria-invalid")).toBe("true");
  });

  it("calls onCancel", async () => {
    const onCancel = vi.fn();
    renderWithSnackbar(<PlanForm onSaved={vi.fn()} onCancel={onCancel} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalled();
  });
});

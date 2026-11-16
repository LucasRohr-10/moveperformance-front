import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ScheduleTemplate } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { listProfessionals } from "./professionals-api";
import {
  createTemplate,
  listTemplates,
  previewTemplateImpact,
  removeTemplate,
  updateTemplate,
} from "./templates-api";
import { TemplatesPanel } from "./templates-panel";

vi.mock("./templates-api", () => ({
  listTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  previewTemplateImpact: vi.fn(),
  removeTemplate: vi.fn(),
}));
vi.mock("./professionals-api", () => ({ listProfessionals: vi.fn() }));

const listTemplatesMock = vi.mocked(listTemplates);
const createTemplateMock = vi.mocked(createTemplate);
const updateTemplateMock = vi.mocked(updateTemplate);
const previewMock = vi.mocked(previewTemplateImpact);
const removeTemplateMock = vi.mocked(removeTemplate);
const listProfessionalsMock = vi.mocked(listProfessionals);

const template: ScheduleTemplate = {
  id: "1",
  service: "performance",
  days: [
    { weekday: 1, startTime: "08:00", endTime: "20:00" },
    { weekday: 6, startTime: "09:00", endTime: "13:00" },
  ],
  durationMinutes: 45,
  gapMinutes: 5,
  capacity: 14,
  professionalId: null,
  professionalName: null,
  active: true,
};

const EDIT_BODY = {
  days: template.days,
  durationMinutes: 45,
  gapMinutes: 5,
  capacity: 14,
  professionalId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  listProfessionalsMock.mockResolvedValue([]);
  listTemplatesMock.mockResolvedValue([template]);
  updateTemplateMock.mockResolvedValue(template);
  removeTemplateMock.mockResolvedValue(undefined);
});

async function openEditForm() {
  const user = userEvent.setup();
  renderWithSnackbar(<TemplatesPanel />);
  await user.click(await screen.findByRole("button", { name: "Editar" }));
  return user;
}

describe("TemplatesPanel", () => {
  it("lists the days, hours, duration and gap of each template", async () => {
    renderWithSnackbar(<TemplatesPanel />);

    expect(await screen.findByText("Lunes")).toBeDefined();
    expect(screen.getByText("08:00 – 20:00")).toBeDefined();
    expect(screen.getByText("Sábado")).toBeDefined();
    expect(screen.getByText("09:00 – 13:00")).toBeDefined();
    expect(screen.getByText("45 min + 5 de margen")).toBeDefined();
    expect(screen.getByText("1 plantillas")).toBeDefined();
  });

  it("keeps the create form collapsed until \"+ Nueva plantilla\" is opened, and Cancelar closes it", async () => {
    listTemplatesMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithSnackbar(<TemplatesPanel />);
    const trigger = await screen.findByRole("button", { name: "+ Nueva plantilla" });
    expect(trigger).toHaveProperty("ariaExpanded", "false");
    expect(screen.queryByRole("button", { name: "Crear" })).toBeNull();

    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Crear" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("button", { name: "Crear" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Nueva plantilla" }));
  });

  it("shows every server validation message in the snackbar and keeps the form as filled", async () => {
    listTemplatesMock.mockResolvedValue([]);
    createTemplateMock.mockRejectedValue(
      new ApiError({
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Los datos enviados no son válidos.",
        details: [
          { field: "professionalId", messages: ["Rehab requiere exactamente un profesional."] },
          { field: "capacity", messages: ["El cupo tiene que ser al menos 1."] },
        ],
      }),
    );
    const user = userEvent.setup();

    renderWithSnackbar(<TemplatesPanel />);
    await user.click(await screen.findByRole("button", { name: "+ Nueva plantilla" }));
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.type(screen.getByLabelText("Cupo"), "8");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(await screen.findByText("Rehab requiere exactamente un profesional.")).toBeDefined();
    expect(screen.getByText("El cupo tiene que ser al menos 1.")).toBeDefined();
    expect(screen.getByText("No se pudo guardar la plantilla. Intentá de nuevo.")).toBeDefined();
    expect(screen.queryByText("Terminá a las")).toBeNull();
    expect((screen.getByLabelText("Cupo") as HTMLInputElement).value).toBe("8");
    expect(screen.getByRole("button", { name: "Lunes" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("flags the days that don't close exactly, lets the staff apply one time to all and sends it", async () => {
    listTemplatesMock.mockResolvedValue([]);
    createTemplateMock.mockRejectedValueOnce(
      new ApiError({
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Los datos enviados no son válidos.",
        details: [1, 2].map((weekday) => ({
          field: `days.${weekday}`,
          messages: ["El último turno del día termina a las 19:35 y deja 25 min libres."],
          suggestions: ["19:35", "20:10"],
        })),
      }),
    );
    createTemplateMock.mockResolvedValue(template);
    const user = userEvent.setup();

    renderWithSnackbar(<TemplatesPanel />);
    await user.click(await screen.findByRole("button", { name: "+ Nueva plantilla" }));
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.click(screen.getByRole("button", { name: "Martes" }));
    await user.type(screen.getByLabelText("Cupo"), "8");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect((await screen.findByRole("status")).textContent).toContain("Revisá 2 días");
    await user.click(await screen.findByRole("button", { name: "Usar 19:35 en los 2 días" }));
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(createTemplateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        days: [
          { weekday: 1, startTime: "08:00", endTime: "19:35" },
          { weekday: 2, startTime: "08:00", endTime: "19:35" },
        ],
      }),
    );
  });

  it("confirms a new template with a success snackbar", async () => {
    listTemplatesMock.mockResolvedValue([]);
    createTemplateMock.mockResolvedValue(template);
    const user = userEvent.setup();

    renderWithSnackbar(<TemplatesPanel />);
    await user.click(await screen.findByRole("button", { name: "+ Nueva plantilla" }));
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.type(screen.getByLabelText("Cupo"), "8");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect((await screen.findByRole("status")).textContent).toContain("Plantilla creada");
  });

  it("explains a missing quota in the snackbar and doesn't send the form", async () => {
    listTemplatesMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithSnackbar(<TemplatesPanel />);
    await user.click(await screen.findByRole("button", { name: "+ Nueva plantilla" }));
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(await screen.findByText("El cupo tiene que ser al menos 1.")).toBeDefined();
    expect(createTemplateMock).not.toHaveBeenCalled();
  });

  it("asks for a professional when the service is rehab and none is picked", async () => {
    listTemplatesMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithSnackbar(<TemplatesPanel />);
    await user.click(await screen.findByRole("button", { name: "+ Nueva plantilla" }));
    await user.selectOptions(screen.getByLabelText("Servicio"), "rehab");
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.type(screen.getByLabelText("Cupo"), "1");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(await screen.findByText("Rehab necesita un profesional asignado.")).toBeDefined();
    expect(createTemplateMock).not.toHaveBeenCalled();
  });

  it("saves an edit with the same body as the impact preview and no pop-up when no bookings are affected", async () => {
    previewMock.mockResolvedValue({ affectedBookings: 0, skippedEditedDays: [] });
    const user = await openEditForm();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(previewMock).toHaveBeenCalledWith("1", EDIT_BODY);
    expect(updateTemplateMock).toHaveBeenCalledWith("1", EDIT_BODY);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((await screen.findByRole("status")).textContent).toContain("Cambios guardados.");
  });

  it("asks before saving an edit that leaves bookings outside the template", async () => {
    previewMock.mockResolvedValue({ affectedBookings: 2, skippedEditedDays: [] });
    const user = await openEditForm();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Guardar los cambios?" });
    expect(
      within(dialog).getByText(
        "Hay 2 reservas en horarios que esta plantilla deja de generar. No se cancelan: siguen en pie.",
      ),
    ).toBeDefined();
    expect(updateTemplateMock).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Guardar igual" }));
    expect(updateTemplateMock).toHaveBeenCalledWith("1", EDIT_BODY);
  });

  it("does not save when the pop-up is cancelled", async () => {
    previewMock.mockResolvedValue({ affectedBookings: 2, skippedEditedDays: [] });
    const user = await openEditForm();

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(updateTemplateMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("previews the impact of deleting and warns about one booking in the singular", async () => {
    previewMock.mockResolvedValue({ affectedBookings: 1, skippedEditedDays: [] });
    const user = userEvent.setup();
    renderWithSnackbar(<TemplatesPanel />);

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(previewMock).toHaveBeenCalledWith("1", { active: false });
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(
        "Hay 1 reserva en horarios de esta plantilla. No se cancelan: siguen en pie. Deja de generar turnos nuevos.",
      ),
    ).toBeDefined();

    await user.click(within(dialog).getByRole("button", { name: "Eliminar plantilla" }));
    expect(removeTemplateMock).toHaveBeenCalledWith("1");
    expect((await screen.findByRole("status")).textContent).toContain("Plantilla eliminada");
  });

  it("does not save when the impact check fails", async () => {
    previewMock.mockRejectedValue(new Error("network"));
    const user = await openEditForm();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText("No se pudo verificar el impacto del cambio. Intentá de nuevo."),
    ).toBeDefined();
    expect(updateTemplateMock).not.toHaveBeenCalled();
  });

  it("template edit confirmation lists skipped edited days", async () => {
    previewMock.mockResolvedValue({ affectedBookings: 2, skippedEditedDays: ["2026-11-12", "2026-12-25"] });
    const user = await openEditForm();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Guardar los cambios?" });
    expect(
      within(dialog).getByText(
        "Hay 2 reservas en horarios que esta plantilla deja de generar. No se cancelan: siguen en pie. No se crean turnos en 2 días editados a mano: 12/11, 25/12.",
      ),
    ).toBeDefined();
  });

  it("uses the singular for one skipped day", async () => {
    previewMock.mockResolvedValue({ affectedBookings: 1, skippedEditedDays: ["2026-11-12"] });
    const user = await openEditForm();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Guardar los cambios?" });
    expect(within(dialog).getByText(/No se crean turnos en 1 día editado a mano: 12\/11\./)).toBeDefined();
  });

  it("says which edited days were skipped even when no bookings are affected", async () => {
    previewMock.mockResolvedValue({ affectedBookings: 0, skippedEditedDays: ["2026-11-12"] });
    const user = await openEditForm();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("No se crean turnos en 1 día editado a mano: 12/11.")).toBeDefined();
    expect(updateTemplateMock).toHaveBeenCalledWith("1", EDIT_BODY);
  });

  it("shows an info snackbar when a new template skips edited days", async () => {
    listTemplatesMock.mockResolvedValue([]);
    createTemplateMock.mockResolvedValue({ ...template, skippedEditedDays: ["2026-11-12", "2026-12-25"] });
    const user = userEvent.setup();

    renderWithSnackbar(<TemplatesPanel />);
    await user.click(await screen.findByRole("button", { name: "+ Nueva plantilla" }));
    await user.selectOptions(screen.getByLabelText("Servicio"), "performance");
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.type(screen.getByLabelText("Cupo"), "14");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(await screen.findByText("No se crean turnos en 2 días editados a mano: 12/11, 25/12.")).toBeDefined();
  });
});

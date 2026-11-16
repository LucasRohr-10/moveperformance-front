import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listTodayBirthdays } from "@/features/birthdays";
import type { AnnouncementDto, StaffAnnouncementsDto, TodayBirthdayDto, TodayBirthdaysDto } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { StaffAnnouncementsPanel } from "./staff-announcements-panel";
import { deleteAnnouncement, listStaffAnnouncements, publishAnnouncement } from "./staff-announcements-api";
import { ApiError } from "@/lib/api/errors";

vi.mock("./staff-announcements-api");
vi.mock("@/features/birthdays", () => ({
  listTodayBirthdays: vi.fn(),
  StaffBirthdaysPanel: ({ today, todayFailed }: { today: TodayBirthdaysDto | null; todayFailed: boolean }) => (
    <p>Panel de cumpleaños ({todayFailed ? "falló" : (today?.items.length ?? "sin datos")})</p>
  ),
}));

const listMock = vi.mocked(listStaffAnnouncements);
const publishMock = vi.mocked(publishAnnouncement);
const deleteMock = vi.mocked(deleteAnnouncement);
const todayMock = vi.mocked(listTodayBirthdays);

function birthday(clientId: string): TodayBirthdayDto {
  return { clientId, name: "Ana", lastName: null, phone: null, age: 30, mailSentAt: null, whatsappOpenedAt: null };
}

function announcement(id: string, overrides: Partial<AnnouncementDto> = {}): AnnouncementDto {
  return {
    id,
    body: `Mensaje ${id}`,
    visibleUntil: "2099-12-31",
    createdAt: "2026-10-27T12:00:00.000Z",
    createdByName: "Valentina",
    updatedAt: "2026-10-27T12:00:00.000Z",
    updatedByName: null,
    ...overrides,
  };
}

const LISTS: StaffAnnouncementsDto = {
  active: [
    announcement("act-1", { body: "Esta semana 20% off\nReservá hasta el viernes." }),
    announcement("act-2", {
      createdAt: "2026-10-25T12:00:00.000Z",
      updatedAt: "2026-10-26T12:00:00.000Z",
      updatedByName: "Lucía",
      createdByName: "Leo",
    }),
  ],
  expired: [
    announcement("exp-oct", { visibleUntil: "2026-10-19", createdAt: "2026-10-12T15:00:00.000Z" }),
    announcement("exp-sep-1", { visibleUntil: "2026-09-30", createdAt: "2026-09-01T15:00:00.000Z" }),
    announcement("exp-sep-2", { visibleUntil: "2026-09-15", createdAt: "2026-09-08T15:00:00.000Z" }),
  ],
};

function renderPanel() {
  return renderWithSnackbar(<StaffAnnouncementsPanel />);
}

// The ··· of the n-th active announcement, then one of its two choices.
async function chooseFromMenu(user: ReturnType<typeof userEvent.setup>, index: number, item: "Editar" | "Eliminar") {
  await user.click(screen.getAllByRole("button", { name: "Acciones del comunicado" })[index]);
  await user.click(screen.getByRole("menuitem", { name: item }));
}

describe("StaffAnnouncementsPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listMock.mockResolvedValue(LISTS);
    todayMock.mockResolvedValue({ date: "2026-11-04", items: [] });
  });

  it("starts on Generales and keeps today's announcements UI", async () => {
    renderPanel();

    expect(await screen.findByText("Mensaje act-2")).toBeDefined();
    expect(screen.getByRole("tab", { name: "Generales" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Cumpleaños" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.queryByText(/Panel de cumpleaños/)).toBeNull();
  });

  it("shows today's birthday count on the Cumpleaños tab", async () => {
    todayMock.mockResolvedValue({ date: "2026-11-04", items: [birthday("c1"), birthday("c2")] });

    renderPanel();

    expect(await screen.findByRole("tab", { name: "Cumpleaños 2" })).toBeDefined();
  });

  it("switches to the birthday tab", async () => {
    todayMock.mockResolvedValue({ date: "2026-11-04", items: [birthday("c1")] });
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole("tab", { name: "Cumpleaños 1" }));

    expect(screen.getByText("Panel de cumpleaños (1)")).toBeDefined();
    // Generales stays mounted but hidden, so a draft announcement survives the switch.
    expect(screen.getByText("Mensaje act-2").closest("[hidden]")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Cumpleaños 1" }).getAttribute("aria-selected")).toBe("true");
  });

  it("starts on the active ones and shows the counts in the chips", async () => {
    renderPanel();

    expect(await screen.findByText("Mensaje act-2")).toBeDefined();
    expect(screen.getByRole("button", { name: "Activos · 2" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Vencidos · 3" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText("Mensaje exp-oct")).toBeNull();
  });

  it("lists active and expired grouped by month, one list at a time", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Mensaje act-2");

    await user.click(screen.getByRole("button", { name: "Vencidos · 3" }));

    expect(screen.queryByText("Mensaje act-2")).toBeNull();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["OCTUBRE 2026", "SEPTIEMBRE 2026"]);
    expect(screen.getByText("Mensaje exp-oct")).toBeDefined();
    expect(screen.getAllByText("Vencido")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Activos · 2" }));

    expect(screen.getByText("Mensaje act-2")).toBeDefined();
    expect(screen.queryByText("Mensaje exp-oct")).toBeNull();
  });

  it("shows who published and who edited each announcement", async () => {
    renderPanel();

    expect(await screen.findByText("Publicado el 27/10 por Valentina")).toBeDefined();
    expect(screen.getByText("Publicado el 25/10 por Leo")).toBeDefined();
    expect(screen.getByText("Editado el 26/10 por Lucía")).toBeDefined();
    expect(screen.getAllByText(/Visible hasta el/)).toHaveLength(2);
  });

  it("keeps the line breaks of the message", async () => {
    renderPanel();

    expect((await screen.findByText(/Esta semana 20% off/)).className).toContain("whitespace-pre-line");
  });

  it("Editar loads the form", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Mensaje act-2");

    await chooseFromMenu(user, 1, "Editar");

    expect((screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value).toBe("Mensaje act-2");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByRole("button", { name: "Publicar" })).toBeDefined();
  });

  it("an expired announcement can be edited too", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Mensaje act-2");
    await user.click(screen.getByRole("button", { name: "Vencidos · 3" }));

    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);

    expect((screen.getByLabelText("Visible hasta") as HTMLInputElement).value).toBe("2026-10-19");
  });

  it("reloads the lists and shows the active ones after publishing", async () => {
    const user = userEvent.setup();
    publishMock.mockResolvedValue(announcement("new"));
    renderPanel();
    await screen.findByText("Mensaje act-2");
    await user.click(screen.getByRole("button", { name: "Vencidos · 3" }));
    listMock.mockResolvedValue({ active: [announcement("new"), ...LISTS.active], expired: LISTS.expired });

    await user.type(screen.getByLabelText("Mensaje"), "Nuevo");
    await user.type(screen.getByLabelText("Visible hasta"), "2099-12-31");
    await user.click(screen.getByRole("button", { name: "Publicar" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(screen.getByText("Mensaje new")).toBeDefined());
    expect(screen.getByRole("button", { name: "Activos · 3" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the empty state when nothing was ever published", async () => {
    listMock.mockResolvedValue({ active: [], expired: [] });
    renderPanel();

    expect(await screen.findByText("Todavía no publicaste comunicados")).toBeDefined();
    expect(screen.queryByRole("group", { name: "Ver comunicados" })).toBeNull();
  });

  it("says so when the chosen list is empty", async () => {
    listMock.mockResolvedValue({ active: [], expired: [announcement("exp", { visibleUntil: "2026-09-15" })] });
    renderPanel();

    expect(await screen.findByText("No hay comunicados activos.")).toBeDefined();
  });

  it("shows the loading state", () => {
    listMock.mockReturnValue(new Promise(() => {}));
    renderPanel();

    expect(screen.getByRole("status").textContent).toContain("Cargando comunicados");
  });

  it("shows the error state and Reintentar loads again", async () => {
    const user = userEvent.setup();
    listMock.mockRejectedValueOnce(new Error("boom"));
    renderPanel();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("No pudimos cargar los comunicados")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Mensaje act-2")).toBeDefined();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("only the active ones have the ··· menu; the expired ones keep a plain Editar", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Mensaje act-2");
    expect(screen.getAllByRole("button", { name: "Acciones del comunicado" })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Vencidos · 3" }));

    expect(screen.queryByRole("button", { name: "Acciones del comunicado" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(3);
  });

  it("Eliminar asks first and says what happens, with the message", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Mensaje act-2");

    await chooseFromMenu(user, 1, "Eliminar");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("¿Eliminar este comunicado?")).toBeDefined();
    expect(within(dialog).getByText("Mensaje act-2")).toBeDefined();
    expect(dialog.textContent).toContain(
      "Deja de verse ahora mismo en la campanita de notificaciones de todos los clientes.",
    );
    expect(dialog.textContent).toContain(
      "No se puede deshacer. Si lo necesitás de nuevo, hay que escribirlo y publicarlo otra vez.",
    );
    expect(dialog.textContent).not.toContain("contador");
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("Volver closes the dialog without deleting", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Mensaje act-2");
    await chooseFromMenu(user, 0, "Eliminar");

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Volver" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(screen.getByText("Mensaje act-2")).toBeDefined();
  });

  it("confirming deletes it, tells so and reloads the lists", async () => {
    const user = userEvent.setup();
    deleteMock.mockResolvedValue(undefined);
    renderPanel();
    await screen.findByText("Mensaje act-2");
    listMock.mockResolvedValue({ active: [LISTS.active[0]], expired: LISTS.expired });

    await chooseFromMenu(user, 1, "Eliminar");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(screen.queryByText("Mensaje act-2")).toBeNull());
    expect(deleteMock).toHaveBeenCalledWith("act-2");
    expect(screen.getByText("Comunicado eliminado.")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Activos · 1" })).toBeDefined();
  });

  it("deleting the announcement being edited closes the editor", async () => {
    const user = userEvent.setup();
    deleteMock.mockResolvedValue(undefined);
    renderPanel();
    await screen.findByText("Mensaje act-2");
    await chooseFromMenu(user, 1, "Editar");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDefined();
    listMock.mockResolvedValue({ active: [LISTS.active[0]], expired: LISTS.expired });

    await user.click(screen.getAllByRole("button", { name: "Acciones del comunicado" })[1]);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Publicar" })).toBeDefined());
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });

  it("a failed delete says so, closes the dialog and reloads", async () => {
    const user = userEvent.setup();
    deleteMock.mockRejectedValue(
      new ApiError({ statusCode: 404, code: "ANNOUNCEMENT_NOT_FOUND", message: "No encontramos el comunicado." }),
    );
    renderPanel();
    await screen.findByText("Mensaje act-2");

    await chooseFromMenu(user, 0, "Eliminar");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No encontramos el comunicado.")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("a delete that fails without an API answer shows a fixed message", async () => {
    const user = userEvent.setup();
    deleteMock.mockRejectedValue(new Error("offline"));
    renderPanel();
    await screen.findByText("Mensaje act-2");

    await chooseFromMenu(user, 0, "Eliminar");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No pudimos eliminar el comunicado. Probá de nuevo.")).toBeDefined();
  });

  it("tells the birthday tab when today's list failed, and retries it", async () => {
    todayMock.mockRejectedValueOnce(new Error("down")).mockResolvedValue({ date: "2026-11-04", items: [] });
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole("tab", { name: "Cumpleaños" }));

    expect(await screen.findByText("Panel de cumpleaños (falló)")).toBeDefined();
  });
});

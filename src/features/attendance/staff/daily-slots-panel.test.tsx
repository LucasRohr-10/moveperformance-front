import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { DailySlotsPanel } from "./daily-slots-panel";
import { listDailySlots } from "./attendance-api";
import { monthKeyOf, shiftMonthKey } from "./calendar-grid";
import { todayBusinessDate } from "@/features/bookings/slots";
import type { DailySlot } from "@/lib/api/types";

vi.mock("./attendance-api", () => ({ listDailySlots: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/staff/schedule"),
}));

const listDailySlotsMock = vi.mocked(listDailySlots);
const today = todayBusinessDate();

// Both designs are mounted (the breakpoint is CSS), so each test says which one it is looking at.
const desktop = () => within(screen.getByTestId("daily-slots-desktop"));
const mobile = () => within(screen.getByTestId("daily-slots-mobile"));

function slotFixture(overrides: Partial<DailySlot> = {}): DailySlot {
  return {
    id: "slot-x",
    service: "recovery",
    startsAt: "2026-10-01T12:00:00.000Z",
    endsAt: "2026-10-01T12:45:00.000Z",
    capacity: 4,
    booked: 0,
    professionalName: null,
    calendarBlockedAt: null,
    cancelledAt: null,
    cancelReason: null,
    staffEditedAt: null,
    isIndividual: false,
    templateProfessionalName: null,
    unmarkedAttendance: 0,
    ...overrides,
  };
}

// 19:00Z is 16:00 in Montevideo, the business timezone.
const PERFORMANCE_SLOT = slotFixture({
  id: "slot-1",
  service: "performance",
  startsAt: "2026-10-01T19:00:00.000Z",
  endsAt: "2026-10-01T20:00:00.000Z",
  capacity: 14,
  booked: 3,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DailySlotsPanel", () => {
  it("lists the day's slots with a link to view attendance", async () => {
    listDailySlotsMock.mockResolvedValue([PERFORMANCE_SLOT]);

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

    expect(await desktop().findByText("3/14")).toBeDefined();
    expect(desktop().getByRole("link", { name: "Ver asistencia de Performance 16:00" })).toHaveProperty(
      "href",
      expect.stringContaining("/staff/schedule/slot-1"),
    );
  });

  it("shows an empty slot as 'Sin reservas'", async () => {
    listDailySlotsMock.mockResolvedValue([slotFixture({ id: "slot-empty", service: "rehab", capacity: 1 })]);

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

    expect(await desktop().findByText("Sin reservas")).toBeDefined();
    expect(desktop().queryByText("0/1")).toBeNull();
  });

  it("shows a badge for a slot blocked by Google Calendar", async () => {
    listDailySlotsMock.mockResolvedValue([
      slotFixture({ id: "slot-2", service: "rehab", capacity: 1, professionalName: "Ana", calendarBlockedAt: "2026-10-01T12:00:00.000Z" }),
    ]);

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

    expect(await desktop().findByText("Bloqueado por Google Calendar")).toBeDefined();
  });

  it("moves to the next day and refetches", async () => {
    listDailySlotsMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);
    await desktop().findByText("No hay turnos para este día");
    const [firstCallDate] = listDailySlotsMock.mock.calls[0];

    await user.click(desktop().getByRole("button", { name: "Día siguiente" }));

    expect(listDailySlotsMock).toHaveBeenCalledTimes(2);
    const [secondCallDate] = listDailySlotsMock.mock.calls[1];
    expect(secondCallDate > firstCallDate).toBe(true);
  });

  it("jumps to a date picked from the calendar popover", async () => {
    listDailySlotsMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);
    await desktop().findByText("No hay turnos para este día");
    const [firstCallDate] = listDailySlotsMock.mock.calls[0];

    await user.click(desktop().getByRole("button", { name: /cambiar fecha/i }));
    await user.click(desktop().getByRole("button", { name: "Mes siguiente" }));

    const targetDate = `${shiftMonthKey(monthKeyOf(firstCallDate), 1)}-01`;
    const [year, month, day] = targetDate.split("-").map(Number);
    const targetLabel = new Date(year, month - 1, day).toLocaleDateString("es-UY", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    await user.click(desktop().getByRole("button", { name: targetLabel }));

    expect(listDailySlotsMock).toHaveBeenCalledTimes(2);
    const [secondCallDate] = listDailySlotsMock.mock.calls[1];
    expect(secondCallDate).toBe(targetDate);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("surfaces an error instead of silently failing", async () => {
    listDailySlotsMock.mockRejectedValue(new Error("No se pudo cargar"));

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

    expect(await desktop().findByRole("alert")).toBeDefined();
    expect(await mobile().findByRole("alert")).toBeDefined();
  });

  it("daily list shows a staff-cancelled slot with its reason and no attendance link", async () => {
    listDailySlotsMock.mockResolvedValue([
      slotFixture({
        id: "slot-c",
        cancelledAt: "2026-10-01T10:00:00.000Z",
        cancelReason: "Mantenimiento de la sala",
        staffEditedAt: "2026-10-01T10:00:00.000Z",
      }),
    ]);

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

    expect(await desktop().findByText("Cancelado · Mantenimiento de la sala")).toBeDefined();
    expect(desktop().queryByRole("link", { name: /Ver asistencia/ })).toBeNull();
    expect(mobile().queryByRole("link", { name: /Ver asistencia/ })).toBeNull();
  });

  it("keeps the attendance link on the slots that were not cancelled", async () => {
    listDailySlotsMock.mockResolvedValue([
      slotFixture({ id: "slot-c", cancelledAt: "2026-10-01T10:00:00.000Z", cancelReason: "Feriado" }),
      slotFixture({ id: "slot-ok" }),
    ]);

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

    const links = await desktop().findAllByRole("link", { name: /Ver asistencia/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveProperty("href", expect.stringContaining("/staff/schedule/slot-ok"));
  });

  it("marks individual slots and the ones another professional covers", async () => {
    listDailySlotsMock.mockResolvedValue([
      slotFixture({ id: "slot-i", isIndividual: true }),
      slotFixture({
        id: "slot-r",
        service: "rehab",
        professionalName: "Ana Pérez",
        templateProfessionalName: "Juan Gómez",
        staffEditedAt: "2026-10-01T10:00:00.000Z",
      }),
      slotFixture({ id: "slot-same", professionalName: "Ana Pérez", templateProfessionalName: "Ana Pérez", staffEditedAt: "2026-10-01T10:00:00.000Z" }),
    ]);

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

    expect(await desktop().findByText("Individual")).toBeDefined();
    expect(desktop().getAllByText(/^Cubre a /)).toHaveLength(1);
    expect(desktop().getByText("Cubre a Juan Gómez")).toBeDefined();
  });

  it("does not say someone covers when the slot was never edited by hand", async () => {
    listDailySlotsMock.mockResolvedValue([
      slotFixture({ professionalName: "Ana Pérez", templateProfessionalName: "Juan Gómez", staffEditedAt: null }),
    ]);

    renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

    await desktop().findByText("Ana Pérez");
    expect(desktop().queryByText(/^Cubre a /)).toBeNull();
  });

  it("\"Editar día\" links to the editor for the selected date", async () => {
    listDailySlotsMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithSnackbar(<DailySlotsPanel initialDate="2026-10-21" />);
    await desktop().findByText("No hay turnos para este día");

    expect(desktop().getByRole("link", { name: "Editar día" })).toHaveProperty(
      "href",
      expect.stringContaining("/staff/schedule/edit?date=2026-10-21"),
    );
    expect(mobile().getByRole("link", { name: "Editar día" })).toHaveProperty(
      "href",
      expect.stringContaining("/staff/schedule/edit?date=2026-10-21"),
    );

    await user.click(desktop().getByRole("button", { name: "Día siguiente" }));
    expect(desktop().getByRole("link", { name: "Editar día" })).toHaveProperty(
      "href",
      expect.stringContaining("/staff/schedule/edit?date=2026-10-22"),
    );
  });

  describe("service filter", () => {
    const rehabSlot = slotFixture({ id: "slot-rehab", service: "rehab", capacity: 1 });

    it("shows only the chosen service, and says so when it has no slots that day", async () => {
      listDailySlotsMock.mockResolvedValue([PERFORMANCE_SLOT, rehabSlot]);
      const user = userEvent.setup();

      renderWithSnackbar(<DailySlotsPanel initialDate={today} />);
      await desktop().findByRole("link", { name: "Ver asistencia de Performance 16:00" });

      await user.click(desktop().getByRole("button", { name: "Rehab" }));

      expect(desktop().getByRole("button", { name: "Rehab" })).toHaveProperty("ariaPressed", "true");
      expect(desktop().getByRole("link", { name: "Ver asistencia de Rehab 09:00" })).toBeDefined();
      expect(desktop().queryByRole("link", { name: /Performance/ })).toBeNull();

      await user.click(desktop().getByRole("button", { name: "Recovery" }));
      expect(desktop().getByText("No hay turnos de Recovery para este día")).toBeDefined();
    });

    it("is shared with the mobile design", async () => {
      listDailySlotsMock.mockResolvedValue([PERFORMANCE_SLOT, rehabSlot]);
      const user = userEvent.setup();

      renderWithSnackbar(<DailySlotsPanel initialDate={today} />);
      await mobile().findByRole("link", { name: "Ver asistencia de Performance 16:00" });

      await user.click(mobile().getByRole("button", { name: "Rehab" }));

      expect(mobile().queryByRole("link", { name: /Performance/ })).toBeNull();
      expect(desktop().queryByRole("link", { name: /Performance/ })).toBeNull();
    });
  });

  describe("desktop view", () => {
    it("switches between the grid and the list", async () => {
      listDailySlotsMock.mockResolvedValue([PERFORMANCE_SLOT]);
      const user = userEvent.setup();

      renderWithSnackbar(<DailySlotsPanel initialDate={today} />);
      await desktop().findByText("3/14");

      expect(desktop().getByRole("button", { name: "Grilla" })).toHaveProperty("ariaPressed", "true");
      expect(desktop().queryByText("Turnos")).toBeNull();

      await user.click(desktop().getByRole("button", { name: "Lista" }));

      expect(desktop().getByRole("button", { name: "Lista" })).toHaveProperty("ariaPressed", "true");
      expect(desktop().getByText("Turnos")).toBeDefined();
      expect(desktop().getByRole("link", { name: "Ver asistencia de Performance 16:00" })).toHaveProperty(
        "href",
        expect.stringContaining("/staff/schedule/slot-1"),
      );
    });
  });

  describe("mobile view", () => {
    it("shows each slot as a card linking to its attendance", async () => {
      listDailySlotsMock.mockResolvedValue([PERFORMANCE_SLOT, slotFixture({ id: "slot-rehab", service: "rehab", capacity: 1 })]);

      renderWithSnackbar(<DailySlotsPanel initialDate={today} />);

      expect(await mobile().findByText("3/14")).toBeDefined();
      expect(mobile().getByText("Sin reservas")).toBeDefined();
      expect(mobile().getByRole("link", { name: "Ver asistencia de Performance 16:00" })).toHaveProperty(
        "href",
        expect.stringContaining("/staff/schedule/slot-1"),
      );
    });

    it("tags the date as today", async () => {
      listDailySlotsMock.mockResolvedValue([]);

      renderWithSnackbar(<DailySlotsPanel initialDate={today} />);
      await mobile().findByText("No hay turnos para este día");

      expect(mobile().getByText("Hoy")).toBeDefined();
    });
  });
});

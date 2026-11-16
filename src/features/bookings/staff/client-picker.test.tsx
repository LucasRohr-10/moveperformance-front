import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listClients } from "@/features/clients/staff/clients-api";
import type { ClientPage, ClientRow } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ClientPicker } from "./client-picker";

vi.mock("@/features/clients/staff/clients-api", () => ({ listClients: vi.fn() }));

const listClientsMock = vi.mocked(listClients);

function rowOf(overrides: Partial<ClientRow> = {}): ClientRow {
  return {
    id: "c1",
    name: "Sofía",
    lastName: "Pérez",
    email: "sofia@ejemplo.uy",
    phone: null,
    nextBookingAt: null,
    lastAttendanceStatus: null,
    deactivatedAt: null,
    ...overrides,
  };
}

function pageOf(items: ClientRow[]): ClientPage {
  return { items, total: items.length, page: 1, pageSize: 8 };
}

// Fake timers drive the debounce, so every assertion reads the DOM right after an advance().
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function type(value: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Cliente" }), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("ClientPicker", () => {
  it("searches active clients as staff types", async () => {
    listClientsMock.mockResolvedValue(pageOf([]));
    renderWithSnackbar(<ClientPicker onPick={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Cliente" });
    expect(input.getAttribute("placeholder")).toBe("Nombre o email");
    expect(listClientsMock).not.toHaveBeenCalled();

    type("sof");
    await advance(200);
    expect(listClientsMock).not.toHaveBeenCalled();
    await advance(250);

    expect(listClientsMock).toHaveBeenCalledTimes(1);
    expect(listClientsMock).toHaveBeenCalledWith({ q: "sof", pageSize: 8 });
  });

  it("lists name and email with Elegir", async () => {
    const onPick = vi.fn();
    const ana = rowOf({ id: "c2", name: "Sofía", lastName: "Rodríguez", email: "sofi.r@ejemplo.uy" });
    listClientsMock.mockResolvedValue(pageOf([rowOf(), ana]));
    renderWithSnackbar(<ClientPicker onPick={onPick} />);

    type("sof");
    await advance(450);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Sofía Pérez")).toBeDefined();
    expect(within(rows[0]).getByText("sofia@ejemplo.uy")).toBeDefined();
    fireEvent.click(within(rows[1]).getByRole("button", { name: /Elegir/ }));

    expect(onPick).toHaveBeenCalledWith(ana);
  });

  it("shows the empty and the error copy", async () => {
    listClientsMock.mockResolvedValueOnce(pageOf([]));
    renderWithSnackbar(<ClientPicker onPick={vi.fn()} />);

    type("zzz");
    await advance(450);
    expect(screen.getByText("No encontramos clientes activos con esa búsqueda.")).toBeDefined();

    listClientsMock.mockRejectedValueOnce(new Error("boom"));
    type("sof");
    await advance(450);
    expect(screen.getByText("No pudimos buscar clientes. Probá de nuevo.")).toBeDefined();
    expect(screen.queryByText("No encontramos clientes activos con esa búsqueda.")).toBeNull();
  });

  it("shows nothing until staff types", () => {
    renderWithSnackbar(<ClientPicker onPick={vi.fn()} />);

    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText("No encontramos clientes activos con esa búsqueda.")).toBeNull();
  });
});

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InboxItemDto } from "@/lib/api/types";

import { InboxList, type InboxListProps } from "./inbox-list";

const NOW = new Date("2026-10-27T15:00:00Z");

function item(overrides: Partial<InboxItemDto> = {}): InboxItemDto {
  return {
    id: "notice:1",
    source: "notice",
    type: "booking_cancelled_by_staff",
    title: "MOVE canceló tu turno",
    body: "Recovery · Miércoles 12 de noviembre · 09:00 a 09:45.",
    createdAt: "2026-10-27T13:42:00Z",
    readAt: null,
    action: { label: "Reservar otro turno", href: "/bookings?service=recovery" },
    ...overrides,
  };
}

const ANNOUNCEMENT = item({
  id: "announcement:1",
  source: "announcement",
  type: "announcement",
  title: "Comunicado de MOVE",
  body: "Esta semana 20% off\nReservá hasta el viernes.",
  action: null,
});

function renderList(overrides: Partial<InboxListProps> = {}) {
  const props: InboxListProps = {
    state: { items: [item(), ANNOUNCEMENT] },
    onRetry: vi.fn(),
    onMarkRead: vi.fn(),
    onOpenAction: vi.fn(),
    now: NOW,
    ...overrides,
  };
  render(<InboxList {...props} />);
  return props;
}

describe("InboxList", () => {
  it("shows title, body and date for each item", () => {
    renderList();

    const [first] = screen.getAllByRole("listitem");
    expect(within(first).getByText("MOVE canceló tu turno")).toBeDefined();
    expect(within(first).getByText("Recovery · Miércoles 12 de noviembre · 09:00 a 09:45.")).toBeDefined();
    expect(within(first).getByText("Hoy · 10:42")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps the line breaks of the body", () => {
    renderList();

    expect(screen.getByText(/Esta semana 20% off/).className).toContain("whitespace-pre-line");
  });

  it("divides the notices with a line", () => {
    renderList();

    expect(screen.getByRole("list").className).toContain("divide-y");
    expect(screen.getByRole("list").className).toContain("divide-line");
  });

  it("shows Marcar como leído only for unread items and calls onMarkRead with the id", () => {
    const props = renderList({
      state: { items: [item(), item({ id: "notice:2", readAt: "2026-10-27T14:00:00Z" })] },
    });

    const buttons = screen.getAllByRole("button", { name: "Marcar como leído" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(props.onMarkRead).toHaveBeenCalledWith("notice:1");
  });

  it("action button calls onOpenAction", () => {
    const props = renderList();

    fireEvent.click(screen.getByRole("button", { name: "Reservar otro turno" }));

    expect(props.onOpenAction).toHaveBeenCalledWith(item());
  });

  it("announcement without action shows no action button", () => {
    renderList({ state: { items: [ANNOUNCEMENT] } });

    expect(screen.queryByRole("button", { name: "Reservar otro turno" })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("action and Marcar como leído share one row", () => {
    renderList({ state: { items: [item()] } });

    const row = screen.getByRole("button", { name: "Reservar otro turno" }).parentElement;
    expect(row?.className).toContain("flex-nowrap");
    expect(within(row as HTMLElement).getByRole("button", { name: "Marcar como leído" })).toBeDefined();
  });

  it("writes the Motivo label in bold white next to its reason, on its own line", () => {
    renderList({
      state: { items: [item({ body: "Performance · Miércoles 28 de octubre · 17:45\nMotivo: Hola al final no podemos!." })] },
    });

    const label = screen.getByText("Motivo");
    expect(label.tagName).toBe("STRONG");
    expect(label.className).toContain("font-semibold");
    expect(label.className).toContain("text-white");
    const paragraph = label.parentElement as HTMLElement;
    expect(paragraph.className).toContain("whitespace-pre-line");
    expect(paragraph.textContent).toBe("Performance · Miércoles 28 de octubre · 17:45\nMotivo Hola al final no podemos!.");
  });

  it("draws the action button in white", () => {
    renderList({ state: { items: [item()] } });

    const button = screen.getByRole("button", { name: "Reservar otro turno" });
    expect(button.className).toContain("bg-white");
    expect(button.className).toContain("text-black");
  });

  it("dims an item that is already read", () => {
    renderList({ state: { items: [item({ readAt: "2026-10-27T14:00:00Z" })] } });

    expect(screen.getByText("MOVE canceló tu turno").className).toContain("text-muted");
  });

  it("draws the icon of the type", () => {
    renderList();

    expect(screen.getByText("!").className).toContain("text-warning");
    expect(screen.getByText("i").className).toContain("text-info");
  });

  it("shows the loading state", () => {
    renderList({ state: "loading" });

    expect(screen.getByRole("status").textContent).toContain("Cargando avisos");
  });

  it("shows the empty state", () => {
    renderList({ state: { items: [] } });

    expect(screen.getByText("No tenés avisos")).toBeDefined();
    expect(
      screen.getByText(
        "Acá te avisamos si cambia algo de tus turnos, pagos o débitos, y te llegan los comunicados de MOVE.",
      ),
    ).toBeDefined();
  });

  it("shows the error state and Reintentar calls onRetry", () => {
    const props = renderList({ state: "error" });

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar tus avisos");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });
});

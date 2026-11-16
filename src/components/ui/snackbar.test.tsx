import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type SnackbarInput, SnackbarProvider, useErrorSnackbar, useSnackbar } from "./snackbar";

function Trigger({ input }: { input: SnackbarInput }) {
  const { showSnackbar } = useSnackbar();
  return (
    <button type="button" onClick={() => showSnackbar(input)}>
      show
    </button>
  );
}

function show(input: SnackbarInput) {
  render(
    <SnackbarProvider>
      <Trigger input={input} />
    </SnackbarProvider>,
  );
  act(() => screen.getByRole("button", { name: "show" }).click());
}

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

const OK: SnackbarInput = { tone: "success", title: "Cambios guardados." };

describe("Snackbar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists two equal lines without repeating a React key", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    show({ tone: "danger", title: "Algo", items: ["Igual", "Igual"], groups: [{ items: ["Mismo", "Mismo"] }] });

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(errors.mock.calls.flat().join(" ")).not.toContain("same key");
    errors.mockRestore();
  });

  it("shows the title, the message and one line per item", () => {
    show({ tone: "danger", title: "No pudimos guardar", message: "Probá de nuevo.", items: ["Uno", "Dos"] });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("No pudimos guardar");
    expect(alert.textContent).toContain("Probá de nuevo.");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Uno", "Dos"]);
  });

  it("shows each group's items and then its note, in order", () => {
    show({
      tone: "danger",
      title: "4 turnos no se pudieron reservar",
      groups: [
        { items: ["Recovery · Mié 28 · 16:00"], note: "Necesitás un paquete." },
        { items: ["Performance · Jue 29 · 09:00"], note: "No quedan cupos." },
      ],
    });

    const text = screen.getByRole("alert").textContent ?? "";
    const order = ["Recovery · Mié 28 · 16:00", "Necesitás un paquete.", "Performance · Jue 29 · 09:00", "No quedan cupos."].map((part) =>
      text.indexOf(part),
    );
    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("shows every action at the end, after the content", () => {
    show({
      tone: "danger",
      title: "4 turnos no se pudieron reservar",
      groups: [{ items: ["Uno"], note: "Motivo." }],
      actions: [
        { label: "Pagar esta sesión", href: "/checkout" },
        { label: "Ver planes", href: "/plans" },
      ],
    });

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Pagar esta sesión", "Ver planes"]);
    const note = screen.getByText("Motivo.");
    expect(note.compareDocumentPosition(links[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps many groups inside the snackbar", () => {
    show({
      tone: "danger",
      title: "12 turnos",
      groups: Array.from({ length: 6 }, (_, index) => ({ items: [`Turno ${index}`], note: `Motivo ${index}` })),
    });

    expect(screen.getByTestId("snackbar-groups").className).toContain("overflow-y-auto");
  });

  it("keeps a long list inside the snackbar", () => {
    show({ tone: "danger", title: "12 turnos", items: Array.from({ length: 12 }, (_, index) => `Turno ${index}`) });

    expect(screen.getByRole("list").className).toContain("overflow-y-auto");
  });

  it("announces success politely", () => {
    show(OK);

    expect(screen.getByRole("status").textContent).toContain("Cambios guardados.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("closes by itself after 4 seconds", () => {
    show(OK);

    advance(3_900);
    expect(screen.queryByText("Cambios guardados.")).not.toBeNull();

    advance(300);
    advance(200); // exit fade
    expect(screen.queryByText("Cambios guardados.")).toBeNull();
  });

  it("stays while the mouse is over it and counts 4 seconds again after it leaves", () => {
    show(OK);
    const snackbar = screen.getByRole("status");

    fireEvent.mouseEnter(snackbar);
    advance(10_000);
    expect(screen.queryByText("Cambios guardados.")).not.toBeNull();

    fireEvent.mouseLeave(snackbar);
    advance(3_900);
    expect(screen.queryByText("Cambios guardados.")).not.toBeNull();
    advance(300);
    advance(200); // exit fade
    expect(screen.queryByText("Cambios guardados.")).toBeNull();
  });

  it("stays while the focus is inside it", () => {
    show(OK);

    act(() => screen.getByRole("button", { name: "Cerrar aviso" }).focus());
    advance(10_000);

    expect(screen.queryByText("Cambios guardados.")).not.toBeNull();
  });

  it("stays pinned after a click until the cross", () => {
    show(OK);

    fireEvent.click(screen.getByText("Cambios guardados."));
    fireEvent.mouseLeave(screen.getByRole("status"));
    advance(20_000);

    expect(screen.queryByText("Cambios guardados.")).not.toBeNull();
    expect(screen.queryByTestId("snackbar-progress")).toBeNull();

    act(() => screen.getByRole("button", { name: "Cerrar aviso" }).click());
    advance(200);
    expect(screen.queryByText("Cambios guardados.")).toBeNull();
  });

  it("shows a progress line while it counts down", () => {
    show(OK);

    expect(screen.getByTestId("snackbar-progress")).toBeDefined();
  });

  it("renders a link action, closes by itself and closes when the link is used", () => {
    show({ tone: "danger", title: "Necesitás un plan activo", action: { label: "Ver planes", href: "/plans" } });

    const link = screen.getByRole("link", { name: "Ver planes" });
    expect(link.getAttribute("href")).toBe("/plans");
    expect(screen.getByTestId("snackbar-progress")).toBeDefined();

    fireEvent.click(link);
    advance(200);
    expect(screen.queryByText("Necesitás un plan activo")).toBeNull();
  });

  it("renders a button action that runs once and closes the snackbar", () => {
    const onClick = vi.fn();
    show({ tone: "danger", title: "No cargó", action: { label: "Reintentar", onClick } });

    act(() => screen.getByRole("button", { name: "Reintentar" }).click());
    advance(200);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("No cargó")).toBeNull();
  });

  it("never closes by itself when it has a list", () => {
    show({ tone: "danger", title: "1 turno no se pudo reservar", items: ["Lun 26 · 09:05"] });

    advance(20_000);

    expect(screen.queryByText("1 turno no se pudo reservar")).not.toBeNull();
  });

  it("shows at most 3, newest first", () => {
    function Many() {
      const { showSnackbar } = useSnackbar();
      return (
        <button
          type="button"
          onClick={() => ["Uno", "Dos", "Tres", "Cuatro"].forEach((title) => showSnackbar({ tone: "success", title }))}
        >
          many
        </button>
      );
    }
    render(
      <SnackbarProvider>
        <Many />
      </SnackbarProvider>,
    );

    act(() => screen.getByRole("button", { name: "many" }).click());

    expect(screen.getAllByRole("status").map((s) => s.querySelector("[data-snackbar-title]")?.textContent)).toEqual([
      "Cuatro",
      "Tres",
      "Dos",
    ]);
  });

  it("stays visible after the component that showed it unmounts", () => {
    function Page() {
      const [open, setOpen] = useState(true);
      const { showSnackbar } = useSnackbar();
      return open ? (
        <button
          type="button"
          onClick={() => {
            showSnackbar(OK);
            setOpen(false);
          }}
        >
          save
        </button>
      ) : null;
    }
    render(
      <SnackbarProvider>
        <Page />
      </SnackbarProvider>,
    );

    act(() => screen.getByRole("button", { name: "save" }).click());

    expect(screen.queryByRole("button", { name: "save" })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Cambios guardados.");
  });

  it("fails loudly outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Trigger input={OK} />)).toThrow("useSnackbar must be used inside SnackbarProvider");
  });

  it("shows an error snackbar each time an error message appears", () => {
    function Failing({ message }: { message: string | null }) {
      useErrorSnackbar(message);
      return null;
    }
    const { rerender } = render(
      <SnackbarProvider>
        <Failing message={null} />
      </SnackbarProvider>,
    );
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(
      <SnackbarProvider>
        <Failing message="No pudimos iniciar el pago." />
      </SnackbarProvider>,
    );
    expect(screen.getByRole("alert").textContent).toContain("No pudimos iniciar el pago.");

    act(() => screen.getByRole("button", { name: "Cerrar aviso" }).click());
    advance(200);
    rerender(
      <SnackbarProvider>
        <Failing message={null} />
      </SnackbarProvider>,
    );
    rerender(
      <SnackbarProvider>
        <Failing message="No pudimos iniciar el pago." />
      </SnackbarProvider>,
    );
    expect(screen.getByRole("alert").textContent).toContain("No pudimos iniciar el pago.");
  });
});

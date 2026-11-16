import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseDashboardParams } from "../dashboard-params";
import { PeriodControls } from "./period-controls";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

// Outside the app router `next/form` falls back to a native submit, which jsdom does not do: here the form
// hands what it would put in the URL to the test.
const submitted = vi.hoisted(() => ({ query: "", action: "" }));
vi.mock("next/form", () => ({
  default: ({
    action,
    children,
    replace,
    scroll,
    ...rest
  }: {
    action: string;
    children: React.ReactNode;
    replace?: boolean;
    scroll?: boolean;
  }) => (
    <form
      data-replace={String(replace)}
      data-scroll={String(scroll)}
      {...rest}
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        submitted.action = action;
        submitted.query = new URLSearchParams(new FormData(event.currentTarget) as unknown as Record<string, string>).toString();
      }}
    >
      {children}
    </form>
  ),
}));

const TODAY = "2026-11-03";
const render_ = (raw: Record<string, string> = { vista: "negocio" }) =>
  render(<PeriodControls params={parseDashboardParams(raw)} today={TODAY} />);

beforeEach(() => {
  replace.mockClear();
  submitted.query = "";
});

describe("PeriodControls", () => {
  it("offers the periods and the comparisons of the mockup", () => {
    render_();

    const period = screen.getByRole("combobox", { name: "Período" });
    const compare = screen.getByRole("combobox", { name: "Comparar con" });

    expect([...(period as HTMLSelectElement).options].map((o) => o.text)).toEqual([
      "Esta semana",
      "Este mes",
      "Mes pasado",
      "Este año (hasta hoy)",
      "Últimos 12 meses",
      "Elegir fechas",
    ]);
    expect([...(compare as HTMLSelectElement).options].map((o) => o.text)).toEqual([
      "Período anterior",
      "Mismo período del año pasado",
      "No comparar",
    ]);
    expect((period as HTMLSelectElement).value).toBe("mes-pasado");
    expect((compare as HTMLSelectElement).value).toBe("anterior");
  });

  it("changing the period select replaces the URL", async () => {
    render_({ vista: "negocio", tab: "turnos", servicio: "rehab", agrupar: "dia" });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), "este-anio");

    // The chosen grouping may not exist for the new period: the API picks one.
    expect(replace).toHaveBeenCalledWith("/staff?vista=negocio&tab=turnos&periodo=este-anio&servicio=rehab", { scroll: false });
  });

  it("changing the comparison replaces the URL and keeps the period", async () => {
    render_({ vista: "negocio", periodo: "este-mes" });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Comparar con" }), "anio-pasado");

    expect(replace).toHaveBeenCalledWith("/staff?vista=negocio&periodo=este-mes&comparar=anio-pasado", { scroll: false });
  });

  it("choosing Elegir fechas opens the range without leaving the page", async () => {
    render_();
    expect(screen.queryByLabelText("Desde")).toBeNull();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), "fechas");

    expect(replace).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Desde") as HTMLInputElement).max).toBe(TODAY);
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).max).toBe(TODAY);
  });

  it("Desde cannot go back further than the API allows: 1096 days counting today, so 1095 days before it", async () => {
    render_();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), "fechas");

    expect((screen.getByLabelText("Desde") as HTMLInputElement).min).toBe("2023-11-04");
    // Until a start is picked, Hasta cannot start earlier than Desde can.
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).min).toBe("2023-11-04");
  });

  it("Hasta cannot be before the Desde that was picked", async () => {
    render_();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), "fechas");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-05" } });

    expect((screen.getByLabelText("Hasta") as HTMLInputElement).min).toBe("2026-10-05");
  });

  it("Elegir fechas submits periodo=fechas with desde and hasta", async () => {
    render_({ vista: "negocio", servicio: "recovery", comparar: "no" });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), "fechas");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-05" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-19" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(submitted.action).toBe("/staff");
    const query = new URLSearchParams(submitted.query);
    expect(query.get("vista")).toBe("negocio");
    expect(query.get("periodo")).toBe("fechas");
    expect(query.get("desde")).toBe("2026-10-05");
    expect(query.get("hasta")).toBe("2026-10-19");
    // The rest of what the person chose travels with it, and defaults stay out of the URL.
    expect(query.get("servicio")).toBe("recovery");
    expect(query.get("comparar")).toBe("no");
    expect(query.has("tab")).toBe(false);
  });

  it("shows the range already in the URL", () => {
    render_({ vista: "negocio", periodo: "fechas", desde: "2026-10-05", hasta: "2026-10-19" });

    expect((screen.getByRole("combobox", { name: "Período" }) as HTMLSelectElement).value).toBe("fechas");
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2026-10-05");
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).value).toBe("2026-10-19");
  });

  it("picking a preset again closes the range", async () => {
    render_({ vista: "negocio", periodo: "fechas", desde: "2026-10-05", hasta: "2026-10-19" });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), "este-mes");

    expect(replace).toHaveBeenCalledWith("/staff?vista=negocio&periodo=este-mes", { scroll: false });
  });

  it("applying a range does not jump to the top of the page, like the menus", async () => {
    render_();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), "fechas");

    const form = screen.getByLabelText("Desde").closest("form")!;
    expect(form.dataset.scroll).toBe("false");
    expect(form.dataset.replace).toBe("true");
  });
});

// The component is not remounted when the person goes "atrás" or taps a link: what it shows follows the URL.
describe("PeriodControls when the URL moves under it", () => {
  const range = (from: string, to: string) =>
    parseDashboardParams({ vista: "negocio", periodo: "fechas", desde: from, hasta: to });

  it("closes the range when the URL goes to a preset", () => {
    const { rerender } = render(<PeriodControls params={range("2026-10-05", "2026-10-19")} today={TODAY} />);
    expect(screen.getByLabelText("Desde")).toBeDefined();

    rerender(<PeriodControls params={parseDashboardParams({ vista: "negocio", periodo: "este-mes" })} today={TODAY} />);

    expect(screen.queryByLabelText("Desde")).toBeNull();
    expect((screen.getByRole("combobox", { name: "Período" }) as HTMLSelectElement).value).toBe("este-mes");
  });

  it("opens the range when the URL comes back to one", () => {
    const { rerender } = render(
      <PeriodControls params={parseDashboardParams({ vista: "negocio", periodo: "este-mes" })} today={TODAY} />,
    );

    rerender(<PeriodControls params={range("2026-10-05", "2026-10-19")} today={TODAY} />);

    expect((screen.getByRole("combobox", { name: "Período" }) as HTMLSelectElement).value).toBe("fechas");
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2026-10-05");
  });

  it("shows the dates of the range in the URL, not the ones it had before", () => {
    const { rerender } = render(<PeriodControls params={range("2026-10-05", "2026-10-19")} today={TODAY} />);

    rerender(<PeriodControls params={range("2026-09-01", "2026-09-30")} today={TODAY} />);

    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2026-09-01");
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).value).toBe("2026-09-30");
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).min).toBe("2026-09-01");
  });
});

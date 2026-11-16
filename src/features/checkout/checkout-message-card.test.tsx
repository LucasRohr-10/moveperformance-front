import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheckoutMessageCard } from "./checkout-message-card";

describe("CheckoutMessageCard", () => {
  it("shows the title and the body, and is not an alert by default", () => {
    render(<CheckoutMessageCard title="No encontramos la operación" body="Revisá el link." action={null} />);

    expect(screen.getByRole("heading", { name: "No encontramos la operación" })).toBeDefined();
    expect(screen.getByText("Revisá el link.")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("is an alert when asked to", () => {
    render(<CheckoutMessageCard title="Algo falló" body="Probá de nuevo." action={null} isAlert />);

    expect(screen.getByRole("alert").textContent).toContain("Algo falló");
  });

  it("renders the action as a link of at least 44 px on mobile", () => {
    render(
      <CheckoutMessageCard title="Sin cupos" body="Elegí otro." action={{ label: "Ir a mi perfil", href: "/dashboard" }} />,
    );

    const link = screen.getByRole("link", { name: "Ir a mi perfil" });
    expect(link.getAttribute("href")).toBe("/dashboard");
    expect(link.className).toContain("min-h-11");
  });

  it("renders a custom child, such as a button, after the body", () => {
    render(
      <CheckoutMessageCard title="Error" body="Probá de nuevo." action={null}>
        <button type="button">Reintentar</button>
      </CheckoutMessageCard>,
    );

    expect(screen.getByRole("button", { name: "Reintentar" })).toBeDefined();
  });
});

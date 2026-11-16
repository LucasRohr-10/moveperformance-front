import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import AuthLayout from "../layout";
import RegisterPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const redirectIfSignedIn = vi.hoisted(() => vi.fn(() => null));

vi.mock("@/features/auth/redirect-if-signed-in", () => ({
  RedirectIfSignedIn: redirectIfSignedIn,
}));

describe("RegisterPage", () => {
  it("shows the register form under the auth header, with a link back to login", () => {
    renderWithSnackbar(
      <AuthLayout>
        <RegisterPage />
      </AuthLayout>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Sumate a MOVE." }),
    ).toBeDefined();
    const labels = ["Nombre", "Apellido", "Fecha de nacimiento", "Email", "Teléfono", "Contraseña"];
    const fields = labels.map((label) => screen.getByLabelText(label));
    // Each field comes after the previous one in the page.
    fields.slice(1).forEach((field, index) => {
      expect(fields[index].compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    expect(
      screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href"),
    ).toBe("/login");
    expect(
      screen
        .getByRole("link", { name: "Crear cuenta" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("button", { name: "Continuar con Google" }),
    ).toBeDefined();
    expect(redirectIfSignedIn).toHaveBeenCalled();
  });
});

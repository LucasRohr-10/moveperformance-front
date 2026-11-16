import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import AuthLayout from "../layout";
import LoginPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const redirectIfSignedIn = vi.hoisted(() => vi.fn(() => null));

vi.mock("@/features/auth/redirect-if-signed-in", () => ({
  RedirectIfSignedIn: redirectIfSignedIn,
}));

describe("LoginPage", () => {
  it("shows the login form under the auth header", () => {
    renderWithSnackbar(
      <AuthLayout>
        <LoginPage />
      </AuthLayout>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Entrá a MOVE." }),
    ).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Contraseña")).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "← Volver al sitio" })
        .getAttribute("href"),
    ).toBe("/");
    expect(
      screen.getByRole("link", { name: "Crear cuenta" }).getAttribute("href"),
    ).toBe("/register");
    expect(
      screen
        .getByRole("link", { name: "Iniciar sesión" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "¿Olvidaste tu contraseña?" })
        .getAttribute("href"),
    ).toBe("/forgot-password");
    expect(screen.getByText("Perfiles de la plataforma")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Continuar con Google" }),
    ).toBeDefined();
    expect(redirectIfSignedIn).toHaveBeenCalled();
  });
});

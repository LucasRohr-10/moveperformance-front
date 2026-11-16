import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import ForgotPasswordPage from "./page";

const redirectIfSignedIn = vi.hoisted(() => vi.fn(() => null));

vi.mock("@/features/auth/redirect-if-signed-in", () => ({
  RedirectIfSignedIn: redirectIfSignedIn,
}));

describe("ForgotPasswordPage", () => {
  it("shows the form and sends a signed-in user away", () => {
    renderWithSnackbar(<ForgotPasswordPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Recuperá tu contraseña.",
      }),
    ).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(redirectIfSignedIn).toHaveBeenCalled();
  });
});

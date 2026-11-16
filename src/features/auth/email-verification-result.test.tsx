import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { EmailVerificationResult } from "./email-verification-result";
import { announceEmailVerified } from "./email-verified-channel";

vi.mock("./email-verified-channel", () => ({
  announceEmailVerified: vi.fn(),
}));

const replace = vi.hoisted(() => vi.fn());
const searchParams = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams.current,
}));

const EXPIRED_LINK_MESSAGE =
  "Este enlace venció o ya no es válido. Ingresá con tu email y contraseña y te ofrecemos mandarte uno nuevo.";

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.current = new URLSearchParams();
});

describe("EmailVerificationResult", () => {
  it("confirms the email in the title and tells the user they can close the tab", () => {
    renderWithSnackbar(<EmailVerificationResult />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "¡Listo! Tu email quedó confirmado.",
      }),
    ).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Acceso")).toBeNull();
    expect(
      screen.getByText("Ya podés cerrar esta pestaña y entrar a tu cuenta."),
    ).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("tells the tab the user signed up from that the email is confirmed", () => {
    renderWithSnackbar(<EmailVerificationResult />);

    expect(announceEmailVerified).toHaveBeenCalledTimes(1);
  });

  it("does not announce a confirmation when the link failed", () => {
    searchParams.current = new URLSearchParams("error=TOKEN_EXPIRED");
    renderWithSnackbar(<EmailVerificationResult />);

    expect(announceEmailVerified).not.toHaveBeenCalled();
  });

  it("explains an expired link and sends the user to log in to ask for a new one", async () => {
    searchParams.current = new URLSearchParams("error=TOKEN_EXPIRED");
    renderWithSnackbar(<EmailVerificationResult />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Confirmación de email." }),
    ).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain(EXPIRED_LINK_MESSAGE);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Ir a iniciar sesión" }));
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("treats an old link replaced by a newer email like an expired one", () => {
    searchParams.current = new URLSearchParams("error=INVALID_TOKEN");
    renderWithSnackbar(<EmailVerificationResult />);

    expect(screen.getByRole("alert").textContent).toContain(EXPIRED_LINK_MESSAGE);
  });
});

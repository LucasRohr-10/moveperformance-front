import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ResendVerificationEmailButton } from "./resend-verification-email-button";
import {
  SEND_VERIFICATION_EMAIL_ERRORS,
  type SendVerificationEmailResult,
  sendVerificationEmail,
} from "./send-verification-email";

vi.mock("./send-verification-email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./send-verification-email")>()),
  sendVerificationEmail: vi.fn(),
}));

const send = vi.mocked(sendVerificationEmail);

async function clickResend() {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Reenviar mail de confirmación" }),
  );
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ResendVerificationEmailButton", () => {
  it("asks for a new email to that address, coming back to /verify-email", async () => {
    send.mockResolvedValue({ ok: true });
    renderWithSnackbar(<ResendVerificationEmailButton email="ana@move.uy" />);

    await clickResend();

    expect(send).toHaveBeenCalledWith({
      email: "ana@move.uy",
      callbackURL: `${window.location.origin}/verify-email`,
    });
    expect((await screen.findByRole("status")).textContent).toBe(
      "Te mandamos un mail nuevo. Revisá tu casilla de entrada y la carpeta de spam.",
    );
  });

  it("asks the user to wait when they already asked less than a minute ago", async () => {
    send.mockResolvedValue({
      ok: false,
      error: SEND_VERIFICATION_EMAIL_ERRORS.COOLDOWN,
    });
    renderWithSnackbar(<ResendVerificationEmailButton email="ana@move.uy" />);

    await clickResend();

    expect((await screen.findByRole("status")).textContent).toBe(
      "Ya te mandamos un mail hace menos de un minuto. Esperá un momento y volvé a pedirlo.",
    );
  });

  it("shows a generic message and lets the user retry when the API is unavailable", async () => {
    send.mockResolvedValue({
      ok: false,
      error: SEND_VERIFICATION_EMAIL_ERRORS.UNAVAILABLE,
    });
    renderWithSnackbar(<ResendVerificationEmailButton email="ana@move.uy" />);

    await clickResend();

    expect((await screen.findByRole("status")).textContent).toBe(
      "No pudimos reenviar el mail. Probá de nuevo en unos minutos.",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Reenviar mail de confirmación",
      }).disabled,
    ).toBe(false);
  });

  it("sends a single request when the user clicks twice", async () => {
    let resolveSend: (result: SendVerificationEmailResult) => void = () => {};
    send.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
    );
    renderWithSnackbar(<ResendVerificationEmailButton email="ana@move.uy" />);

    const user = await clickResend();
    const pendingButton = screen.getByRole<HTMLButtonElement>("button", {
      name: "Enviando…",
    });
    await user.click(pendingButton);

    expect(pendingButton.disabled).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    resolveSend({ ok: true });
    await waitFor(() => expect(screen.getByRole("status")).toBeDefined());
  });
});

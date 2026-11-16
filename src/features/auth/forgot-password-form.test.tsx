import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ForgotPasswordForm } from "./forgot-password-form";
import { requestPasswordReset } from "./request-password-reset";

vi.mock("./request-password-reset", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./request-password-reset")>()),
  requestPasswordReset: vi.fn(),
}));

const requestReset = vi.mocked(requestPasswordReset);

async function submitForm(email: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Enviar enlace" }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ForgotPasswordForm", () => {
  it("shows a generic success message when the request succeeds", async () => {
    requestReset.mockResolvedValue({ ok: true });
    renderWithSnackbar(<ForgotPasswordForm />);

    await submitForm("ana@move.uy");

    expect(
      await screen.findByText(
        "Si el email existe en nuestro sistema, te enviamos un enlace para restablecer tu contraseña.",
      ),
    ).toBeDefined();
  });

  it("shows the exact same message for an email that does not exist", async () => {
    // requestPasswordReset always resolves { ok: true } for Better Auth's
    // anti-enumeration response — there is no "not found" branch to show a
    // different message for, by design. This test pins that behavior.
    requestReset.mockResolvedValue({ ok: true });
    renderWithSnackbar(<ForgotPasswordForm />);

    await submitForm("nope@move.uy");

    expect(
      await screen.findByText(
        "Si el email existe en nuestro sistema, te enviamos un enlace para restablecer tu contraseña.",
      ),
    ).toBeDefined();
  });

  it("shows a different message only on a genuine network failure", async () => {
    requestReset.mockResolvedValue({ ok: false, error: "UNAVAILABLE" });
    renderWithSnackbar(<ForgotPasswordForm />);

    await submitForm("ana@move.uy");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos procesar el pedido. Probá de nuevo en unos minutos.",
    );
  });

  it("asks for a valid email without calling the API", async () => {
    renderWithSnackbar(<ForgotPasswordForm />);

    await submitForm("not-an-email");

    expect(screen.getByText("Ingresá un email válido.")).toBeDefined();
    expect(requestReset).not.toHaveBeenCalled();
  });

  it("sends the redirectTo pointing at /reset-password on this origin", async () => {
    requestReset.mockResolvedValue({ ok: true });
    renderWithSnackbar(<ForgotPasswordForm />);

    await submitForm("ana@move.uy");

    expect(requestReset).toHaveBeenCalledWith({
      email: "ana@move.uy",
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });

  it("starts fresh when the cached page is shown again after a successful submit", async () => {
    requestReset.mockResolvedValue({ ok: true });
    const { rerender } = renderWithSnackbar(
      <Activity mode="visible">
        <ForgotPasswordForm />
      </Activity>,
    );
    await submitForm("ana@move.uy");
    expect(
      await screen.findByText(
        "Si el email existe en nuestro sistema, te enviamos un enlace para restablecer tu contraseña.",
      ),
    ).toBeDefined();

    rerender(
      <Activity mode="hidden">
        <ForgotPasswordForm />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <ForgotPasswordForm />
      </Activity>,
    );

    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(
      screen.queryByText(
        "Si el email existe en nuestro sistema, te enviamos un enlace para restablecer tu contraseña.",
      ),
    ).toBeNull();
  });
});

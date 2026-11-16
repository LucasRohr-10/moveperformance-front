import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { resetPassword } from "./reset-password";
import { ResetPasswordForm } from "./reset-password-form";

const replace = vi.hoisted(() => vi.fn());
const searchParams = vi.hoisted(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

vi.mock("./reset-password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./reset-password")>()),
  resetPassword: vi.fn(),
}));

const resetPasswordMock = vi.mocked(resetPassword);

async function submitForm(password: string, confirmPassword: string) {
  const user = userEvent.setup();
  if (password) await user.type(screen.getByLabelText("Nueva contraseña"), password);
  if (confirmPassword) {
    await user.type(screen.getByLabelText("Repetí la contraseña"), confirmPassword);
  }
  await user.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [...searchParams.keys()]) searchParams.delete(key);
});

describe("ResetPasswordForm", () => {
  it("shows the expired/used link state when the URL has no token", () => {
    renderWithSnackbar(<ResetPasswordForm />);

    expect(
      screen.getByText("Este enlace venció o ya fue usado. Pedí uno nuevo."),
    ).toBeDefined();
    expect(screen.queryByLabelText("Nueva contraseña")).toBeNull();
  });

  it("shows the expired/used link state when the URL has error=INVALID_TOKEN", () => {
    searchParams.set("error", "INVALID_TOKEN");
    renderWithSnackbar(<ResetPasswordForm />);

    expect(
      screen.getByText("Este enlace venció o ya fue usado. Pedí uno nuevo."),
    ).toBeDefined();
  });

  it("shows the form and resets the password when a token is present", async () => {
    searchParams.set("token", "valid-token-123");
    resetPasswordMock.mockResolvedValue({ ok: true });
    renderWithSnackbar(<ResetPasswordForm />);

    await submitForm("new-secret-123", "new-secret-123");

    expect(resetPasswordMock).toHaveBeenCalledWith({
      newPassword: "new-secret-123",
      token: "valid-token-123",
    });
    expect(
      await screen.findByText(
        "Listo, tu contraseña se actualizó. Ya podés iniciar sesión con la nueva.",
      ),
    ).toBeDefined();
  });

  it("maps an invalid/expired token error from the API", async () => {
    searchParams.set("token", "valid-token-123");
    resetPasswordMock.mockResolvedValue({ ok: false, error: "INVALID_TOKEN" });
    renderWithSnackbar(<ResetPasswordForm />);

    await submitForm("new-secret-123", "new-secret-123");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Este enlace venció o ya fue usado. Pedí uno nuevo.",
    );
  });

  it("rejects mismatched passwords without calling the API", async () => {
    searchParams.set("token", "valid-token-123");
    renderWithSnackbar(<ResetPasswordForm />);

    await submitForm("new-secret-123", "different-123");

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeDefined();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});

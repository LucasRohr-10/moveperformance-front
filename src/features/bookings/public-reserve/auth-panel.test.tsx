import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

vi.mock("@/features/auth/sign-in", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/sign-in")>();
  return { ...actual, signInWithEmail: vi.fn() };
});
vi.mock("@/features/auth/sign-up", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/sign-up")>();
  return { ...actual, signUpWithEmail: vi.fn() };
});
vi.mock("@/features/auth/request-password-reset", () => ({ requestPasswordReset: vi.fn() }));
vi.mock("@/features/auth/get-current-user-client", () => ({ getCurrentUserClient: vi.fn() }));

import { getCurrentUserClient } from "@/features/auth/get-current-user-client";
import { requestPasswordReset } from "@/features/auth/request-password-reset";
import { signInWithEmail } from "@/features/auth/sign-in";
import { signUpWithEmail } from "@/features/auth/sign-up";

import { AuthPanel } from "./auth-panel";

const signInMock = vi.mocked(signInWithEmail);
const signUpMock = vi.mocked(signUpWithEmail);
const requestResetMock = vi.mocked(requestPasswordReset);
const getCurrentUserClientMock = vi.mocked(getCurrentUserClient);

const USER = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: "client" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthPanel", () => {
  it("defaults to the Ingresar tab and switches to Crear cuenta", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Ingresar" }).getAttribute("aria-selected")).toBe("true");
    await user.click(screen.getByRole("tab", { name: "Crear cuenta" }));
    expect(screen.getByRole("button", { name: "Crear cuenta y reservar" })).toBeDefined();
  });

  it("shows validation errors for an empty login submit", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Ingresar y reservar" }));

    expect(await screen.findByText("Ingresá un email válido.")).toBeDefined();
    expect(screen.getByText("Ingresá tu contraseña.")).toBeDefined();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("shows a neutral error for invalid credentials — it never reveals whether the account exists", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValue({ ok: false, error: "INVALID_CREDENTIALS" });
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Contraseña"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Ingresar y reservar" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Email o contraseña incorrectos.");
    expect(alert.textContent?.toLowerCase()).not.toMatch(/no encontramos|no existe/);
  });

  it("offers to resend the confirmation email when the account isn't verified yet", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValue({ ok: false, error: "EMAIL_NOT_VERIFIED" });
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Contraseña"), "whatever");
    await user.click(screen.getByRole("button", { name: "Ingresar y reservar" }));

    expect(await screen.findByRole("button", { name: /Reenviar mail/ })).toBeDefined();
  });

  it("shows the deactivated message when signing in to book", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValue({ ok: false, error: "ACCOUNT_DEACTIVATED" });
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Contraseña"), "whatever");
    await user.click(screen.getByRole("button", { name: "Ingresar y reservar" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Tu cuenta está desactivada. Escribile a MOVE para reactivarla.",
    );
    expect(screen.queryByRole("button", { name: /Reenviar mail/ })).toBeNull();
  });

  it("fetches the fresh session and calls onAuthenticated after a successful login", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    signInMock.mockResolvedValue({ ok: true });
    getCurrentUserClientMock.mockResolvedValue(USER);
    renderWithSnackbar(<AuthPanel onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Contraseña"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Ingresar y reservar" }));

    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(USER));
  });

  it("requires a phone number on sign-up, matching the app's mandatory-phone rule", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "Crear cuenta" }));

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "Perez");
    await user.type(screen.getByLabelText("Fecha de nacimiento"), "1990-03-12");
    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Contraseña"), "Abcdef1!");
    await user.click(screen.getByRole("button", { name: "Crear cuenta y reservar" }));

    expect(await screen.findByText("Ingresá un teléfono válido.")).toBeDefined();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("shows the same check-email message on sign-up regardless of whether the email was already registered", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    signUpMock.mockResolvedValue({ ok: true });
    renderWithSnackbar(<AuthPanel onAuthenticated={onAuthenticated} />);
    await user.click(screen.getByRole("tab", { name: "Crear cuenta" }));

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "Perez");
    await user.type(screen.getByLabelText("Fecha de nacimiento"), "1990-03-12");
    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Teléfono"), "099 123 456");
    await user.type(screen.getByLabelText("Contraseña"), "Abcdef1!");
    await user.click(screen.getByRole("button", { name: "Crear cuenta y reservar" }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/confirmar tu cuenta/i);
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("lets the visitor get back to the login tab from the check-email screen", async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValue({ ok: true });
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "Crear cuenta" }));

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "Perez");
    await user.type(screen.getByLabelText("Fecha de nacimiento"), "1990-03-12");
    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Teléfono"), "099 123 456");
    await user.type(screen.getByLabelText("Contraseña"), "Abcdef1!");
    await user.click(screen.getByRole("button", { name: "Crear cuenta y reservar" }));
    await screen.findByRole("status");

    await user.click(screen.getByRole("button", { name: "Ya confirmé mi cuenta, ingresar" }));
    expect(screen.getByRole("button", { name: "Ingresar y reservar" })).toBeDefined();
  });

  it("clears the password but keeps the email when switching tabs", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Contraseña"), "secret");
    await user.click(screen.getByRole("tab", { name: "Crear cuenta" }));
    await user.click(screen.getByRole("tab", { name: "Ingresar" }));

    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("ana@move.uy");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe("");
  });

  it("requests a password reset with a neutral message that doesn't reveal account existence", async () => {
    const user = userEvent.setup();
    requestResetMock.mockResolvedValue({ ok: true });
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText(/si el email existe en nuestro sistema/i)).toBeDefined();
  });

  it("calls onCancel from the Cancelar link when provided", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("sends the birth date with the inline sign-up and validates it like the register form", async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValue({ ok: true });
    renderWithSnackbar(<AuthPanel onAuthenticated={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "Crear cuenta" }));

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "Perez");
    await user.type(screen.getByLabelText("Email"), "ana@move.uy");
    await user.type(screen.getByLabelText("Teléfono"), "099 123 456");
    await user.type(screen.getByLabelText("Contraseña"), "Abcdef1!");
    await user.click(screen.getByRole("button", { name: "Crear cuenta y reservar" }));

    expect(await screen.findByText("Ingresá tu fecha de nacimiento.")).toBeDefined();
    expect(signUpMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Fecha de nacimiento"), "1990-03-12");
    await user.click(screen.getByRole("button", { name: "Crear cuenta y reservar" }));

    await vi.waitFor(() =>
      expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({ birthDate: "1990-03-12" })),
    );
  });
});

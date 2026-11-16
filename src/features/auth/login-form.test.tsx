import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { LoginForm } from "./login-form";
import { sendVerificationEmail } from "./send-verification-email";
import { SIGN_IN_ERRORS, type SignInResult, signInWithEmail } from "./sign-in";

const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const redirectToParam = vi.hoisted<{ current: string | null }>(() => ({ current: null }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => ({ get: (key: string) => (key === "redirectTo" ? redirectToParam.current : null) }),
}));

vi.mock("./sign-in", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sign-in")>()),
  signInWithEmail: vi.fn(),
}));

vi.mock("./send-verification-email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./send-verification-email")>()),
  sendVerificationEmail: vi.fn(),
}));

const signIn = vi.mocked(signInWithEmail);
const sendVerification = vi.mocked(sendVerificationEmail);

async function submitForm(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Ingresar" }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  redirectToParam.current = null;
});

describe("LoginForm", () => {
  it("links to the forgot-password page", () => {
    renderWithSnackbar(<LoginForm />);

    expect(
      screen
        .getByRole("link", { name: "¿Olvidaste tu contraseña?" })
        .getAttribute("href"),
    ).toBe("/forgot-password");
  });

  it("signs in and goes to the dashboard", async () => {
    signIn.mockResolvedValue({ ok: true });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "secret-123");

    expect(signIn).toHaveBeenCalledWith({
      email: "ana@move.uy",
      password: "secret-123",
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("goes back to the page the visitor came from when ?redirectTo is a safe internal path", async () => {
    redirectToParam.current = "/checkout/plan/123";
    signIn.mockResolvedValue({ ok: true });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "secret-123");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/plan/123"));
  });

  it("falls back to the dashboard when ?redirectTo is an external URL", async () => {
    redirectToParam.current = "https://evil.com";
    signIn.mockResolvedValue({ ok: true });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "secret-123");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("asks for both fields without calling the API when they are empty", async () => {
    renderWithSnackbar(<LoginForm />);

    await submitForm("", "");

    expect(screen.getByText("Ingresá un email válido.")).toBeDefined();
    expect(screen.getByText("Ingresá tu contraseña.")).toBeDefined();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("rejects a malformed email without calling the API", async () => {
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@", "secret-123");

    expect(screen.getByText("Ingresá un email válido.")).toBeDefined();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows a wrong-credentials message and keeps what the user typed", async () => {
    signIn.mockResolvedValue({
      ok: false,
      error: SIGN_IN_ERRORS.INVALID_CREDENTIALS,
    });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "wrong-pass");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Email o contraseña incorrectos.",
    );
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe(
      "ana@move.uy",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a wait message when there were too many attempts", async () => {
    signIn.mockResolvedValue({
      ok: false,
      error: SIGN_IN_ERRORS.TOO_MANY_ATTEMPTS,
    });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "secret-123");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Demasiados intentos. Esperá un momento y volvé a probar.",
    );
  });

  it("asks the user to confirm their email when it is not verified yet", async () => {
    signIn.mockResolvedValue({
      ok: false,
      error: SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED,
    });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "secret-123");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Confirmá tu email antes de ingresar. Revisá tu casilla de entrada.",
    );
  });

  it("shows the deactivated message and no resend button", async () => {
    signIn.mockResolvedValue({
      ok: false,
      error: SIGN_IN_ERRORS.ACCOUNT_DEACTIVATED,
    });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "secret-123");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Tu cuenta está desactivada. Escribile a MOVE para reactivarla.",
    );
    expect(screen.queryByRole("button", { name: "Reenviar mail de confirmación" })).toBeNull();
  });

  it("offers to resend the confirmation email to the address the user typed", async () => {
    signIn.mockResolvedValue({
      ok: false,
      error: SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED,
    });
    sendVerification.mockResolvedValue({ ok: true });
    renderWithSnackbar(<LoginForm />);

    const user = await submitForm("  ana@move.uy ", "secret-123");
    await user.click(
      await screen.findByRole("button", {
        name: "Reenviar mail de confirmación",
      }),
    );

    expect(sendVerification).toHaveBeenCalledWith({
      email: "ana@move.uy",
      callbackURL: `${window.location.origin}/verify-email`,
    });
  });

  it("does not offer to resend the confirmation email for other errors", async () => {
    signIn.mockResolvedValue({
      ok: false,
      error: SIGN_IN_ERRORS.INVALID_CREDENTIALS,
    });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "wrong-pass");

    await screen.findByRole("alert");
    expect(
      screen.queryByRole("button", { name: "Reenviar mail de confirmación" }),
    ).toBeNull();
  });

  it("shows a generic message and lets the user retry when the API is unavailable", async () => {
    signIn.mockResolvedValue({ ok: false, error: SIGN_IN_ERRORS.UNAVAILABLE });
    renderWithSnackbar(<LoginForm />);

    await submitForm("ana@move.uy", "secret-123");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos iniciar sesión. Probá de nuevo en unos minutos.",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Ingresar" })
        .disabled,
    ).toBe(false);
  });

  it("sends the email without surrounding spaces and the password as typed", async () => {
    signIn.mockResolvedValue({ ok: true });
    renderWithSnackbar(<LoginForm />);

    await submitForm("  ana@move.uy  ", " secret-123 ");

    expect(signIn).toHaveBeenCalledWith({
      email: "ana@move.uy",
      password: " secret-123 ",
    });
  });

  it("sends a single request when the user clicks Ingresar twice", async () => {
    let resolveSignIn: (result: SignInResult) => void = () => {};
    signIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    renderWithSnackbar(<LoginForm />);

    const user = await submitForm("ana@move.uy", "secret-123");
    const pendingButton = screen.getByRole<HTMLButtonElement>("button", {
      name: "Ingresando…",
    });
    await user.click(pendingButton);

    expect(pendingButton.disabled).toBe(true);
    expect(signIn).toHaveBeenCalledTimes(1);
    resolveSignIn({ ok: true });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("starts fresh when the cached login page is shown again after a successful sign-in", async () => {
    signIn.mockResolvedValue({ ok: true });
    const { rerender } = renderWithSnackbar(
      <Activity mode="visible">
        <LoginForm />
      </Activity>,
    );
    await submitForm("ana@move.uy", "secret-123");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));

    rerender(
      <Activity mode="hidden">
        <LoginForm />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <LoginForm />
      </Activity>,
    );

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Ingresar" })
        .disabled,
    ).toBe(false);
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Contraseña").value).toBe(
      "",
    );
  });
});

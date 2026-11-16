import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { announceEmailVerified } from "./email-verified-channel";
import { RegisterForm } from "./register-form";
import { sendVerificationEmail } from "./send-verification-email";
import { SIGN_UP_ERRORS, type SignUpResult, signUpWithEmail } from "./sign-up";

const CHECK_EMAIL_MESSAGE =
  "¡Listo! Te mandamos un mail para confirmar tu cuenta. Tocá el enlace para poder ingresar.";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("./sign-up", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sign-up")>()),
  signUpWithEmail: vi.fn(),
}));

vi.mock("./send-verification-email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./send-verification-email")>()),
  sendVerificationEmail: vi.fn(),
}));

const signUp = vi.mocked(signUpWithEmail);
const sendVerification = vi.mocked(sendVerificationEmail);

async function submitForm({
  name = "",
  lastName = "",
  birthDate = "1990-03-12",
  email = "",
  phone = "",
  password = "",
}: {
  name?: string;
  lastName?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  password?: string;
}) {
  const user = userEvent.setup();
  if (name) await user.type(screen.getByLabelText("Nombre"), name);
  if (lastName) await user.type(screen.getByLabelText("Apellido"), lastName);
  if (birthDate) await user.type(screen.getByLabelText("Fecha de nacimiento"), birthDate);
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (phone) await user.type(screen.getByLabelText("Teléfono"), phone);
  if (password) await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RegisterForm", () => {
  it("points to the fields to fix with a snackbar and the focus", async () => {
    renderWithSnackbar(<RegisterForm />);

    await submitForm({ name: "Lucas", lastName: "Rohr", email: "lucas@example.com", phone: "12", password: "1234" });

    // Field errors are alerts too; the snackbar is the one that counts them.
    expect(screen.getAllByRole("alert").some((el) => el.textContent?.includes("Revisá 2 campos"))).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Teléfono")));
    expect(signUp).not.toHaveBeenCalled();
  });

  it("clears a field's error as soon as it is fixed and keeps the others", async () => {
    renderWithSnackbar(<RegisterForm />);
    const user = await submitForm({ name: "Lucas", lastName: "Rohr", email: "lucas@example.com", phone: "12", password: "1234" });
    const phone = screen.getByLabelText("Teléfono");
    expect(phone.getAttribute("aria-invalid")).toBe("true");

    await user.clear(phone);
    await user.type(phone, "099123456");

    expect(phone.getAttribute("aria-invalid")).not.toBe("true");
    expect(screen.getByLabelText("Contraseña").getAttribute("aria-invalid")).toBe("true");
  });

  it("creates the account and asks the user to check their email", async () => {
    signUp.mockResolvedValue({ ok: true });
    renderWithSnackbar(<RegisterForm />);

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      phone: "099 123 456",
      email: "ana@move.uy",
      password: "secret-123",
    });

    expect(signUp).toHaveBeenCalledWith({
      name: "Ana",
      lastName: "Perez",
      birthDate: "1990-03-12",
      email: "ana@move.uy",
      phone: "+59899123456",
      password: "secret-123",
      callbackURL: `${window.location.origin}/verify-email`,
    });
    expect(await screen.findByText(CHECK_EMAIL_MESSAGE)).toBeDefined();
  });

  it("shows the confirmed screen once the confirmation link is opened in another tab", async () => {
    signUp.mockResolvedValue({ ok: true });
    renderWithSnackbar(<RegisterForm />);
    await submitForm({
      name: "Ana",
      lastName: "Perez",
      phone: "099 123 456",
      email: "ana@move.uy",
      password: "secret-123",
    });
    expect(await screen.findByText(CHECK_EMAIL_MESSAGE)).toBeDefined();

    announceEmailVerified();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "¡Listo! Tu email quedó confirmado.",
      }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Ir a mi perfil" })).toBeDefined();
    expect(screen.queryByText(CHECK_EMAIL_MESSAGE)).toBeNull();
  });

  it("shows the extra sign-up options only until the account is created", async () => {
    signUp.mockResolvedValue({ ok: true });
    renderWithSnackbar(
      <RegisterForm>
        <button type="button">Continuar con Google</button>
      </RegisterForm>,
    );

    expect(
      screen.getByRole("button", { name: "Continuar con Google" }),
    ).toBeDefined();

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      phone: "099 123 456",
      email: "ana@move.uy",
      password: "secret-123",
    });

    expect(await screen.findByText(CHECK_EMAIL_MESSAGE)).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Continuar con Google" }),
    ).toBeNull();
  });

  it("lets the user ask for the confirmation email again from the success card", async () => {
    signUp.mockResolvedValue({ ok: true });
    sendVerification.mockResolvedValue({ ok: true });
    renderWithSnackbar(<RegisterForm />);

    const user = await submitForm({
      name: "Ana",
      lastName: "Perez",
      phone: "099 123 456",
      email: "ana@move.uy",
      password: "secret-123",
    });
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

  it("asks for every field without calling the API when the form is empty", async () => {
    renderWithSnackbar(<RegisterForm />);

    await submitForm({});

    expect(screen.getByText("Ingresá tu nombre.")).toBeDefined();
    expect(screen.getByText("Ingresá tu apellido.")).toBeDefined();
    expect(screen.getByText("Ingresá un teléfono válido.")).toBeDefined();
    expect(screen.getByText("Ingresá un email válido.")).toBeDefined();
    expect(
      screen.getByText("La contraseña necesita al menos 8 caracteres."),
    ).toBeDefined();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters without calling the API", async () => {
    renderWithSnackbar(<RegisterForm />);

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      phone: "099 123 456",
      email: "ana@move.uy",
      password: "short",
    });

    expect(
      screen.getByText("La contraseña necesita al menos 8 caracteres."),
    ).toBeDefined();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("shows a generic message and lets the user retry when the API is unavailable", async () => {
    signUp.mockResolvedValue({ ok: false, error: SIGN_UP_ERRORS.UNAVAILABLE });
    renderWithSnackbar(<RegisterForm />);

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      phone: "099 123 456",
      email: "ana@move.uy",
      password: "secret-123",
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos crear tu cuenta. Probá de nuevo en unos minutos.",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Crear cuenta" })
        .disabled,
    ).toBe(false);
  });

  it("shows the password strength checklist as the user types", async () => {
    renderWithSnackbar(<RegisterForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Contraseña"), "Secret123!");

    expect(
      screen.getByText("8+ caracteres").previousElementSibling?.textContent,
    ).toBe("✓");
  });

  it("sends a single request when the user clicks Crear cuenta twice", async () => {
    let resolveSignUp: (result: SignUpResult) => void = () => {};
    signUp.mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = resolve;
      }),
    );
    renderWithSnackbar(<RegisterForm />);

    const user = await submitForm({
      name: "Ana",
      lastName: "Perez",
      phone: "099 123 456",
      email: "ana@move.uy",
      password: "secret-123",
    });
    const pendingButton = screen.getByRole<HTMLButtonElement>("button", {
      name: "Creando cuenta…",
    });
    await user.click(pendingButton);

    expect(pendingButton.disabled).toBe(true);
    expect(signUp).toHaveBeenCalledTimes(1);
    resolveSignUp({ ok: true });
    expect(await screen.findByText(CHECK_EMAIL_MESSAGE)).toBeDefined();
  });

  it("starts fresh when the cached register page is shown again after a successful sign-up", async () => {
    signUp.mockResolvedValue({ ok: true });
    const { rerender } = renderWithSnackbar(
      <Activity mode="visible">
        <RegisterForm />
      </Activity>,
    );
    await submitForm({
      name: "Ana",
      lastName: "Perez",
      phone: "099 123 456",
      email: "ana@move.uy",
      password: "secret-123",
    });
    expect(await screen.findByText(CHECK_EMAIL_MESSAGE)).toBeDefined();

    rerender(
      <Activity mode="hidden">
        <RegisterForm />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <RegisterForm />
      </Activity>,
    );

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Crear cuenta" })
        .disabled,
    ).toBe(false);
    expect(
      screen.getByLabelText<HTMLInputElement>("Nombre").value,
    ).toBe("");
    expect(
      screen.getByText("8+ caracteres").previousElementSibling?.textContent,
    ).toBe("");
  });

  it("rejects a phone that is not a real number without calling the API", async () => {
    renderWithSnackbar(<RegisterForm />);

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "099 12 34",
      password: "secret-123",
    });

    expect(screen.getByText("Ingresá un teléfono válido.")).toBeDefined();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("ignores letters and symbols typed into the phone field", async () => {
    signUp.mockResolvedValue({ ok: true });
    renderWithSnackbar(<RegisterForm />);

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "099-123-456abc",
      password: "secret-123",
    });

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+59899123456" }),
    );
  });

  it("asks to check the last name, phone and birth date when the API rejects them", async () => {
    signUp.mockResolvedValue({
      ok: false,
      error: SIGN_UP_ERRORS.INVALID_PROFILE,
    });
    renderWithSnackbar(<RegisterForm />);

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "099 123 456",
      password: "secret-123",
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Revisá tu apellido, tu teléfono y tu fecha de nacimiento.",
    );
  });

  it("asks for the birth date", async () => {
    renderWithSnackbar(<RegisterForm />);

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      birthDate: "",
      email: "ana@move.uy",
      phone: "099 123 456",
      password: "secret-123",
    });

    expect(await screen.findByText("Ingresá tu fecha de nacimiento.")).toBeDefined();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects a future birth date", async () => {
    renderWithSnackbar(<RegisterForm />);

    await submitForm({
      name: "Ana",
      lastName: "Perez",
      birthDate: "2999-01-01",
      email: "ana@move.uy",
      phone: "099 123 456",
      password: "secret-123",
    });

    expect(await screen.findByText("Revisá la fecha de nacimiento.")).toBeDefined();
    expect(signUp).not.toHaveBeenCalled();
  });
});

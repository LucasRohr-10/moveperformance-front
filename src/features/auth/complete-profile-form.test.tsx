import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { CompleteProfileForm } from "./complete-profile-form";
import { UPDATE_PROFILE_ERRORS, updateProfile } from "./update-profile";

const replace = vi.hoisted(() => vi.fn());
const searchParams = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams.current,
}));

vi.mock("./update-profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./update-profile")>()),
  updateProfile: vi.fn(),
}));

const update = vi.mocked(updateProfile);

async function submitPhone(phone: string) {
  const user = userEvent.setup();
  if (phone) await user.type(screen.getByLabelText("Teléfono"), phone);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.current = new URLSearchParams();
});

describe("CompleteProfileForm", () => {
  it("saves the phone in E.164 and goes to the user's home", async () => {
    update.mockResolvedValue({ ok: true });
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);

    await submitPhone("099 123 456");

    expect(update).toHaveBeenCalledWith({ phone: "+59899123456" });
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("goes to the page the user was trying to reach instead of their home", async () => {
    searchParams.current = new URLSearchParams({ redirectTo: "/history?tab=pagos" });
    update.mockResolvedValue({ ok: true });
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);

    await submitPhone("099 123 456");

    expect(replace).toHaveBeenCalledWith("/history?tab=pagos");
  });

  it("ignores an unsafe redirectTo and goes to the user's home", async () => {
    searchParams.current = new URLSearchParams({ redirectTo: "/\t/evil.com" });
    update.mockResolvedValue({ ok: true });
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);

    await submitPhone("099 123 456");

    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("asks for a valid phone without calling the API", async () => {
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);

    await submitPhone("099 12 34");

    expect(screen.getByText("Ingresá un teléfono válido.")).toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("ignores letters and symbols typed into the phone field", async () => {
    update.mockResolvedValue({ ok: true });
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);

    await submitPhone("099-123-456abc");

    expect(update).toHaveBeenCalledWith({ phone: "+59899123456" });
  });

  it("clears the phone error as soon as the number is fixed", async () => {
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);
    const user = await submitPhone("12");
    const phone = screen.getByLabelText("Teléfono");
    expect(phone.getAttribute("aria-invalid")).toBe("true");

    await user.clear(phone);
    await user.type(phone, "099123456");

    expect(phone.getAttribute("aria-invalid")).not.toBe("true");
  });

  it("asks for a valid phone when the field is empty", async () => {
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);

    await submitPhone("");

    expect(screen.getByText("Ingresá un teléfono válido.")).toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("shows a generic message and lets the user retry when the API is unavailable", async () => {
    update.mockResolvedValue({
      ok: false,
      error: UPDATE_PROFILE_ERRORS.UNAVAILABLE,
    });
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);

    await submitPhone("099 123 456");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos guardar tus datos. Probá de nuevo en unos minutos.",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Continuar" })
        .disabled,
    ).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends a single request when Continuar is clicked twice", async () => {
    update.mockReturnValue(new Promise(() => {}));
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />);

    const user = await submitPhone("099 123 456");
    await user.click(screen.getByRole("button", { name: "Guardando…" }));

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("starts fresh when the cached page is shown again after saving the phone", async () => {
    update.mockResolvedValue({ ok: true });
    const { rerender } = renderWithSnackbar(
      <Activity mode="visible">
        <CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />
      </Activity>,
    );
    await submitPhone("099 123 456");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));

    rerender(
      <Activity mode="hidden">
        <CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate={false} />
      </Activity>,
    );

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Continuar" })
        .disabled,
    ).toBe(false);
    expect(screen.getByLabelText<HTMLInputElement>("Teléfono").value).toBe("");
  });

  it("asks only for what is missing", () => {
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone={false} askBirthDate />);

    expect(screen.queryByLabelText("Teléfono")).toBeNull();
    expect(screen.getByLabelText("Fecha de nacimiento")).toBeDefined();
  });

  it("saves both fields in one update", async () => {
    update.mockResolvedValue({ ok: true });
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Teléfono"), "099 123 456");
    await user.type(screen.getByLabelText("Fecha de nacimiento"), "1990-03-12");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ phone: "+59899123456", birthDate: "1990-03-12" });
  });

  it("asks for the birth date without calling the API", async () => {
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone={false} askBirthDate />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Ingresá tu fecha de nacimiento.")).toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("sends a client with phone but no birth date to complete-profile and back home once done", async () => {
    update.mockResolvedValue({ ok: true });
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone={false} askBirthDate />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Fecha de nacimiento"), "1990-03-12");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(update).toHaveBeenCalledWith({ birthDate: "1990-03-12" });
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("shows the profile error when the API rejects the data", async () => {
    update.mockResolvedValue({ ok: false, error: UPDATE_PROFILE_ERRORS.INVALID_PROFILE });
    renderWithSnackbar(<CompleteProfileForm homeHref="/dashboard" askPhone={false} askBirthDate />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Fecha de nacimiento"), "1990-03-12");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Revisá la fecha de nacimiento.",
    );
  });
});

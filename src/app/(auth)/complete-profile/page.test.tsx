import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/session", () => ({ requireIncompleteProfile: vi.fn() }));

import { requireIncompleteProfile } from "@/lib/session";

import { CompleteProfileContent } from "./page";

const client: AuthenticatedUser = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: USER_ROLES.CLIENT,
};

describe("CompleteProfileContent", () => {
  it("asks a user without a phone for it, then sends them to their role's area", async () => {
    const staffWithoutPhone: AuthenticatedUser = {
      id: "2",
      name: "Juan",
      lastName: "Pereira",
      email: "juan@move.uy",
      phone: null,
      birthDate: null,
      role: USER_ROLES.STAFF,
    };
    vi.mocked(requireIncompleteProfile).mockResolvedValue(staffWithoutPhone);

    renderWithSnackbar(await CompleteProfileContent());

    expect(requireIncompleteProfile).toHaveBeenCalled();
    expect(screen.getByText("Necesitamos tu teléfono para avisarte de tus reservas y tu plan.")).toBeDefined();
    expect(screen.getByLabelText("Teléfono")).toBeDefined();
    expect(screen.queryByLabelText("Fecha de nacimiento")).toBeNull();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDefined();
  });

  it("asks a client without phone nor birth date for both", async () => {
    vi.mocked(requireIncompleteProfile).mockResolvedValue({ ...client, phone: null, birthDate: null });

    renderWithSnackbar(await CompleteProfileContent());

    expect(screen.getByText("Necesitamos tu teléfono y tu fecha de nacimiento.")).toBeDefined();
    expect(screen.getByLabelText("Teléfono")).toBeDefined();
    expect(screen.getByLabelText("Fecha de nacimiento")).toBeDefined();
  });

  it("asks a client with a phone only for the birth date", async () => {
    vi.mocked(requireIncompleteProfile).mockResolvedValue({ ...client, birthDate: null });

    renderWithSnackbar(await CompleteProfileContent());

    expect(
      screen.getByText("Necesitamos tu fecha de nacimiento para saludarte en tu cumpleaños."),
    ).toBeDefined();
    expect(screen.queryByLabelText("Teléfono")).toBeNull();
  });
});

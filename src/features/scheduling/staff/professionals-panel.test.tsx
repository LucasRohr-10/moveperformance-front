import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ProfessionalsPanel } from "./professionals-panel";
import { createProfessional, listProfessionals } from "./professionals-api";

vi.mock("./professionals-api", () => ({
  listProfessionals: vi.fn(),
  createProfessional: vi.fn(),
  updateProfessional: vi.fn(),
}));

const listMock = vi.mocked(listProfessionals);
const createMock = vi.mocked(createProfessional);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfessionalsPanel", () => {
  it("lists existing professionals", async () => {
    listMock.mockResolvedValue([{ id: "1", name: "Ana", active: true }]);

    renderWithSnackbar(<ProfessionalsPanel />);

    expect(await screen.findByText("Ana")).toBeDefined();
  });

  it("creates a professional and refreshes the list", async () => {
    listMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "1", name: "Leo", active: true }]);
    createMock.mockResolvedValue({ id: "1", name: "Leo", active: true });
    const user = userEvent.setup();

    renderWithSnackbar(<ProfessionalsPanel />);
    await screen.findByRole("button", { name: "Agregar" });

    await user.type(screen.getByLabelText("Nombre"), "Leo");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(createMock).toHaveBeenCalledWith({ name: "Leo" });
    expect(await screen.findByText("Leo")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("Profesional agregado");
  });
});

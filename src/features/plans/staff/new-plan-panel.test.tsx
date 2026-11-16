import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("./plan-form", () => ({
  PlanForm: ({ onSaved, onCancel }: { onSaved: (plan: { id: string }) => void; onCancel: () => void }) => (
    <div>
      <button onClick={() => onSaved({ id: "1" })}>Simular guardado</button>
      <button onClick={onCancel}>Simular cancelar</button>
    </div>
  ),
}));

import { NewPlanPanel } from "./new-plan-panel";

describe("NewPlanPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("goes back to the list after saving", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<NewPlanPanel />);

    await user.click(screen.getByRole("button", { name: "Simular guardado" }));

    expect(push).toHaveBeenCalledWith("/staff/plans");
  });

  it("goes back to the list when cancelled", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<NewPlanPanel />);

    await user.click(screen.getByRole("button", { name: "Simular cancelar" }));

    expect(push).toHaveBeenCalledWith("/staff/plans");
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import StaffError from "./error";

describe("StaffError", () => {
  it("shows a temporary-error message and retries on click", async () => {
    const retry = vi.fn();
    renderWithSnackbar(<StaffError error={new Error("boom")} retry={retry} />);
    const user = userEvent.setup();

    expect(
      screen.getByText(
        "No pudimos verificar tu sesión. Puede ser un problema temporario del servidor.",
      ),
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});

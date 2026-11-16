import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ClientDetail } from "@/lib/api/types";

import { reactivateClient } from "./clients-api";
import { ReactivateClientDialog } from "./reactivate-client-dialog";

const showSnackbar = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/snackbar", () => ({ useSnackbar: () => ({ showSnackbar }) }));
vi.mock("./clients-api", () => ({ reactivateClient: vi.fn() }));

const reactivateMock = vi.mocked(reactivateClient);

const CLIENT: ClientDetail = {
  id: "c1",
  name: "Diego",
  lastName: "Baja",
  email: "diego@move.test",
  phone: null,
  birthDate: null,
  age: null,
  clientSince: "2026-01-10T12:00:00.000Z",
  plan: null,
  paymentStatus: null,
  bookings: [],
  deactivation: { deactivatedAt: "2026-10-20T13:00:00.000Z", deactivatedByName: null, reason: null },
};
const REACTIVATED: ClientDetail = { ...CLIENT, deactivation: null };

function renderDialog() {
  const handlers = { onReactivated: vi.fn(), onStale: vi.fn(), onClose: vi.fn() };
  render(<ReactivateClientDialog client={CLIENT} {...handlers} />);
  return handlers;
}

beforeEach(() => vi.clearAllMocks());

describe("ReactivateClientDialog", () => {
  it("explains what comes back and what does not", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "¿Reactivar a Diego Baja?" })).toBeDefined();
    expect(
      screen.getByText(
        "Va a poder entrar con su clave de siempre. Si su plan sigue en fecha lo puede usar enseguida, pero los días de baja no se devuelven. Las reservas canceladas y el débito automático no vuelven.",
      ),
    ).toBeDefined();
  });

  it("reactivates and confirms", async () => {
    reactivateMock.mockResolvedValue(REACTIVATED);
    const { onReactivated } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Reactivar" }));

    expect(reactivateMock).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(onReactivated).toHaveBeenCalledWith(REACTIVATED));
    expect(showSnackbar).toHaveBeenCalledWith({ tone: "success", title: "Cliente reactivado." });
  });

  it("reactivates once on a double click", async () => {
    reactivateMock.mockReturnValue(new Promise(() => {}));
    renderDialog();
    const user = userEvent.setup();

    await user.dblClick(screen.getByRole("button", { name: "Reactivar" }));

    expect(reactivateMock).toHaveBeenCalledTimes(1);
  });

  it("reloads the client when it was already reactivated", async () => {
    reactivateMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "CLIENT_NOT_DEACTIVATED", message: "Ya estaba activo." }),
    );
    const { onStale, onClose, onReactivated } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Reactivar" }));

    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReactivated).not.toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith({ tone: "info", title: "Ya estaba activo." });
  });

  it("shows a fallback snackbar for any other failure and keeps the dialog open", async () => {
    reactivateMock.mockRejectedValue(new Error("boom"));
    const { onClose } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Reactivar" }));

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({
        tone: "danger",
        title: "No pudimos reactivar al cliente. Probá de nuevo.",
      }),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Reactivar" }).disabled).toBe(false);
  });
});

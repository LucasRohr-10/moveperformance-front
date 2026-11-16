import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";

vi.mock("./checkins-api", () => ({ answerCheckin: vi.fn() }));

import { CheckinForm } from "./checkin-form";
import { answerCheckin } from "./checkins-api";

const answerMock = vi.mocked(answerCheckin);

const checkin = { id: "c-1", period: "2026-10", firstName: "Ana" };

const submit = () => userEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));

async function answerEverything({ pain = "No", goals = "Siguen igual" } = {}) {
  await userEvent.click(screen.getByLabelText("Bien"));
  await userEvent.click(screen.getByLabelText(pain));
  await userEvent.click(screen.getByLabelText(goals));
}

describe("CheckinForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    answerMock.mockResolvedValue({ flag: "ok" });
  });

  it("asks the three questions of the mockup", () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);

    expect(screen.getByRole("radiogroup", { name: "¿Cómo te sentís con el entrenamiento?" })).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "¿Sentiste alguna molestia o dolor?" })).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "¿Cambiaron tus objetivos?" })).toBeDefined();
    for (const label of ["Me cuesta", "Bien", "Muy bien", "No", "Sí, leve", "Siguen igual", "Quiero ajustarlos"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
  });

  it("asks for every answer before sending", async () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);

    await submit();

    expect(screen.getByText("Elegí cómo te sentís.")).toBeDefined();
    expect(screen.getByText("Contanos si sentiste alguna molestia.")).toBeDefined();
    expect(screen.getByText("Contanos si cambiaron tus objetivos.")).toBeDefined();
    expect(answerMock).not.toHaveBeenCalled();
  });

  it("points to the first question to answer", async () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);

    await submit();

    expect(screen.getAllByRole("alert").some((el) => el.textContent?.includes("Revisá 3 campos"))).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByRole("radio")[0]));
  });

  it("confirms the answers with a success snackbar", async () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything();

    await submit();

    await waitFor(() =>
      expect(screen.getAllByRole("status").some((el) => el.textContent?.includes("Respuesta enviada"))).toBe(true),
    );
  });

  it("requires the pain detail and submits the answers", async () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything({ pain: "Sí, leve" });
    expect(screen.getByLabelText("¿Dónde?").getAttribute("placeholder")).toBe("Contanos dónde (ej.: rodilla derecha)…");

    await submit();
    expect(screen.getByText("Contanos dónde sentís la molestia.")).toBeDefined();
    expect(answerMock).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("¿Dónde?"), "Rodilla derecha");
    await submit();

    expect(answerMock).toHaveBeenCalledWith("c-1", {
      feeling: "good",
      pain: "mild",
      painDetail: "Rodilla derecha",
      goals: "same",
    });
    expect((await screen.findByText("¡Gracias! El equipo de MOVE revisa tus respuestas.")).textContent).toBe("¡Gracias! El equipo de MOVE revisa tus respuestas.");
  });

  it("sends the optional goals text only when the goals change", async () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything({ goals: "Quiero ajustarlos" });

    await userEvent.type(screen.getByLabelText("¿Qué te gustaría cambiar? (opcional)"), "Más fuerza");
    await submit();

    expect(answerMock).toHaveBeenCalledWith("c-1", {
      feeling: "good",
      pain: "none",
      goals: "adjust",
      goalsDetail: "Más fuerza",
    });
  });

  it("does not ask for the goals text when the goals stay the same", async () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything();

    expect(screen.queryByLabelText("¿Qué te gustaría cambiar? (opcional)")).toBeNull();
    expect(screen.queryByLabelText("¿Dónde?")).toBeNull();
  });

  it("rejects a detail over 500 characters without calling the API", async () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything({ pain: "Sí, leve" });

    fireEvent.change(screen.getByLabelText("¿Dónde?"), { target: { value: "a".repeat(501) } });
    await submit();

    expect(screen.getByText("Usá hasta 500 caracteres.")).toBeDefined();
    expect(answerMock).not.toHaveBeenCalled();
  });

  it("keeps the button disabled once the answers were sent", async () => {
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything();

    await submit();
    await screen.findByText("¡Gracias! El equipo de MOVE revisa tus respuestas.");

    const button = screen.getByRole("button", { name: "Enviar respuesta" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await userEvent.click(button);
    expect(answerMock).toHaveBeenCalledTimes(1);
  });

  it("sends once with a double click", async () => {
    let finish: () => void = () => undefined;
    answerMock.mockReturnValue(new Promise((resolve) => (finish = () => resolve({ flag: "ok" }))));
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything();

    await userEvent.dblClick(screen.getByRole("button", { name: "Enviar respuesta" }));
    finish();

    expect(answerMock).toHaveBeenCalledTimes(1);
  });

  it("replaces the form when the check-in was already answered", async () => {
    answerMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "CHECKIN_ALREADY_ANSWERED", message: "Este check-in ya fue respondido." }),
    );
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything();

    await submit();

    expect((await screen.findByRole("alert")).textContent).toContain("Este check-in ya fue respondido.");
    expect(screen.getByText("No tenés check-ins pendientes.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Enviar respuesta" })).toBeNull();
  });

  it("shows the message of the API and lets the client try again when sending fails", async () => {
    answerMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderWithSnackbar(<CheckinForm checkin={checkin} />);
    await answerEverything();

    await submit();

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos enviar tu respuesta. Probá de nuevo.");
    expect((screen.getByRole("button", { name: "Enviar respuesta" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

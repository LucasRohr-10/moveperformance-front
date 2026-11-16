import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ClientDetail } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { createClient, findClientIdByEmail } from "./clients-api";
import { NewClientForm } from "./new-client-form";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./clients-api", () => ({ createClient: vi.fn(), findClientIdByEmail: vi.fn() }));

const createClientMock = vi.mocked(createClient);
const findClientIdByEmailMock = vi.mocked(findClientIdByEmail);

const CREATED: ClientDetail = {
  id: "c-new",
  name: "Ana",
  lastName: "Gómez",
  email: "ana@move.test",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  age: 36,
  clientSince: "2026-11-02T12:00:00.000Z",
  plan: null,
  paymentStatus: null,
  bookings: [],
  deactivation: null,
};

const apiError = (code: string, message: string, details?: ApiError["body"]["details"]) =>
  new ApiError({ statusCode: 409, code, message, details });

async function fillForm(
  overrides: Partial<Record<"name" | "lastName" | "birthDate" | "email" | "phone" | "password", string>> = {},
) {
  const values = {
    name: "Ana",
    lastName: "Gómez",
    birthDate: "1990-03-12",
    email: "ana@move.test",
    phone: "099123456",
    password: "Clave-Segura1",
    ...overrides,
  };
  const user = userEvent.setup();
  if (values.name) await user.type(screen.getByLabelText("Nombre"), values.name);
  if (values.lastName) await user.type(screen.getByLabelText("Apellido"), values.lastName);
  if (values.birthDate) await user.type(screen.getByLabelText("Fecha de nacimiento"), values.birthDate);
  if (values.email) await user.type(screen.getByLabelText("Email"), values.email);
  if (values.phone) await user.type(screen.getByLabelText("Teléfono"), values.phone);
  if (values.password) await user.type(screen.getByLabelText("Clave"), values.password);
  return user;
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Crear cliente" }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NewClientForm", () => {
  it("asks for the six fields in order", () => {
    renderWithSnackbar(<NewClientForm />);

    const labels = ["Nombre", "Apellido", "Fecha de nacimiento", "Email", "Teléfono", "Clave"];
    const fields = labels.map((label) => screen.getByLabelText(label));
    fields.slice(1).forEach((field, index) => {
      expect(fields[index].compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    expect(screen.getByText(/Se ve en claro para que la copies/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Cancelar" }).getAttribute("href")).toBe("/staff/clients");
  });

  it("shows field errors without calling the API", async () => {
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm({ name: "", birthDate: "", password: "abc" });

    await submit(user);

    expect(await screen.findByText("Ingresá el nombre.")).toBeDefined();
    expect(screen.getByText("Ingresá la fecha de nacimiento.")).toBeDefined();
    expect(screen.getByText("La clave necesita al menos 8 caracteres.")).toBeDefined();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("creates the client and opens their record", async () => {
    createClientMock.mockResolvedValue(CREATED);
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm({ name: " Ana ", email: "Ana@Move.test" });

    await submit(user);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/staff/clients/c-new"));
    expect(createClientMock).toHaveBeenCalledWith({
      name: "Ana",
      lastName: "Gómez",
      birthDate: "1990-03-12",
      email: "ana@move.test",
      phone: "+59899123456",
      password: "Clave-Segura1",
    });
    expect(screen.getByText("Cliente creado.")).toBeDefined();
  });

  it("sends one request on a double click", async () => {
    createClientMock.mockReturnValue(new Promise(() => {}));
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm();

    await user.dblClick(screen.getByRole("button", { name: "Crear cliente" }));

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Creando…" }).disabled).toBe(true);
  });

  it("shows the taken message for CLIENT_EMAIL_TAKEN", async () => {
    createClientMock.mockRejectedValue(apiError("CLIENT_EMAIL_TAKEN", "Ya hay un cliente con ese email."));
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm();

    await submit(user);

    expect((await screen.findByText("Ya hay un cliente con ese email.")).closest("[role=alert]")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Abrir su ficha →" })).toBeNull();
    expect(findClientIdByEmailMock).not.toHaveBeenCalled();
  });

  it("links to the unconfirmed client's record", async () => {
    createClientMock.mockRejectedValue(
      apiError("CLIENT_EMAIL_UNCONFIRMED", "Ya hay una cuenta con ese email que todavía no se confirmó."),
    );
    findClientIdByEmailMock.mockResolvedValue("c-pend");
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm({ email: "pendiente@move.test" });

    await submit(user);

    const link = await screen.findByRole("link", { name: "Abrir su ficha →" });
    expect(link.getAttribute("href")).toBe("/staff/clients/c-pend");
    expect(findClientIdByEmailMock).toHaveBeenCalledWith("pendiente@move.test");
    expect(screen.getByText(/todavía no se confirmó/)).toBeDefined();
  });

  it("shows the message without a link when the lookup finds no exact match", async () => {
    createClientMock.mockRejectedValue(apiError("CLIENT_EMAIL_UNCONFIRMED", "Sin confirmar."));
    findClientIdByEmailMock.mockResolvedValue(null);
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm();

    await submit(user);

    expect(await screen.findByText("Sin confirmar.")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Abrir su ficha →" })).toBeNull();
  });

  it("shows the message without a link when the lookup fails", async () => {
    createClientMock.mockRejectedValue(apiError("CLIENT_EMAIL_UNCONFIRMED", "Sin confirmar."));
    findClientIdByEmailMock.mockRejectedValue(new Error("network"));
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm();

    await submit(user);

    expect(await screen.findByText("Sin confirmar.")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Abrir su ficha →" })).toBeNull();
  });

  it("puts the API field errors under their fields", async () => {
    createClientMock.mockRejectedValue(
      apiError("VALIDATION_FAILED", "Datos inválidos.", [{ field: "phone", messages: ["Teléfono inválido para Uruguay."] }]),
    );
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm();

    await submit(user);

    expect(await screen.findByText("Teléfono inválido para Uruguay.")).toBeDefined();
    expect(screen.getByLabelText("Teléfono").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Crear cliente" }).disabled).toBe(false);
  });

  it("shows a fallback snackbar for any other failure", async () => {
    createClientMock.mockRejectedValue(new Error("boom"));
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm();

    await submit(user);

    expect(await screen.findByText("No pudimos crear el cliente. Probá de nuevo.")).toBeDefined();
    expect(push).not.toHaveBeenCalled();
  });

  it("clears the email notice when the email changes", async () => {
    createClientMock.mockRejectedValue(apiError("CLIENT_EMAIL_TAKEN", "Ya hay un cliente con ese email."));
    renderWithSnackbar(<NewClientForm />);
    const user = await fillForm();
    await submit(user);
    await screen.findByText("Ya hay un cliente con ese email.");

    await user.type(screen.getByLabelText("Email"), "x");

    expect(screen.queryByText("Ya hay un cliente con ese email.")).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementMenu } from "./announcement-menu";

const onEdit = vi.fn();
const onDelete = vi.fn();

function renderMenu(isEditing = false) {
  return render(<AnnouncementMenu isEditing={isEditing} onEdit={onEdit} onDelete={onDelete} />);
}

function trigger(): HTMLElement {
  return screen.getByRole("button", { name: "Acciones del comunicado" });
}

describe("AnnouncementMenu", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("starts closed and opens with Editar and Eliminar", async () => {
    renderMenu();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");

    await userEvent.setup().click(trigger());

    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Editar", "Eliminar"]);
  });

  it("Editar calls onEdit and closes the menu", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(trigger());

    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Eliminar calls onDelete and closes the menu", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(trigger());

    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Escape and a click outside close it", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(trigger());

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(trigger());
    await user.click(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Escape gives the focus back to the trigger", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(trigger());

    await user.keyboard("{Escape}");

    expect(document.activeElement).toBe(trigger());
  });

  it("while editing, Editar is disabled", async () => {
    renderMenu(true);

    await userEvent.setup().click(trigger());

    expect((screen.getByRole("menuitem", { name: "Editar" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

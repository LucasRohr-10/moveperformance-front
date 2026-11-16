import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { at, slot } from "./day-editor.fixtures";
import { ProfessionalPicker } from "./professional-picker";

const professionals = [
  { id: "p-ana", name: "Ana Pérez" },
  { id: "p-juan", name: "Juan Gómez" },
];
const bandSlots = [slot("r09", "09:00", "10:00", 0), slot("r10", "10:00", "11:00", 0)];

function picker(overrides: Partial<Parameters<typeof ProfessionalPicker>[0]> = {}) {
  return (
    <ProfessionalPicker
      professionals={professionals}
      busyProfessionals={[]}
      slots={bandSlots}
      value={null}
      templateProfessionalId={null}
      onChange={vi.fn()}
      {...overrides}
    />
  );
}

const option = (name: RegExp) => screen.getByRole("option", { name }) as HTMLOptionElement;

describe("ProfessionalPicker", () => {
  it("disables professionals busy at that time with \"ocupado HH:mm–HH:mm\"", () => {
    render(
      picker({
        busyProfessionals: [{ professionalId: "p-juan", startsAt: at("09:00"), endsAt: at("12:00"), slotId: "other" }],
      }),
    );

    expect(option(/Juan Gómez/).disabled).toBe(true);
    expect(option(/Juan Gómez/).textContent).toBe("Juan Gómez · ocupado 09:00–12:00");
    expect(option(/Ana Pérez/).disabled).toBe(false);
  });

  it("does not count the band's own slots as busy", () => {
    render(
      picker({
        value: "p-juan",
        busyProfessionals: [{ professionalId: "p-juan", startsAt: at("09:00"), endsAt: at("10:00"), slotId: "r09" }],
      }),
    );

    expect(option(/Juan Gómez/).disabled).toBe(false);
    expect(screen.queryByText(/ocupado/)).toBeNull();
  });

  it("ignores someone busy at another time of the day", () => {
    render(
      picker({
        busyProfessionals: [{ professionalId: "p-ana", startsAt: at("15:00"), endsAt: at("16:00"), slotId: "other" }],
      }),
    );

    expect(option(/Ana Pérez/).disabled).toBe(false);
  });

  it("offers no professional unless one is required, and marks the template's", () => {
    const { rerender } = render(picker());
    expect(screen.getByRole("option", { name: "Sin profesional" })).toBeDefined();

    rerender(picker({ templateProfessionalId: "p-ana", required: true }));
    expect(screen.queryByRole("option", { name: /Sin profesional/ })).toBeNull();
    expect(option(/Ana Pérez/).textContent).toBe("Ana Pérez · como en la plantilla");
  });

  it("reports the chosen professional, and none as null", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(picker({ onChange }));

    await user.selectOptions(screen.getByRole("combobox"), "p-ana");
    expect(onChange).toHaveBeenLastCalledWith("p-ana");

    await user.selectOptions(screen.getByRole("combobox"), "");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

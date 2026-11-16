import { describe, expect, it } from "vitest";

import { autoDismisses, MAX_SNACKBARS, pushSnackbar, removeSnackbar, type SnackbarEntry } from "./snackbar-stack";

function entry(id: string, title = id, tone: SnackbarEntry["tone"] = "success"): SnackbarEntry {
  return { id, tone, title };
}

describe("pushSnackbar", () => {
  it("puts the new snackbar first", () => {
    expect(pushSnackbar([entry("a")], entry("b")).map((e) => e.id)).toEqual(["b", "a"]);
  });

  it(`keeps at most ${MAX_SNACKBARS}`, () => {
    const ids = Array.from({ length: MAX_SNACKBARS }, (_, index) => `s${index}`);
    const stack = ids.map((id) => entry(id));

    const next = pushSnackbar(stack, entry("new"));

    expect(next.map((e) => e.id)).toEqual(["new", ...ids.slice(0, MAX_SNACKBARS - 1)]);
  });

  it("replaces a visible snackbar with the same tone and title", () => {
    const stack = [entry("a", "X", "danger"), entry("b")];

    expect(pushSnackbar(stack, entry("c", "X", "danger")).map((e) => e.id)).toEqual(["c", "b"]);
  });

  it("keeps a snackbar with the same title but another message", () => {
    const stack: SnackbarEntry[] = [{ id: "a", tone: "danger", title: "No se pudo guardar", message: "Ana Gomez" }];

    const next = pushSnackbar(stack, { id: "b", tone: "danger", title: "No se pudo guardar", message: "Juan Pérez" });

    expect(next.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("keeps a snackbar with the same title but other groups of items", () => {
    const stack: SnackbarEntry[] = [
      { id: "a", tone: "danger", title: "2 turnos no se pudieron reservar", groups: [{ items: ["Lun 26 · 09:00"], note: "Completo." }] },
    ];

    const next = pushSnackbar(stack, {
      id: "b",
      tone: "danger",
      title: "2 turnos no se pudieron reservar",
      groups: [{ items: ["Mar 27 · 10:00"], note: "Ya reservado." }],
    });

    expect(next.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("keeps a snackbar with the same title but another tone", () => {
    const stack = [entry("a", "X", "danger")];

    expect(pushSnackbar(stack, entry("b", "X", "success")).map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("removeSnackbar", () => {
  it("removes by id", () => {
    expect(removeSnackbar([entry("a"), entry("b")], "a").map((e) => e.id)).toEqual(["b"]);
  });
});

describe("autoDismisses", () => {
  it("closes by itself a plain snackbar", () => {
    expect(autoDismisses({ tone: "success", title: "Ok" })).toBe(true);
  });

  it("closes by itself when it has an action", () => {
    expect(autoDismisses({ tone: "danger", title: "Ups", action: { label: "Ver", href: "/x" } })).toBe(true);
  });

  it("stays when it has groups of items", () => {
    expect(autoDismisses({ tone: "danger", title: "Ups", groups: [{ items: ["x"] }] })).toBe(false);
  });

  it("stays when it is marked persistent", () => {
    expect(autoDismisses({ tone: "warning", title: "Revisá 2 días", message: "Texto largo.", persistent: true })).toBe(false);
  });

  it("stays when it has a list", () => {
    expect(autoDismisses({ tone: "danger", title: "Ups", items: ["x"] })).toBe(false);
  });

  it("closes by itself with an empty list", () => {
    expect(autoDismisses({ tone: "danger", title: "Ups", items: [] })).toBe(true);
  });
});

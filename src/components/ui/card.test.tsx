import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { Card } from "./card";

function classOf(markup: ReactElement): string {
  const { container } = render(markup);
  return (container.firstElementChild as HTMLElement).className;
}

describe("Card", () => {
  it("keeps p-7 as the default padding", () => {
    expect(classOf(<Card>Contenido</Card>)).toContain("p-7");
  });

  it("offers a denser padding for list cards", () => {
    const className = classOf(<Card padding="sm">Contenido</Card>);

    expect(className).toContain("p-5");
    expect(className).not.toContain("p-7");
  });

  it("drops the padding so a table can own the surface", () => {
    const className = classOf(<Card padding="none">Contenido</Card>);

    expect(className).toContain("border-line");
    expect(className).toContain("bg-card");
    expect(className).not.toMatch(/\bp-\d/);
  });
});

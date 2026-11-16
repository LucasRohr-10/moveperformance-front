import { act } from "@testing-library/react";
import { createRoot } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useIsHydrated } from "./use-is-hydrated";

function Probe() {
  return <p>{useIsHydrated() ? "hydrated" : "not hydrated"}</p>;
}

describe("useIsHydrated", () => {
  it("is false in the HTML the server sends", () => {
    expect(renderToString(<Probe />)).toContain("not hydrated");
  });

  it("turns true once React has taken over that HTML", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Probe />);
    expect(container.textContent).toBe("not hydrated");

    await act(async () => {
      hydrateRoot(container, <Probe />);
    });

    expect(container.textContent).toBe("hydrated");
  });

  it("is already true when the component is first drawn in the browser", async () => {
    const container = document.createElement("div");

    await act(async () => {
      createRoot(container).render(<Probe />);
    });

    expect(container.textContent).toBe("hydrated");
  });
});

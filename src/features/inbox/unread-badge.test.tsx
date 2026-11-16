import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UnreadBadge } from "./unread-badge";

describe("UnreadBadge", () => {
  it("renders nothing at 0", () => {
    const { container } = render(<UnreadBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 3", () => {
    const { container } = render(<UnreadBadge count={3} />);
    expect(container.textContent).toBe("3");
  });

  it("renders 9+ at 12", () => {
    const { container } = render(<UnreadBadge count={12} />);
    expect(container.textContent).toBe("9+");
  });

  it("is red with black text and hidden from screen readers", () => {
    const { container } = render(<UnreadBadge count={3} />);
    const badge = container.firstElementChild;
    expect(badge?.getAttribute("aria-hidden")).toBe("true");
    expect(badge?.className).toContain("bg-danger");
    expect(badge?.className).toContain("text-black");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GradientAvatar } from "./gradient-avatar";

describe("GradientAvatar", () => {
  it("renders the initials as its accessible label and visible text", () => {
    render(<GradientAvatar initials="AP" size={32} />);

    const avatar = screen.getByRole("img", { name: "AP" });
    expect(avatar.textContent).toBe("AP");
  });

  it("sizes the 44px variant larger than the 32px variant", () => {
    const { container: small } = render(<GradientAvatar initials="AP" size={32} />);
    const { container: large } = render(<GradientAvatar initials="AP" size={44} />);

    expect(small.firstElementChild?.className).toContain("h-8");
    expect(large.firstElementChild?.className).toContain("h-11");
  });
});

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRehabKinds } from "./use-rehab-kinds";

describe("useRehabKinds", () => {
  it("defaults Rehab to evaluation and remembers the chosen kind per slot", () => {
    const { result } = renderHook(() => useRehabKinds());
    expect(result.current.kindOf("a")).toBe("evaluation");

    act(() => result.current.setKind("a", "followup"));

    expect(result.current.kindOf("a")).toBe("followup");
    expect(result.current.kindOf("b")).toBe("evaluation");

    act(() => result.current.setKind("b", "followup"));
    act(() => result.current.setKind("a", "evaluation"));

    expect(result.current.kindOf("a")).toBe("evaluation");
    expect(result.current.kindOf("b")).toBe("followup");
  });
});

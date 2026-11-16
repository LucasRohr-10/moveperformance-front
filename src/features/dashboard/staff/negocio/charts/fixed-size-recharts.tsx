import { cloneElement, type ReactElement } from "react";
import { vi } from "vitest";

const WIDTH = 600;
const HEIGHT = 300;

/**
 * For `vi.mock("recharts", ...)` in the chart tests. jsdom has no layout, so the real `ResponsiveContainer` measures
 * 0×0 and draws nothing. This one hands its chart a fixed size, so the SVG is drawn and the tests can look at it.
 */
export async function fixedSizeRecharts() {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) => (
      <div style={{ width: WIDTH, height: HEIGHT }}>{cloneElement(children, { width: WIDTH, height: HEIGHT })}</div>
    ),
  };
}

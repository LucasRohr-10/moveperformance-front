import type { CSSProperties } from "react";

import type { OccupancyLevel } from "./slots";

// The booking grids show only two states for now: a slot you can book or one
// you can't. `occupancyLevel` still computes medium and high; they're just not drawn.
export const OCCUPANCY_LEGEND: { level: OccupancyLevel; label: string }[] = [
  { level: "low", label: "Con lugar" },
  { level: "full", label: "Completo" },
];

const STRIPES = "repeating-linear-gradient(135deg, transparent 0 4px, rgba(255,255,255,0.09) 4px 8px)";

// Cells carry no occupancy text, so the border alone has to stand out from the
// #121212 card: #6b6b6b clears the 3:1 contrast that interface parts need.
export const AVAILABLE_CELL_CLASS = "border-[1.5px] border-[#6b6b6b] bg-[#262626] hover:border-white";
export const UNAVAILABLE_CELL_CLASS = "border-[1.5px] border-[#333333] bg-[#141414]";

export function occupancyStyle(level: OccupancyLevel): CSSProperties | undefined {
  return level === "full" ? { backgroundImage: STRIPES } : undefined;
}

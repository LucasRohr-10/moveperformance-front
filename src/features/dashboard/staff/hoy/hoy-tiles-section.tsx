import { unstable_rethrow } from "next/navigation";

import type { TodaySummaryDto } from "@/lib/api/types";

import { getTodaySummary } from "./get-today-summary";
import { HoySectionError } from "./hoy-section-error";
import { HoyTile } from "./hoy-tile";
import { HOY_TILES } from "./hoy-tiles";

// A failing API stays inside the section: the header, the view switch and the other parts of Hoy keep working.
// Next's own control-flow errors (redirect, prerender bail-outs) are rethrown untouched.
async function loadSummary(): Promise<TodaySummaryDto | null> {
  try {
    return await getTodaySummary();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function HoyTilesSection() {
  const summary = await loadSummary();
  if (!summary) return <HoySectionError title="No pudimos cargar el resumen de hoy" />;

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:gap-4">
      {HOY_TILES.map((def) => (
        <HoyTile key={def.key} def={def} summary={summary} />
      ))}
    </div>
  );
}

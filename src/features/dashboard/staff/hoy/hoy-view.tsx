import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { BirthdayTodayCard } from "./birthday-today-card";
import { HoyTilesSection } from "./hoy-tiles-section";
import { ToCollectTodaySection } from "./to-collect-today-section";

function TilesSkeleton() {
  // The one live region of the view: it announces the loading once, not once per part.
  return (
    <div role="status" className="grid grid-cols-2 gap-2.5 lg:gap-4">
      <span className="sr-only">Cargando lo de hoy…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-[108px] bg-card" />
      ))}
    </div>
  );
}

/**
 * Hoy: the birthday card, the five tiles and "Cobrar hoy", each in its own `Suspense`: a slow or failing
 * part never holds the others back.
 *
 * Desktop is two columns (birthday and tiles on the left, Cobrar hoy on the right). On a phone the left
 * column is `display: contents`, so its parts join the grid and `order` puts Cobrar hoy before the tiles.
 */
export function HoyView() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="contents lg:grid lg:min-w-0 lg:gap-4">
        {/* Empty when nobody has a birthday: `empty:hidden` keeps it from leaving a gap. */}
        <div className="order-1 empty:hidden lg:order-none">
          <Suspense fallback={<Skeleton className="h-16 bg-card" />}>
            <BirthdayTodayCard />
          </Suspense>
        </div>
        <div className="order-3 lg:order-none">
          <Suspense fallback={<TilesSkeleton />}>
            <HoyTilesSection />
          </Suspense>
        </div>
      </div>
      <div className="order-2 min-w-0 lg:order-none">
        <Suspense fallback={<Skeleton className="h-52 bg-card" />}>
          <ToCollectTodaySection />
        </Suspense>
      </div>
    </div>
  );
}

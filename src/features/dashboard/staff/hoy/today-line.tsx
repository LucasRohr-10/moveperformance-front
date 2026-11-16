import { unstable_rethrow } from "next/navigation";

import type { TodaySummaryDto } from "@/lib/api/types";

import { getTodaySummary } from "./get-today-summary";

async function loadSummary(): Promise<TodaySummaryDto | null> {
  try {
    return await getTodaySummary();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/** "Hoy hay 14 reservas en 6 turnos." Without the summary it is left out: the tiles already show the alert. */
export async function TodayLine() {
  const summary = await loadSummary();
  if (!summary) return null;

  const { bookings, slots } = summary.bookingsToday;
  if (bookings === 0) return <p className="text-[15px] text-[#bdbdbd]">Hoy no hay reservas.</p>;

  return (
    <p className="text-[15px] text-[#bdbdbd]">
      Hoy hay <b className="font-bold">{bookings === 1 ? "1 reserva" : `${bookings} reservas`}</b> en{" "}
      {slots === 1 ? "1 turno" : `${slots} turnos`}.
    </p>
  );
}

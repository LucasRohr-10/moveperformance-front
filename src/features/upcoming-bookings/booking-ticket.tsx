import type { UpcomingBookingRow } from "./present-upcoming-bookings";

/** What the cancel confirmation shows: the same date block as the rows, then the service and the time. */
export function BookingTicket({ row }: { row: UpcomingBookingRow }) {
  const { day } = row;

  return (
    <div className="mt-5 grid grid-cols-[72px_1fr] rounded border border-line bg-raised">
      <div className="flex flex-col items-center justify-center border-r border-dashed border-line-strong py-3.5 text-center">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-muted">{day.dow}</span>
        <span className="font-display text-3xl font-extrabold leading-tight">{day.dayNumber}</span>
        <span className="text-[9px] font-semibold tracking-[0.2em] text-muted">{day.month}</span>
      </div>
      <div className="flex flex-col justify-center px-4 py-3.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">{row.serviceLabel}</span>
        <span className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold leading-none">{row.time}</span>
          <span className="text-sm text-muted">{row.durationMinutes} min</span>
        </span>
      </div>
    </div>
  );
}

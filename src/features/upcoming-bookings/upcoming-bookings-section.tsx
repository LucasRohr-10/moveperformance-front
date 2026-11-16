import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/config/constants/routes.constants";
import { todayBusinessDate } from "@/features/bookings/slots";
import type { BookingResponse } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { getMyUpcomingBookings } from "./get-my-upcoming-bookings";
import { UpcomingBookingsCard } from "./upcoming-bookings-card";

// A failing API stays inside this card: the page keeps its greeting and the rest of the profile.
// Next's own control-flow errors (redirect, prerender bail-outs) are rethrown untouched.
async function loadBookings(): Promise<BookingResponse[] | null> {
  try {
    return await getMyUpcomingBookings();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function UpcomingBookingsSection() {
  const bookings = await loadBookings();
  if (!bookings) return <UpcomingBookingsErrorCard />;
  return <UpcomingBookingsCard bookings={bookings} today={todayBusinessDate()} />;
}

export function UpcomingBookingsSkeleton() {
  return (
    <Card aria-busy="true" className="mt-10 max-w-[796px]">
      <p className="text-sm text-muted">Cargando tus reservas…</p>
    </Card>
  );
}

function UpcomingBookingsErrorCard() {
  return (
    <Card role="alert" className="mt-10 max-w-[796px]">
      <p className="text-sm font-medium">No pudimos cargar tus reservas.</p>
      <p className="mt-1 text-xs text-muted">Probá de nuevo en unos minutos.</p>
      <Link
        href={ROUTES.DASHBOARD}
        className={cn(buttonVariants({ variant: "secondary", size: "sm", touchTarget: true }), "mt-4")}
      >
        Reintentar
      </Link>
    </Card>
  );
}

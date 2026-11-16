import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Heading } from "@/components/ui/heading";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { BookingCheckout, pickerServiceFor } from "@/features/checkout/booking-checkout";
import { CheckoutSkeleton } from "@/features/checkout/checkout-message-card";
import { bookingsHref } from "@/features/checkout/checkout-routes";
import { firstParam } from "@/features/checkout/first-param";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pagar reserva · MOVE",
  robots: { index: false },
};

type SearchParams = Promise<{ service?: string | string[]; date?: string | string[]; slot?: string | string[] }>;

export default async function BookingCheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const service = firstParam(params.service);
  const date = firstParam(params.date);
  const slotId = firstParam(params.slot);

  return (
    <div className="mx-auto max-w-[920px] px-6 pt-12 pb-20">
      <Link
        href={bookingsHref(pickerServiceFor(service))}
        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-white"
      >
        ← Volver a turnos
      </Link>
      <Heading as="h1" size="lg" className="mt-5">
        Confirmá tu reserva.
      </Heading>
      <div className="mt-10">
        <Suspense fallback={<CheckoutSkeleton />}>
          <BookingCheckoutContent service={service} date={date} slotId={slotId} />
        </Suspense>
      </div>
    </div>
  );
}

export async function BookingCheckoutContent({
  service,
  date,
  slotId,
}: {
  service: string | undefined;
  date: string | undefined;
  slotId: string | undefined;
}) {
  await requireRole(USER_ROLES.CLIENT);

  return <BookingCheckout service={service} date={date} slotId={slotId} />;
}

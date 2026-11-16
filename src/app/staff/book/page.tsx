import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { type OfflinePrices, toOfflinePrices } from "@/features/bookings/staff/offline-price";
import { StaffBookingPanel } from "@/features/bookings/staff/staff-booking-panel";
import { getSettings } from "@/features/settings/get-settings";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<{ clientId?: string }>;

const DESCRIPTION = "Reservale a un cliente cualquier servicio. Lo que no cubre su plan se cobra por fuera.";

/** Without the prices Staff can still book: the pop-up says so and the backend prices the charge. */
async function readPrices(): Promise<OfflinePrices> {
  try {
    return toOfflinePrices(await getSettings());
  } catch {
    return toOfflinePrices(null);
  }
}

export default function StaffBookPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Reservar" />}>
        <StaffBookContent searchParams={searchParams} />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffBookContent({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(USER_ROLES.STAFF);
  const { clientId } = await searchParams;
  const prices = await readPrices();

  return (
    <>
      <StaffPageHeader title="Reservar" description={DESCRIPTION} />
      <StaffBookingPanel initialClientId={clientId || null} prices={prices} />
    </>
  );
}

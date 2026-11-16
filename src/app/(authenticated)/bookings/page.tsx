import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { ComingSoonSkeleton } from "@/components/ui/coming-soon-section";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { BookingGrid } from "@/features/bookings/booking-grid";
import { parseServiceType } from "@/features/bookings/types";
import { getMySubscriptions } from "@/features/subscriptions";
import type { MySubscriptionsDto } from "@/lib/api/types";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<{ service?: string }>;

export default function BookingsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <Suspense fallback={<ComingSoonSkeleton title="Reservar" />}>
        <BookingsContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

export async function BookingsContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole(USER_ROLES.CLIENT);
  const { service } = await searchParams;

  return (
    <BookingGrid
      initialService={parseServiceType(service)}
      subscriptions={await loadSubscriptions()}
      userId={user.id}
    />
  );
}

// Without subscriptions the grid still works; it just can't offer the weekly repeat.
async function loadSubscriptions(): Promise<MySubscriptionsDto | null> {
  try {
    return await getMySubscriptions();
  } catch {
    return null;
  }
}

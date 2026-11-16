import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
// By path: the checkins index must stay free of server-only code (next/headers).
import { PendingCheckinSection } from "@/features/checkins/pending-checkin-section";
import { BookCard } from "@/features/dashboard/book-card";
import { MonthStatsCard, MonthStatsSkeleton } from "@/features/dashboard/month-stats-card";
import { MySubscriptionsSection, MySubscriptionsSkeleton } from "@/features/subscriptions";
import { UpcomingBookingsSection, UpcomingBookingsSkeleton } from "@/features/upcoming-bookings";
import { requireRole } from "@/lib/session";

export default function DashboardPage() {
  return (
    <PageContainer>
      <SectionLabel>Mi perfil</SectionLabel>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </PageContainer>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <Heading as="h1" size="lg" className="mt-3">
        Mi perfil
      </Heading>
      <MySubscriptionsSkeleton />
    </>
  );
}

export async function DashboardContent() {
  const user = await requireRole(USER_ROLES.CLIENT);

  return (
    <>
      <Heading as="h1" size="lg" className="mt-3">
        Hola, {user.name}.
      </Heading>
      <div className="lg:grid lg:grid-cols-[minmax(0,796px)_minmax(0,1fr)] lg:gap-6">
        <div>
          <Suspense fallback={null}>
            <PendingCheckinSection />
          </Suspense>
          <Suspense fallback={<UpcomingBookingsSkeleton />}>
            <UpcomingBookingsSection />
          </Suspense>
          <Suspense fallback={<MySubscriptionsSkeleton />}>
            <MySubscriptionsSection />
          </Suspense>
        </div>
        <aside className="mt-10 space-y-6">
          <Suspense fallback={<MonthStatsSkeleton />}>
            <MonthStatsCard />
          </Suspense>
          <BookCard />
        </aside>
      </div>
    </>
  );
}

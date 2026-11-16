import type { AnnouncementDto } from "@/lib/api/types";

import { formatMonthHeading } from "./announcement-dates";

export interface ExpiredMonthGroup {
  heading: string;
  items: AnnouncementDto[];
}

// The API hands the expired ones newest first; the months come out newest first too, and the items keep their order.
export function groupExpiredByMonth(items: AnnouncementDto[]): ExpiredMonthGroup[] {
  const byMonth = new Map<string, AnnouncementDto[]>();
  for (const item of items) {
    const monthKey = item.visibleUntil.slice(0, 7);
    byMonth.set(monthKey, [...(byMonth.get(monthKey) ?? []), item]);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, group]) => ({
      heading: formatMonthHeading(monthKey),
      items: group,
    }));
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { todayBusinessDate } from "@/features/bookings/slots";
import type { DailySlot } from "@/lib/api/types";

import { listDailySlots } from "./attendance-api";
import { DailySlotsDesktop } from "./daily-slots-desktop";
import { DailySlotsMobile } from "./daily-slots-mobile";
import { buildScheduleRows, type LoadStatus, type ServiceFilter } from "./schedule-model";

const CLOCK_TICK_MS = 60_000;

/**
 * Owns the day's data, the selected date and the service filter, and hands them to two independent
 * presentational components: the desktop and mobile designs aren't the same layout reflowed (a
 * grid of hours by service vs. a card per slot), so each gets its own component instead of one tree
 * fighting two breakpoints. Same split as the staff dashboard.
 */
export function DailySlotsPanel({ initialDate }: { initialDate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<DailySlot[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [filter, setFilter] = useState<ServiceFilter>("all");
  // Bumped to retry the same date: setting `date` to its current value would
  // not re-run the effect.
  const [reloadToken, setReloadToken] = useState(0);
  // Which row is "Ahora" and which are already past moves with the clock.
  const [now, setNow] = useState(() => Date.now());

  function showDay(newDate: string) {
    setStatus("loading");
    setDate(newDate);
    // Reflect the date change in the URL.
    const params = new URLSearchParams();
    params.set("date", newDate);
    router.push(`${pathname}?${params.toString()}`);
  }

  function retry() {
    setStatus("loading");
    setReloadToken((token) => token + 1);
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    listDailySlots(date)
      .then((loaded) => {
        if (!isCurrent) return;
        setSlots(loaded);
        setStatus("ready");
      })
      .catch(() => {
        if (isCurrent) setStatus("error");
      });
    return () => {
      isCurrent = false;
    };
  }, [date, reloadToken]);

  const viewProps = {
    date,
    onChangeDate: showDay,
    filter,
    onChangeFilter: setFilter,
    rows: buildScheduleRows(slots, filter, date === todayBusinessDate() ? now : null),
    status,
    onRetry: retry,
  };

  return (
    <>
      <DailySlotsDesktop {...viewProps} />
      <DailySlotsMobile {...viewProps} />
    </>
  );
}

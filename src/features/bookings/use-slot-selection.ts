"use client";

import { useEffect, useState } from "react";

import type { BookableSlot, BookingWindowDto, ServiceType } from "@/lib/api/types";

import { getBookingWindow } from "./get-booking-window";

import {
  addDaysToDate,
  buildDesktopRows,
  daysBetween,
  groupByDaypart,
  mondayOf,
  slotLabel,
  summarizeDay,
  todayBusinessDate,
} from "./slots";
import type { DaySummary, SlotGroup, SlotRow } from "./slots";

const WEEK_LENGTH = 7;
const MAX_WEEK = 3;

export interface UseSlotSelectionOptions {
  fetchSlots: (service: ServiceType, date: string) => Promise<BookableSlot[]>;
  fetchWindow?: () => Promise<BookingWindowDto>;
  labelFor?: (slot: BookableSlot) => string;
  // The coverage hint of each cell; the client's wording unless the surface says otherwise.
  hintFor?: (slot: BookableSlot) => string | null;
  // Fires on every selection-affecting action (service/week/day/slot change) —
  // consumers reset whatever downstream state depends on "what's picked".
  onChange?: () => void;
}

export interface SlotSelection {
  service: ServiceType;
  setService: (service: ServiceType) => void;
  week: number;
  atFirstWeek: boolean;
  atLastWeek: boolean;
  prevWeek: () => void;
  nextWeek: () => void;
  goToday: () => void;
  isToday: boolean;
  weekLabel: string;
  dayIndex: number;
  selectDay: (index: number) => void;
  days: DaySummary[];
  daySlots: BookableSlot[];
  weekSlots: BookableSlot[][];
  groups: SlotGroup[];
  rows: SlotRow[];
  selectedSlotId: string | null;
  selectSlot: (dayIndex: number, slotId: string) => void;
  // Jumps straight to the week and day of an arbitrary business date, clamped to the
  // bookable window — used to restore a pick made before an external redirect (buying a
  // plan) without making the user step through the weeks one by one. An optional slotId is
  // set right away (same as selectSlot would), so `selectedSlot` resolves reactively once
  // that week's real data arrives, with no need to wait and look it up by hand.
  goToDate: (date: string, slotId?: string | null) => void;
  clearSlot: () => void;
  selectedSlot: BookableSlot | null;
  lastBookableDate: string | null;
  // Every slot of a service between two business dates (inclusive), for the booking cart.
  fetchRange: (service: ServiceType, from: string, to: string) => Promise<BookableSlot[]>;
  loading: boolean;
  // True only while a fetch for the CURRENT service/week is in flight — unlike `loading`
  // (which only reflects "no data at all yet"), this also covers navigating to a different
  // week/service, where stale data stays on screen with no full-page loading flash.
  refreshing: boolean;
  // Whether `weekSlots` is the data of the service/week on screen right now. False before
  // the first load, and in the gap after a week/service change where the previous week's
  // slots are still the ones in hand. Anything that judges "is this slot still there?"
  // must wait for this, or it reads an empty/stale week as "everything is gone".
  isShowingLoadedWeek: boolean;
  error: boolean;
  // Re-fetches the current week without changing the selection — e.g. after a
  // booking attempt fails because another visitor just took the slot.
  refresh: () => void;
}

export function useSlotSelection(
  initialService: ServiceType,
  { fetchSlots, fetchWindow = getBookingWindow, labelFor = slotLabel, hintFor, onChange }: UseSlotSelectionOptions,
): SlotSelection {
  const [service, setServiceState] = useState<ServiceType>(initialService);
  const [week, setWeek] = useState(0);
  const [lastBookableDate, setLastBookableDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [weekSlots, setWeekSlots] = useState<BookableSlot[][] | null>(null);
  // Which service/week `weekSlots` actually holds, as opposed to the one being rendered.
  const [loadedFor, setLoadedFor] = useState<{ service: ServiceType; week: number } | null>(null);
  const [error, setError] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(true);
  const fetchKey = `${service}|${week}|${refreshToken}`;
  const [requestedKey, setRequestedKey] = useState(fetchKey);
  // A new service/week/refresh starts loading the instant it's requested, computed during
  // render (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  if (requestedKey !== fetchKey) {
    setRequestedKey(fetchKey);
    setRefreshing(true);
  }

  const today = todayBusinessDate();
  const firstMonday = mondayOf(today);
  const todayIndex = daysBetween(firstMonday, today);
  const [dayIndex, setDayIndex] = useState(todayIndex);
  const weekDates = Array.from({ length: WEEK_LENGTH }, (_, i) => addDaysToDate(firstMonday, week * WEEK_LENGTH + i));
  const lastWeek = lastBookableDate
    ? Math.floor(daysBetween(firstMonday, lastBookableDate) / WEEK_LENGTH)
    : MAX_WEEK;

  useEffect(() => {
    let cancelled = false;
    fetchWindow()
      .then((window) => {
        if (!cancelled) setLastBookableDate(window.lastBookableDate);
      })
      .catch(() => {
        // Without the window the default last week applies.
      });
    return () => {
      cancelled = true;
    };
    // The window is read once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(weekDates.map((date) => fetchSlots(service, date)))
      .then((result) => {
        if (cancelled) return;
        setWeekSlots(result);
        setLoadedFor({ service, week });
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
    // weekDates is recomputed from service/week/today every render; today is stable within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, week, refreshToken]);

  function setService(next: ServiceType) {
    setServiceState(next);
    setDayIndex(week === 0 ? todayIndex : 0);
    setSlotId(null);
    onChange?.();
  }

  function setBoundedWeek(next: number) {
    const bounded = Math.max(0, Math.min(lastWeek, next));
    setWeek(bounded);
    setDayIndex(bounded === 0 ? todayIndex : 0);
    setSlotId(null);
    onChange?.();
  }

  function selectDay(index: number) {
    setDayIndex(index);
    setSlotId(null);
    onChange?.();
  }

  function goToday() {
    setWeek(0);
    setDayIndex(todayIndex);
    setSlotId(null);
    onChange?.();
  }

  function selectSlot(index: number, id: string) {
    setDayIndex(index);
    setSlotId(id);
    onChange?.();
  }

  function goToDate(date: string, targetSlotId: string | null = null) {
    const offset = daysBetween(firstMonday, date);
    const targetWeek = Math.max(0, Math.min(lastWeek, Math.floor(offset / WEEK_LENGTH)));
    setWeek(targetWeek);
    setDayIndex(Math.max(0, Math.min(WEEK_LENGTH - 1, offset - targetWeek * WEEK_LENGTH)));
    setSlotId(targetSlotId);
    onChange?.();
  }

  function clearSlot() {
    setSlotId(null);
  }

  async function fetchRange(rangeService: ServiceType, from: string, to: string): Promise<BookableSlot[]> {
    const dates = Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDaysToDate(from, i));
    const perDay = await Promise.all(dates.map((date) => fetchSlots(rangeService, date)));
    return perDay.flat();
  }

  const loadedWeekSlots = weekSlots ?? weekDates.map(() => []);
  const days = weekDates.map((date, i) => summarizeDay(date, today, loadedWeekSlots[i]));
  const daySlots = loadedWeekSlots[dayIndex];
  const selectedSlot = slotId ? (daySlots.find((s) => s.id === slotId) ?? null) : null;
  const weekLabel =
    days[0].month === days[6].month
      ? `${days[0].dayNumber} – ${days[6].dayNumber} ${days[0].month}`
      : `${days[0].dayNumber} ${days[0].month} – ${days[6].dayNumber} ${days[6].month}`;

  return {
    service,
    setService,
    week,
    atFirstWeek: week === 0,
    atLastWeek: week >= lastWeek,
    prevWeek: () => setBoundedWeek(week - 1),
    nextWeek: () => setBoundedWeek(week + 1),
    goToday,
    isToday: week === 0 && dayIndex === todayIndex,
    weekLabel,
    dayIndex,
    selectDay,
    days,
    daySlots,
    weekSlots: loadedWeekSlots,
    groups: groupByDaypart(daySlots),
    rows: buildDesktopRows(loadedWeekSlots, labelFor, hintFor),
    selectedSlotId: slotId,
    selectSlot,
    goToDate,
    clearSlot,
    selectedSlot,
    lastBookableDate,
    fetchRange,
    loading: weekSlots === null,
    refreshing,
    isShowingLoadedWeek: !refreshing && loadedFor !== null && loadedFor.service === service && loadedFor.week === week,
    error,
    refresh: () => setRefreshToken((n) => n + 1),
  };
}

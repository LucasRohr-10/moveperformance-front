import { daysBetween, isoWeekday, mondayOf } from "@/features/bookings/slots";

import { businessDateFromToday } from "./offline-charges-fixtures";

const DAYS_PER_WEEK = 7;

export interface BookingDay {
  /** YYYY-MM-DD in Montevideo. */
  date: string;
  /** The day of the month, as the day chips show it ("5"). */
  number: string;
  /** 1 (Monday) to 7 (Sunday): the column of the week grid is this value plus one. */
  weekday: number;
  /** How many times "Semana siguiente" is needed to reach the day from the current week. */
  weeksAhead: number;
  /** "jueves 05/11", as the result of a booking shows it (without the time). */
  label: string;
}

// The servers render with the real clock, so a booking day is always counted from today.
export function bookingDayFromToday(offset: number): BookingDay {
  const date = businessDateFromToday(offset);
  const [, month, day] = date.split("-");
  const weekdayName = new Intl.DateTimeFormat("es-UY", { weekday: "long", timeZone: "America/Montevideo" }).format(
    new Date(`${date}T12:00:00-03:00`),
  );
  return {
    date,
    number: String(Number(day)),
    weekday: isoWeekday(date),
    weeksAhead: Math.floor(daysBetween(mondayOf(businessDateFromToday(0)), date) / DAYS_PER_WEEK),
    label: `${weekdayName} ${day}/${month}`,
  };
}

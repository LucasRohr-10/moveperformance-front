// Birth dates travel as "YYYY-MM-DD" strings and are compared as strings, never as Dates.
export const BIRTH_DATE_MIN = "1900-01-01";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LEAP_DAY = "02-29";
const DAY_BEFORE_LEAP_DAY = "02-28";

function existsInCalendar(value: string): boolean {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Plain "es", like the announcement dates; the date is read at UTC midnight so it never slips a day.
const dayMonthFormat = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", timeZone: "UTC" });

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

// A real day between 1900-01-01 and `today` (a Montevideo date), both included.
export function isValidBirthDate(value: string, today: string): boolean {
  return existsInCalendar(value) && value >= BIRTH_DATE_MIN && value <= today;
}

// Born on the 29th of February: celebrated on the 28th in common years.
export function isBirthdayOn(birthDate: string, today: string): boolean {
  const birthday = birthDate.slice(5);
  const monthDay = today.slice(5);
  if (birthday === monthDay) return true;
  return (
    birthday === LEAP_DAY &&
    monthDay === DAY_BEFORE_LEAP_DAY &&
    !isLeapYear(Number(today.slice(0, 4)))
  );
}

// "12 de marzo".
export function formatBirthday(birthDate: string): string {
  const parts = Object.fromEntries(
    dayMonthFormat.formatToParts(new Date(`${birthDate}T00:00:00Z`)).map(({ type, value }) => [type, value]),
  );
  return `${parts.day} de ${parts.month}`;
}

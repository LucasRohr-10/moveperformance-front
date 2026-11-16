// Mirrors how the backend lays slots out inside a band, so the editor can preview
// what fits before asking. The backend validates and has the final word.

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Both are "HH:mm" and the end is after the start. */
export function areHoursValid(startTime: string, endTime: string): boolean {
  return TIME.test(startTime) && TIME.test(endTime) && toMinutes(startTime) < toMinutes(endTime);
}

export function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Start times ("HH:mm") of the slots that fit between `startTime` and `endTime`. */
export function expandDayStarts(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  gapMinutes: number,
): string[] {
  const end = toMinutes(endTime);
  const starts: string[] = [];
  for (let start = toMinutes(startTime); start + durationMinutes <= end; start += durationMinutes + gapMinutes) {
    starts.push(toTime(start));
  }
  return starts;
}

/** When the last slot that fits ends; the band only closes cleanly if that is the end time itself. */
export function lastSlotEnd(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  gapMinutes: number,
): string | null {
  const starts = expandDayStarts(startTime, endTime, durationMinutes, gapMinutes);
  const last = starts.at(-1);
  return last === undefined ? null : toTime(toMinutes(last) + durationMinutes);
}

/** The band's rule, same as a template's day: the last slot ends exactly at the end time. */
export function closesExactly(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  gapMinutes: number,
): boolean {
  return lastSlotEnd(startTime, endTime, durationMinutes, gapMinutes) === endTime;
}

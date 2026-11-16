// "Already celebrated this year in this browser". Storage may be blocked (private mode,
// disabled cookies): then nothing is remembered and the celebration shows again.

const keyFor = (userId: string, year: string) => `move:birthday-shown:${userId}:${year}`;

export function hasShownBirthday(userId: string, year: string): boolean {
  try {
    return window.localStorage.getItem(keyFor(userId, year)) !== null;
  } catch {
    return false;
  }
}

export function markBirthdayShown(userId: string, year: string): void {
  try {
    window.localStorage.setItem(keyFor(userId, year), new Date().toISOString());
  } catch {
    // Not remembered; at worst the celebration shows once more.
  }
}

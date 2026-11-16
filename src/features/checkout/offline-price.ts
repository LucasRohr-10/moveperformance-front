const PERCENT_BASE = 100;
const CENTS_PER_UNIT = 100;

// The same sum the API does, in whole cents: a result of exactly half a cent never falls below it by float error.
export function discountedPrice(price: number, percent: number | null): number {
  if (percent === null) return price;

  const cents = Math.round(price * CENTS_PER_UNIT);
  return Math.round((cents * (PERCENT_BASE - percent)) / PERCENT_BASE) / CENTS_PER_UNIT;
}

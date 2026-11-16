const priceFormat = new Intl.NumberFormat("es-UY", { useGrouping: "always" });
const exactFormat = new Intl.NumberFormat("es-UY", {
  useGrouping: "always",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const exactCentsFormat = new Intl.NumberFormat("es-UY", {
  useGrouping: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(amount: number): string {
  return `$ ${priceFormat.format(Math.ceil(amount))}`;
}

/** The real amount: whole pesos as they are, cents with two decimals (never rounded up). */
export function formatExactPrice(amount: number): string {
  const format = Number.isInteger(amount) ? exactFormat : exactCentsFormat;
  return `$ ${format.format(amount)}`;
}

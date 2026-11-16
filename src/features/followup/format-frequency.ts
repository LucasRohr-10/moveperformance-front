// Sessions per week with one decimal and a comma, as the rest of the front writes in es-UY.
export function formatFrequency(perWeek: number): string {
  return String(Math.round(perWeek * 10) / 10).replace(".", ",");
}

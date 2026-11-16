/** Next hands a repeated query parameter (`?ref=a&ref=b`) over as an array; the first value wins. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

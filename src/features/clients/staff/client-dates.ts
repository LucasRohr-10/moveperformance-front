/** `dd/mm/aaaa` in Montevideo time, as everywhere in the staff client screens. */
export const formatClientDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Montevideo",
  });

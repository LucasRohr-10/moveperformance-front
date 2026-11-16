// A full page load to another site (Google). Kept in its own module so tests
// can replace it: jsdom cannot navigate away.
export function goToExternalUrl(url: string): void {
  window.location.assign(url);
}

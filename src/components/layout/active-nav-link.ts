import type { NavLink } from "./mobile-nav";

/**
 * Which link of a nav is the current one.
 *
 * The longest href that matches wins, so a section root and its children are
 * handled without special-casing either: on `/staff/clients/42`, `/staff/clients`
 * matches and `/staff` does not, because `/staff/clients` is longer.
 *
 * Shared by the sidebar and the mobile menu, which used to disagree: the
 * sidebar matched by prefix and the mobile menu by equality, so on a detail
 * route the sidebar highlighted its section while the mobile menu highlighted
 * nothing.
 */
export function activeNavHref(pathname: string, links: NavLink[]): string | null {
  const matches = links
    .map((link) => link.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));

  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/constants/routes.constants";
import type { ClientDetail } from "@/lib/api/types";

const LINK_CLASS = buttonVariants({ variant: "secondary", size: "sm", touchTarget: true });

/** Opens Reservar with this client already chosen; a deactivated client cannot be booked, so it offers nothing. */
export function BookForClientLink({ client }: { client: ClientDetail }) {
  if (client.deactivation) return null;

  return (
    <Link href={`${ROUTES.STAFF_BOOK}?clientId=${encodeURIComponent(client.id)}`} className={LINK_CLASS}>
      Reservar para este cliente
    </Link>
  );
}

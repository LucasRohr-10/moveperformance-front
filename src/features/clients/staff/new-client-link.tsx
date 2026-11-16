import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/constants/routes.constants";

const NEW_CLIENT_HREF = `${ROUTES.STAFF_CLIENTS}/new`;
const NEW_CLIENT_CLASS = buttonVariants({ variant: "primary", touchTarget: true });

export function NewClientLink() {
  return (
    <Link href={NEW_CLIENT_HREF} className={NEW_CLIENT_CLASS}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="size-4">
        <path d="M8 3v10M3 8h10" />
      </svg>
      Nuevo cliente
    </Link>
  );
}

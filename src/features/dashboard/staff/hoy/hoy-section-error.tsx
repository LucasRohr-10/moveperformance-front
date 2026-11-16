import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/config/constants/routes.constants";

/**
 * What a part of Hoy shows when its request fails. Hoy is the bare URL, so Reintentar goes there. The
 * other parts, the header and the view switch keep working.
 */
export function HoySectionError({ title }: { title: string }) {
  return (
    <Card padding="none">
      <EmptyState
        title={title}
        description="Puede ser un problema temporario del servidor."
        role="alert"
        action={
          <Link href={ROUTES.STAFF} className={buttonVariants({ variant: "secondary", touchTarget: true })}>
            Reintentar
          </Link>
        }
      />
    </Card>
  );
}

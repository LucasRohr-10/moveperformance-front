import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/config/constants/routes.constants";
import { cn } from "@/lib/cn";

// Shown instead of the pay button: buying Performance again while a debit is authorized is refused by the API.
export function AutoDebitBlock() {
  return (
    <Card>
      <p className="text-sm">Ya tenés débito automático activo para Performance.</p>
      <Link
        href={ROUTES.DASHBOARD}
        className={cn(buttonVariants({ variant: "secondary", fullWidth: true, touchTarget: true }), "mt-5")}
      >
        Gestionarlo en mi perfil
      </Link>
    </Card>
  );
}

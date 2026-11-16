import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

// No "te avisamos por email": no mail is sent for the check-in yet.
export function NoPendingCheckin({ children }: { children?: ReactNode }) {
  return (
    <Card className="mt-9 max-w-md">
      {children}
      <p className="text-sm text-muted">No tenés check-ins pendientes.</p>
    </Card>
  );
}

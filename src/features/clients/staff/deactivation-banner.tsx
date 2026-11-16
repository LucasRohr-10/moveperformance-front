import { Notice } from "@/components/ui/notice";
import type { ClientDeactivation } from "@/lib/api/types";

import { formatClientDate } from "./client-dates";

export interface DeactivationBannerProps {
  deactivation: ClientDeactivation;
}

export function DeactivationBanner({ deactivation }: DeactivationBannerProps) {
  const { deactivatedAt, deactivatedByName, reason } = deactivation;
  const author = deactivatedByName ? ` por ${deactivatedByName}` : "";
  const why = reason ? ` · ${reason}` : "";

  return <Notice tone="warning">{`Dado de baja el ${formatClientDate(deactivatedAt)}${author}${why}`}</Notice>;
}

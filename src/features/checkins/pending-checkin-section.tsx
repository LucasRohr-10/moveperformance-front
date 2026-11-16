import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/config/constants/routes.constants";
import type { PendingCheckinDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { getPendingCheckin } from "./checkins-server-api";

// A failing API must not hide the rest of the profile: with no answer there is nothing to invite to.
// Next's own control-flow errors (redirect, prerender bail-outs) are rethrown untouched.
async function loadPending(): Promise<PendingCheckinDto["checkin"]> {
  try {
    return (await getPendingCheckin()).checkin;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function PendingCheckinSection() {
  if ((await loadPending()) === null) return null;

  return (
    <Card className="mt-10 max-w-[796px]">
      <h2 className="font-display text-2xl font-extrabold uppercase">Tenés un check-in pendiente</h2>
      <p className="mt-3 text-sm text-muted">Te toma 1 minuto y nos ayuda a acompañarte mejor.</p>
      <Link
        href={ROUTES.CLIENT_CHECKIN}
        className={cn(buttonVariants({ variant: "secondary", size: "sm", touchTarget: true }), "mt-4")}
      >
        Responder check-in
      </Link>
    </Card>
  );
}

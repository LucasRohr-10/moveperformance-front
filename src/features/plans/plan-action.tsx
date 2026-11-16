import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ComingSoonButton } from "@/components/ui/coming-soon-button";

interface PlanActionProps {
  label: string;
  href: string | null;
  highlighted: boolean;
}

export function PlanAction({ label, href, highlighted }: PlanActionProps) {
  if (href === null) return <ComingSoonButton label={label} fullWidth />;

  return (
    <Link
      href={href}
      className={buttonVariants({ variant: highlighted ? "primary" : "secondary", fullWidth: true, touchTarget: true })}
    >
      {label}
    </Link>
  );
}

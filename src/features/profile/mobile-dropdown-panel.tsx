import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface MobileDropdownPanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  position: string;
  className?: string;
}

export const MobileDropdownPanel = forwardRef<HTMLDivElement, MobileDropdownPanelProps>(
  ({ position, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      tabIndex={-1}
      className={cn(
        "fixed top-[72px] z-50 rounded-2xl border border-line bg-soft shadow-[0_20px_40px_rgba(0,0,0,0.6)]",
        position,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  ),
);

MobileDropdownPanel.displayName = "MobileDropdownPanel";

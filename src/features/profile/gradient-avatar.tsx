import { cn } from "@/lib/cn";

export interface GradientAvatarProps {
  initials: string;
  size: 32 | 44;
  className?: string;
}

const AVATAR_GRADIENT = "linear-gradient(135deg, #f7b6c8, #b5c3f7, #a9e8cf)";

export function GradientAvatar({ initials, size, className }: GradientAvatarProps) {
  return (
    <div
      role="img"
      aria-label={initials}
      style={{ background: AVATAR_GRADIENT }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-black text-black",
        size === 32 ? "h-8 w-8 text-[11px]" : "h-11 w-11 text-sm",
        className,
      )}
    >
      {initials}
    </div>
  );
}

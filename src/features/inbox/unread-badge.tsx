import { BADGE_MAX } from "./inbox.constants";

// Sits on the corner of the bell, which is `relative`. The bell's label already says how many are unread.
export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      aria-hidden="true"
      className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-black ring-2 ring-bg"
    >
      {count > BADGE_MAX ? `${BADGE_MAX}+` : count}
    </span>
  );
}

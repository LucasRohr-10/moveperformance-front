import { Suspense } from "react";

import {
  type AuthenticatedUser,
  getCurrentUser,
  SessionUnavailableError,
} from "@/lib/session";

import { AvatarMenu } from "./avatar-menu";

// The account avatar for the navbars of the private areas. It reads the
// session only to draw itself: each page guards its own access.
export function AvatarSlot({
  variant = "compact",
}: {
  // "sidebar" is used in the Staff sidebar footer; see AvatarMenu.
  variant?: "compact" | "sidebar";
}) {
  return (
    <Suspense fallback={<AvatarPlaceholder variant={variant} />}>
      <AvatarSlotContent variant={variant} />
    </Suspense>
  );
}

function AvatarPlaceholder({ variant }: { variant: "compact" | "sidebar" }) {
  if (variant === "sidebar") {
    return (
      <div aria-hidden="true" className="flex w-full items-center gap-2.5 py-3.5 pr-3 pl-3.5">
        <div className="h-[34px] w-[34px] shrink-0 animate-pulse rounded-full bg-card" />
        <div className="h-8 flex-1 animate-pulse rounded bg-card" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="h-8 w-8 animate-pulse rounded-full bg-card"
    />
  );
}

export async function AvatarSlotContent({
  variant = "compact",
}: {
  variant?: "compact" | "sidebar";
} = {}) {
  let user: AuthenticatedUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // A down backend is not a reason to hide the nav or crash the layout —
    // the real gate is in each protected page (requireUser / requireRole).
    if (!(error instanceof SessionUnavailableError)) throw error;
    user = null;
  }

  if (!user) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      </div>
    );
  }

  return <AvatarMenu user={user} variant={variant} />;
}

import { Suspense, type ReactNode } from "react";

import type { UserRole } from "@/config/constants/user-roles.constants";
import {
  type AuthenticatedUser,
  getCurrentUser,
  SessionUnavailableError,
} from "@/lib/session";

export interface RoleGatedShellProps {
  role: UserRole;
  shell: (children: ReactNode) => ReactNode;
  children: ReactNode;
}

// Keeps a role-specific layout (nav labels, section names, page headings)
// from flashing for a signed-in user of the wrong role: only a neutral
// spinner is ever visible until the role is confirmed. Children still
// render (hidden) when the role doesn't match, so their own requireRole()
// keeps running and can redirect — the actual redirect lives solely in
// each page (see "Sesión validada en cada página protegida, no solo en el
// layout" in the vault); this component never redirects, it only decides
// what's visible.
export function RoleGatedShell({ role, shell, children }: RoleGatedShellProps) {
  return (
    <Suspense fallback={<VerifyingSessionShell />}>
      <RoleGatedShellContent role={role} shell={shell}>
        {children}
      </RoleGatedShellContent>
    </Suspense>
  );
}

export async function RoleGatedShellContent({
  role,
  shell,
  children,
}: RoleGatedShellProps) {
  let user: AuthenticatedUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof SessionUnavailableError)) throw error;
    user = null;
  }

  if (user?.role !== role) {
    // children still renders — hidden, never shown — so its own requireRole
    // keeps running and can redirect; only the spinner is ever visible.
    return (
      <>
        <VerifyingSessionShell />
        <div hidden>{children}</div>
      </>
    );
  }

  return <>{shell(children)}</>;
}

function VerifyingSessionShell() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-white"
      />
      <span className="sr-only">Verificando sesión…</span>
    </div>
  );
}

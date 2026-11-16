"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { SuccessBadge } from "@/components/ui/success-badge";
import { ROUTES } from "@/config/constants/routes.constants";

// The "email confirmed" screen, shown on /verify-email and, in the tab the
// user signed up from, in place of the "check your email" card. What comes
// after the heading differs, so the caller passes it as children.
export function EmailVerifiedView({
  headingAs,
  children,
}: {
  headingAs: "h1" | "h2";
  children: ReactNode;
}) {
  return (
    <>
      <SuccessBadge className="mx-auto" />
      <Heading as={headingAs} size="lg" className="mt-5 text-center">
        ¡Listo! Tu email quedó confirmado.
      </Heading>
      {children}
    </>
  );
}

export function GoToProfileButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      fullWidth
      className="mt-10"
      onClick={() => router.replace(ROUTES.DASHBOARD)}
    >
      Ir a mi perfil
    </Button>
  );
}

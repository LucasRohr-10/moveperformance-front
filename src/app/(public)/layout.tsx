import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { PublicNavActions } from "@/features/auth";

const PUBLIC_LINKS = [
  { label: "Inicio", href: ROUTES.HOME },
  { label: "Planes", href: ROUTES.PLANS_PUBLIC },
  { label: "Performance", href: ROUTES.PERFORMANCE },
  { label: "Rehab", href: ROUTES.REHAB },
  { label: "Recovery", href: ROUTES.RECOVERY },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar links={PUBLIC_LINKS} actions={<PublicNavActions />} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

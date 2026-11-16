"use client";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export interface SessionErrorFallbackProps {
  error: Error & { digest?: string };
  retry: () => void;
}

// What the private areas' error.tsx show when the session could not be
// checked (API down or unreachable): a temporary problem, not a logout.
export function SessionErrorFallback({ retry }: SessionErrorFallbackProps) {
  return (
    <PageContainer className="text-center">
      <p className="text-sm leading-relaxed text-muted">
        No pudimos verificar tu sesión. Puede ser un problema temporario del
        servidor.
      </p>
      <Button className="mt-6" onClick={() => retry()}>
        Reintentar
      </Button>
    </PageContainer>
  );
}

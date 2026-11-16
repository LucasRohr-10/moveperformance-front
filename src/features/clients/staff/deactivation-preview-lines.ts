import type { DeactivationPreview } from "@/lib/api/types";

/** One line of the deactivation summary: its text, or null when it has nothing to say for this client. */
type PreviewLineRule = (preview: DeactivationPreview) => string | null;

function bookingsLine({ upcomingBookings }: DeactivationPreview): string {
  if (upcomingBookings === 0) return "No tiene reservas futuras.";
  if (upcomingBookings === 1) return "Se cancela 1 reserva futura.";
  return `Se cancelan ${upcomingBookings} reservas futuras.`;
}

function planLine({ hasCurrentPlan }: DeactivationPreview): string {
  return hasCurrentPlan ? "El plan queda inactivo mientras esté de baja." : "No tiene un plan vigente.";
}

// The sessions are not lost by the deactivation, but a pack that ends before the client is reactivated does lose them.
function recoverySessionsLine({ recoverySessionsLeft }: DeactivationPreview): string | null {
  if (recoverySessionsLeft === 0) return null;
  if (recoverySessionsLeft === 1) {
    return "Tiene 1 sesión de Recovery que queda sin usar mientras esté de baja. Si el paquete vence antes de reactivarlo, se pierde.";
  }
  return `Tiene ${recoverySessionsLeft} sesiones de Recovery que quedan sin usar mientras esté de baja. Si algún paquete vence antes de reactivarlo, esas sesiones se pierden.`;
}

function autoDebitsLine({ autoDebits }: DeactivationPreview): string {
  if (autoDebits === 0) return "No tiene débito automático.";
  if (autoDebits === 1) return "Se cancela el débito automático.";
  return `Se cancelan ${autoDebits} débitos automáticos.`;
}

const ENTRY_LINE = "No va a poder entrar a la app ni se le va a poder reservar.";
const NO_MAIL_LINE = "No le llega ningún mail ni aviso por las reservas canceladas.";

// In the order they are shown: a new line is a new entry, nothing else changes.
const PREVIEW_LINE_RULES: PreviewLineRule[] = [
  bookingsLine,
  planLine,
  recoverySessionsLine,
  autoDebitsLine,
  () => ENTRY_LINE,
  () => NO_MAIL_LINE,
];

/** What deactivating the client would do, from the backend's real numbers; the last two lines are always true. */
export function deactivationPreviewLines(preview: DeactivationPreview): string[] {
  return PREVIEW_LINE_RULES.map((rule) => rule(preview)).filter((line): line is string => line !== null);
}
